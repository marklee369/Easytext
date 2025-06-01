// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';

// --- 加密/解密共用的常量和辅助函数 ---
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
const PBKDF2_ITERATIONS = 66666; // 保持高迭代次数以确保安全
const DERIVED_KEY_SIZE_BITS = 512;
const AES_KEY_SIZE_BITS = 256;
const HMAC_KEY_SIZE_BITS = 256;

function wordArrayToBase64(wordArray) {
  return CryptoJS.enc.Base64.stringify(wordArray);
}
function base64ToWordArray(base64Str) {
  return CryptoJS.enc.Base64.parse(base64Str);
}

// --- 加密核心逻辑 ---
function performEncryption(text, password, expiryTimestamp = null) {
  try {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
    const derivedKey = CryptoJS.PBKDF2(password, salt, {
      keySize: DERIVED_KEY_SIZE_BITS / 32,
      iterations: PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    });

    const aesKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(0, AES_KEY_SIZE_BITS / 32));
    const hmacKey = CryptoJS.lib.WordArray.create(derivedKey.words.slice(AES_KEY_SIZE_BITS / 32));
    const payloadToEncrypt = JSON.stringify({ message: text, expiry: expiryTimestamp });
    const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
    const encrypted = CryptoJS.AES.encrypt(payloadToEncrypt, aesKey, {
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

    const derivedKey = CryptoJS.PBKDF2(password, salt, {
      keySize: DERIVED_KEY_SIZE_BITS / 32, iterations: PBKDF2_ITERATIONS, hasher: CryptoJS.algo.SHA256
    });
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
    if (payload.expiry && Date.now() > payload.expiry) {
      throw new Error(`此密文已于 ${new Date(payload.expiry).toLocaleString()} 过期。`);
    }
    return payload.message; // 只返回消息内容
  } catch (error) {
    console.error("Worker decryption error:", error);
    throw new Error("Decryption failed in worker: " + (error.message || "Unknown error"));
  }
}


// --- Worker 消息监听与响应 ---
self.onmessage = function(event) {
  const { id, action, data } = event.data; // `action` 会是 'encrypt' 或 'decrypt'

  try {
    let result;
    if (action === 'encrypt') {
      const { text, password, expiryTimestamp } = data;
      result = { encryptedPayload: performEncryption(text, password, expiryTimestamp) };
    } else if (action === 'decrypt') {
      const { combinedStr, password } = data;
      result = { decryptedMessage: performDecryption(combinedStr, password) };
    } else {
      throw new Error("Unknown action requested in worker");
    }
    self.postMessage({ id, ...result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

self.onerror = function(errorEvent) {
    console.error("Unhandled error in Crypto Worker:", errorEvent.message, errorEvent);
    // 可以在这里尝试向主线程发送一个通用错误消息，如果 onmessage 中的 try-catch 没捕获到
    // self.postMessage({ error: "A critical error occurred in the crypto worker." });
};

