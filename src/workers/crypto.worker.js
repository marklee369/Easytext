// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';

// --- 常量和辅助函数 ---
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
const PBKDF2_ITERATIONS = 100000; // 保持较高的迭代次数以确保安全
const DERIVED_KEY_SIZE_BITS = 512;  // 512 bits (32 bytes for AES + 32 bytes for HMAC)
const AES_KEY_SIZE_BITS = 256;
const HMAC_KEY_SIZE_BITS = 256;

function wordArrayToBase64(wordArray) {
  return CryptoJS.enc.Base64.stringify(wordArray);
}
function base64ToWordArray(base64Str) {
  return CryptoJS.enc.Base64.parse(base64Str);
}

function deriveKeyWithPBKDF2(password, saltWordArray) {
  try {
    const derivedKey = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: DERIVED_KEY_SIZE_BITS / 32,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });
    return derivedKey;
  } catch (err) {
    console.error('Worker: PBKDF2 key derivation error:', err);
    throw new Error('Worker: 密钥派生失败 (PBKDF2): ' + (err.message || err));
  }
}

// --- 加密核心逻辑 (只处理文本) ---
function performEncryption(textMessage, password, expiryTimestamp) {
  console.log("Worker: 开始为文本执行加密操作。");
  try {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
    const derivedKey = deriveKeyWithPBKDF2(password, salt);
    const aesKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, AES_KEY_SIZE_BITS / 32));
    const hmacKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(AES_KEY_SIZE_BITS / 32));
    
    const payloadToEncrypt = JSON.stringify({ 
      type: 'text', // 明确标记为文本类型
      message: textMessage, 
      expiry: expiryTimestamp 
    });
    console.log("Worker: 加密前的载荷 (部分):", payloadToEncrypt.substring(0,100) + "...");

    const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
    const encrypted = CryptoJS.AES.encrypt(payloadToEncrypt, aesKey, {
      iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
    });
    const ciphertext = encrypted.ciphertext;
    const dataToMac = iv.clone().concat(ciphertext);
    const mac = CryptoJS.HmacSHA256(dataToMac, hmacKey);
    
    const combined = `${wordArrayToBase64(salt)}.${wordArrayToBase64(iv)}.${wordArrayToBase64(ciphertext)}.${wordArrayToBase64(mac)}`;
    console.log("Worker: 加密完成。");
    return combined;
  } catch (error) {
    console.error("Worker 加密错误:", error);
    throw new Error("Worker: 加密失败: " + (error.message || "未知错误"));
  }
}

// --- 解密核心逻辑 (只处理文本) ---
function performDecryption(combinedStr, password) {
  console.log("Worker: 开始执行解密操作。");
  try {
    const parts = combinedStr.split('.');
    if (parts.length !== 4) {
        console.error("Worker: 加密数据格式无效 (parts)。");
        throw new Error("Worker: 无效的加密数据格式。");
    }
    
    const salt = base64ToWordArray(parts[0]);
    const iv = base64ToWordArray(parts[1]);
    const ciphertext = base64ToWordArray(parts[2]);
    const storedMac = base64ToWordArray(parts[3]);

    const derivedKey = deriveKeyWithPBKDF2(password, salt);
    const aesKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, AES_KEY_SIZE_BITS / 32));
    const hmacKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(AES_KEY_SIZE_BITS / 32));
    const dataToMac = iv.clone().concat(ciphertext);
    const calculatedMac = CryptoJS.HmacSHA256(dataToMac, hmacKey);

    if (wordArrayToBase64(calculatedMac) !== wordArrayToBase64(storedMac)) {
      console.warn("Worker: MAC 校验失败。");
      throw new Error("Worker: MAC校验失败。数据可能被篡改或密码错误。");
    }
    console.log("Worker: MAC 校验成功。");

    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, aesKey, {
      iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
    });
    const decryptedPayloadJson = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedPayloadJson) {
      console.warn("Worker: 解密后的载荷为空。");
      throw new Error("Worker: 解密后内容为空，可能是密码错误。");
    }
    console.log("Worker: 解密后的载荷 JSON 字符串 (部分):", decryptedPayloadJson.substring(0,100) + "...");
    
    const payloadObject = JSON.parse(decryptedPayloadJson);
    console.log("Worker: 解析后的载荷对象:", payloadObject);

    if (payloadObject.expiry && Date.now() > payloadObject.expiry) {
      console.warn("Worker: 秘密已过期。");
      throw new Error(`Worker: 此密文已于 ${new Date(payloadObject.expiry).toLocaleString()} 过期。`);
    }
    
    // 确保返回的是包含 type: 'text' 和 message 字段的对象
    if (payloadObject.type !== 'text' || typeof payloadObject.message === 'undefined') {
        console.error("Worker: 解密后的载荷对象缺少预期的字段 (type: 'text' 或 message)。载荷:", payloadObject);
        throw new Error("Worker: 解密数据不是预期的文本格式。");
    }
    console.log("Worker: 解密成功，返回载荷对象。");
    return payloadObject; // 返回包含 type 和 message 的对象
  } catch (error) {
    console.error("Worker 解密错误 (在 performDecryption 中):", error);
    throw error; // 重新抛出，让 onmessage 捕获
  }
}

// --- Worker 消息监听与响应 ---
self.onmessage = async function(event) {
  const { id, action, data } = event.data; 
  console.log(`Worker: 收到动作 '${action}' (ID: '${id}')`);

  try {
    let resultPayloadContainer; 
    if (action === 'encrypt') {
      const { textMessage, password, expiryTimestamp } = data;
      const encryptedPayloadStr = performEncryption(textMessage, password, expiryTimestamp);
      resultPayloadContainer = { encryptedPayload: encryptedPayloadStr };
    } else if (action === 'decrypt') {
      const { combinedStr, password } = data;
      const decryptedObject = performDecryption(combinedStr, password); 
      resultPayloadContainer = { decryptedPayload: decryptedObject }; // 现在发送的是对象
    } else {
      throw new Error("Worker: 未知动作请求");
    }
    console.log(`Worker: 成功处理动作 '${action}' (ID: '${id}'), 发送结果。`);
    self.postMessage({ id, ...resultPayloadContainer });
  } catch (error) {
    console.error(`Worker: 处理动作 '${action}' (ID: '${id}') 时发生错误:`, error.message);
    self.postMessage({ id, error: error.message });
  }
};

self.onerror = function(errorEvent) {
    console.error("Crypto Worker 中未处理的错误:", errorEvent.message, errorEvent);
};


