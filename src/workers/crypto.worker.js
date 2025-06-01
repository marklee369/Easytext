// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';
import argon2 from 'argon2-browser'; // 导入 argon2-browser

// --- 加密/解密共用的常量 ---
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
// Argon2 参数 (可以根据您的目标性能和安全级别进行调整)
const ARGON2_ITERATIONS = 1;       // 时间成本 (t_cost) - 迭代次数
const ARGON2_MEMORY_KB = 17 * 1024;  // 内存成本 (m_cost) - 单位 KiB (例如 19MB = 19456 KiB)
const ARGON2_PARALLELISM = 1;      // 并行度 (p)
const ARGON2_HASH_LENGTH_BYTES = 64; // 派生密钥长度，512 bits (32 bytes for AES + 32 bytes for HMAC)
const ARGON2_TYPE = argon2.ArgonType.Argon2id; // 使用 Argon2id

const AES_KEY_SIZE_BITS = 256;
const HMAC_KEY_SIZE_BITS = 256;

// --- 辅助函数 ---
function wordArrayToBase64(wordArray) {
  return CryptoJS.enc.Base64.stringify(wordArray);
}
function base64ToWordArray(base64Str) {
  return CryptoJS.enc.Base64.parse(base64Str);
}

// CryptoJS WordArray to Uint8Array
function wordArrayToUint8Array(wordArray) {
  const l = wordArray.sigBytes;
  const words = wordArray.words;
  const u8 = new Uint8Array(l);
  for (let i = 0; i < l; i++) {
    u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return u8;
}

// Uint8Array to CryptoJS WordArray
function uint8ArrayToWordArray(u8Array) {
  return CryptoJS.lib.WordArray.create(u8Array);
}


// --- 异步密钥派生函数 (使用 Argon2) ---
async function deriveKeyWithArgon2(password, saltWordArray) {
  try {
    const saltUint8Array = wordArrayToUint8Array(saltWordArray); // Argon2 库通常需要 Uint8Array 格式的盐

    const hashResult = await argon2.hash({
      pass: password, // 密码字符串
      salt: saltUint8Array, // 盐 Uint8Array
      time: ARGON2_ITERATIONS,
      mem: ARGON2_MEMORY_KB,
      hashLen: ARGON2_HASH_LENGTH_BYTES,
      parallelism: ARGON2_PARALLELISM,
      type: ARGON2_TYPE,
      // raw: true // 如果库支持直接返回 Uint8Array 而不是对象
    });

    // argon2-browser 返回一个对象，其中 hash.hash 是 Uint8Array 类型的派生密钥
    // 如果直接是 Uint8Array，则直接使用 hashResult
    const derivedKeyUint8Array = hashResult.hash; // 确保这是 Uint8Array
    
    return uint8ArrayToWordArray(derivedKeyUint8Array); // 转换为 WordArray 供 CryptoJS 使用
  } catch (err) {
    console.error('Argon2 key derivation error:', err);
    throw new Error('Key derivation failed with Argon2: ' + (err.message || err));
  }
}


// --- 加密核心逻辑 ---
async function performEncryption(stringifiedPayload, password) {
  try {
    const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES); // 生成 CryptoJS WordArray 格式的盐
    const derivedKey = await deriveKeyWithArgon2(password, salt); // 使用 Argon2 派生密钥

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
async function performDecryption(combinedStr, password) {
  try {
    const parts = combinedStr.split('.');
    if (parts.length !== 4) throw new Error("无效的加密数据格式。");
    
    const salt = base64ToWordArray(parts[0]); // 从 Base64 转回 WordArray 格式的盐
    const iv = base64ToWordArray(parts[1]);
    const ciphertext = base64ToWordArray(parts[2]);
    const storedMac = base64ToWordArray(parts[3]);

    const derivedKey = await deriveKeyWithArgon2(password, salt); // 使用 Argon2 派生密钥

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
    return payload.message; 
  } catch (error) {
    console.error("Worker decryption error:", error);
    throw new Error("Decryption failed in worker: " + (error.message || "Unknown error"));
  }
}


// --- Worker 消息监听与响应 ---
self.onmessage = async function(event) { // 注意这里改为 async function
  const { id, action, data } = event.data; 

  try {
    let resultPayload; // 用于存放加密或解密后的核心数据
    if (action === 'encrypt') {
      const { stringifiedPayload, password } = data;
      const encryptedPayload = await performEncryption(stringifiedPayload, password);
      resultPayload = { encryptedPayload };
    } else if (action === 'decrypt') {
      const { combinedStr, password } = data;
      const decryptedMessage = await performDecryption(combinedStr, password);
      resultPayload = { decryptedMessage };
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

