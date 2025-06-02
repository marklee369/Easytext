// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';

// --- 常量和辅助函数 (与之前版本相同) ---
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
const PBKDF2_ITERATIONS = 100000;
const DERIVED_KEY_SIZE_BITS = 512;
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
    return CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: DERIVED_KEY_SIZE_BITS / 32,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });
  } catch (err) {
    console.error('PBKDF2 key derivation error:', err);
    throw new Error('Key derivation failed with PBKDF2: ' + (err.message || err));
  }
}
// --- 常量和辅助函数结束 ---

// --- 加密核心逻辑 (与之前版本相同) ---
function performEncryption(stringifiedPayload, password) {
  try {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
    const derivedKey = deriveKeyWithPBKDF2(password, salt);
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
// --- 加密核心逻辑结束 ---

// --- 解密核心逻辑 (修改返回值) ---
function performDecryption(combinedStr, password) {
  try {
    const parts = combinedStr.split('.');
    if (parts.length !== 4) throw new Error("无效的加密数据格式。");
    
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
      throw new Error("MAC校验失败。数据可能被篡改或密码错误。");
    }

    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, aesKey, {
      iv: iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
    });
    const decryptedPayloadJson = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedPayloadJson) throw new Error("解密后内容为空，可能是密码错误。");
    
    const payloadObject = JSON.parse(decryptedPayloadJson); // 解析为对象

    if (payloadObject.expiry && Date.now() > payloadObject.expiry) {
      throw new Error(`此密文已于 ${new Date(payloadObject.expiry).toLocaleString()} 过期。`);
    }
    return payloadObject; // <--- 修改点：返回解析后的对象
  } catch (error) {
    console.error("Worker decryption error:", error);
    // 重新抛出错误，以便 onmessage 中的 try-catch 可以捕获并发送给主线程
    throw new Error("Decryption failed in worker: " + (error.message || "Unknown error"));
  }
}
// --- 解密核心逻辑结束 ---


// --- Worker 消息监听与响应 (修改解密部分发送的数据) ---
self.onmessage = async function(event) {
  const { id, action, data } = event.data; 

  try {
    let resultPayload; 
    if (action === 'encrypt') {
      const { stringifiedPayload, password } = data;
      const encryptedPayloadStr = performEncryption(stringifiedPayload, password); // 同步
      resultPayload = { encryptedPayload: encryptedPayloadStr };
    } else if (action === 'decrypt') {
      const { combinedStr, password } = data;
      const decryptedObject = performDecryption(combinedStr, password); // 同步，返回对象
      resultPayload = { decryptedPayload: decryptedObject }; // <--- 修改点：键名统一为 decryptedPayload，值为对象
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

