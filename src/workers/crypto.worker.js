// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';

// --- 加密/解密共用的常量 ---
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
const PBKDF2_ITERATIONS = 36936; // 您可以根据需要在速度和安全之间调整此值
const DERIVED_KEY_SIZE_BITS = 512;  // 派生密钥的总位数 (256给AES, 256给HMAC)
const AES_KEY_SIZE_BITS = 256;
const HMAC_KEY_SIZE_BITS = 256;

// --- 辅助函数 ---
function wordArrayToBase64(wordArray) {
  return CryptoJS.enc.Base64.stringify(wordArray);
}
function base64ToWordArray(base64Str) {
  return CryptoJS.enc.Base64.parse(base64Str);
}

// --- 密钥派生函数 (使用 PBKDF2) ---
function deriveKeyWithPBKDF2(password, saltWordArray) {
  try {
    const derivedKey = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: DERIVED_KEY_SIZE_BITS / 32, // keySize is in 32-bit words
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256 // 可以选择 SHA256 或 SHA512
    });
    return derivedKey; // 返回 CryptoJS WordArray
  } catch (err) {
    console.error('PBKDF2 key derivation error:', err);
    throw new Error('Key derivation failed with PBKDF2: ' + (err.message || err));
  }
}

// --- 加密核心逻辑 ---
function performEncryption(stringifiedPayload, password) {
  try {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
    const derivedKey = deriveKeyWithPBKDF2(password, salt); // 使用 PBKDF2 派生密钥

    const aesKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, AES_KEY_SIZE_BITS / 32));
    const hmacKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(AES_KEY_SIZE_BITS / 32));
    
    const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
    const encrypted = CryptoJS.AES.encrypt(stringifiedPayload, aesKey, {
      iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
    });
    const ciphertext = encrypted.ciphertext;
    const dataToMac = iv.clone().concat(ciphertext);
    const mac = CryptoJS.HmacSHA256(dataToMac, hmacKey);
    
    return `${wordArrayToBase64(salt)}.${wordArrayToBase64(iv)}.${wordArrayToBase64(ciphertext)}.${wordArrayToBase64(mac)}`;
  } catch (error) {
    console.error("Worker encryption error:", error);
    throw new Error("Encryption failed in worker: " + (error.message || "Unknown error"));
  }
}

// --- 解密核心逻辑 ---
function performDecryption(combinedStr, password) {
  try {
    const parts = combinedStr.split('.');
    if (parts.length !== 4) throw new Error("无效的加密数据格式。");
    
    const salt = base64ToWordArray(parts[0]);
    const iv = base64ToWordArray(parts[1]);
    const ciphertext = base64ToWordArray(parts[2]);
    const storedMac = base64ToWordArray(parts[3]);

    const derivedKey = deriveKeyWithPBKDF2(password, salt); // 使用 PBKDF2 派生密钥

    const aesKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, AES_KEY_SIZE_BITS / 32));
    const hmacKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(AES_KEY_SIZE_BITS / 32));
    const dataToMac = iv.clone().concat(ciphertext);
    const calculatedMac = CryptoJS.HmacSHA256(dataToMac, hmacKey);

    if (wordArrayToBase64(calculatedMac) !== wordArrayToBase64(storedMac)) {
      throw new Error("MAC校验失败。数据可能被篡改或密码错误。");
    }

    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, aesKey, {
      iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
    });
    const decryptedPayloadJson = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedPayloadJson) throw new Error("解密后内容为空，可能是密码错误。");
    
    const payload = JSON.parse(decryptedPayloadJson);
    // 文件加密时，payload 是 {type, filename, filetype, content_base64, description, expiry}
    // 文本加密时，payload 是 {type, message, expiry}
    // Worker 应该只返回解密后的原始 JSON 字符串或其解析后的对象，而不是直接返回 payload.message
    // 为了与 cryptoService.js 的期望匹配（它期望 decrypt 返回 message 字符串），我们这里先这样处理
    // 但更通用的做法是 Worker 返回整个 payload 对象，由主线程的 cryptoService 再处理
    if (payload.type === 'file') {
        // 对于文件，主线程可能需要整个 payload 来处理下载
        // 为了简单，我们让 worker 直接返回解析后的 payload 对象
        // 然后 cryptoService.js 的 decrypt 方法需要调整以适应这一点
        // 或者，让 worker 仍然只返回 payload.message (对于文本) 或 payload (对于文件)
        // 为了保持 cryptoService.js 的 decrypt 返回值一致性（都是字符串消息或文件内容），
        // 这里我们假设对于文件，我们仍然返回一个可识别的结构，或者让主线程处理。
        // 简单起见，如果 payload 结构是 { message: "actual content string" }，则返回 message
        // 如果是文件，则返回整个 payload 对象，让主线程的 cryptoService.js 处理
        if (payload.message !== undefined) { // 假设文本秘密总是有 message 字段
            if (payload.expiry && Date.now() > payload.expiry) {
                throw new Error(`此密文已于 ${new Date(payload.expiry).toLocaleString()} 过期。`);
            }
            return payload.message; 
        } else { // 假设是文件或其他复杂结构
            // 对于文件，过期检查应该在主线程解析出 expiry 后进行
            return JSON.stringify(payload); // 返回整个 payload 的字符串形式，让主线程解析
        }

    } else if (payload.message !== undefined) { // 文本类型
        if (payload.expiry && Date.now() > payload.expiry) {
            throw new Error(`此密文已于 ${new Date(payload.expiry).toLocaleString()} 过期。`);
        }
        return payload.message;
    } else {
        throw new Error("Decrypted payload does not contain a message or expected file structure.");
    }

  } catch (error) {
    console.error("Worker decryption error:", error);
    throw new Error("Decryption failed in worker: " + (error.message || "Unknown error"));
  }
}


// --- Worker 消息监听与响应 ---
self.onmessage = async function(event) { // 改为 async 以便 performEncryption/Decryption 可以是 async
  const { id, action, data } = event.data; 

  try {
    let resultPayload; 
    if (action === 'encrypt') {
      const { stringifiedPayload, password } = data;
      // performEncryption 现在是同步的，因为它内部的 deriveKeyWithPBKDF2 是同步的
      const encryptedPayload = performEncryption(stringifiedPayload, password);
      resultPayload = { encryptedPayload };
    } else if (action === 'decrypt') {
      const { combinedStr, password } = data;
      // performDecryption 现在是同步的
      const decryptedOutput = performDecryption(combinedStr, password);
      // 根据 performDecryption 的返回值调整
      // 如果它返回的是 message 字符串 (文本) 或 stringified payload (文件)
      if (typeof decryptedOutput === 'string') {
          try {
              // 尝试解析，如果是文件payload的JSON字符串
              const parsed = JSON.parse(decryptedOutput);
              if (parsed.type === 'file') {
                  resultPayload = { decryptedFilePayload: parsed };
              } else { // 认为是文本消息
                  resultPayload = { decryptedMessage: decryptedOutput };
              }
          } catch (e) { // 不是JSON，认为是纯文本消息
              resultPayload = { decryptedMessage: decryptedOutput };
          }
      } else { // 理论上不应该到这里，因为 performDecryption 返回字符串
          resultPayload = { decryptedMessage: "Unknown decryption result type" };
      }
    } else {
      throw new Error("Unknown action requested in worker");
    }
    self.postMessage({ id, ...resultPayload });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

self.onerror = function(errorEvent) {
    console.error("Unhandled error in Crypto Worker:", errorEvent.message, errorEvent);
};

