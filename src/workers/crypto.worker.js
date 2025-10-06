// frontend/src/workers/crypto.worker.js
import CryptoJS from 'crypto-js';

// ==================== 常量配置 ====================
const CRYPTO_CONFIG = {
  SALT_SIZE_BYTES: 16,
  IV_SIZE_BYTES: 12, // GCM 推荐使用 12 字节 IV
  PBKDF2_ITERATIONS: 100000, // 提高到 100000 次迭代增强安全性
  KEY_SIZE_BITS: 256, // AES-256
  KEY_SIZE_BYTES: 32,
  TAG_SIZE_BYTES: 16, // GCM 认证标签
  MAX_MESSAGE_SIZE: 10 * 1024 * 1024, // 10MB
  EXPECTED_PARTS_COUNT: 4, // salt.iv.ciphertext.tag
};

// ==================== 辅助函数 ====================

/**
 * WordArray 转 Base64
 */
function wordArrayToBase64(wordArray) {
  if (!wordArray || !wordArray.words) {
    throw new Error('Worker: 无效的 WordArray');
  }
  return CryptoJS.enc.Base64.stringify(wordArray);
}

/**
 * Base64 转 WordArray
 */
function base64ToWordArray(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') {
    throw new Error('Worker: 无效的 Base64 字符串');
  }
  try {
    return CryptoJS.enc.Base64.parse(base64Str);
  } catch (error) {
    throw new Error('Worker: Base64 解析失败: ' + error.message);
  }
}

/**
 * 使用 PBKDF2 派生密钥（使用 SHA-512 提升安全性）
 */
function deriveKeyWithPBKDF2(password, saltWordArray) {
  if (!password || typeof password !== 'string') {
    throw new Error('Worker: 密码不能为空');
  }
  
  if (password.length < 1) {
    throw new Error('Worker: 密码长度不足');
  }
  
  if (!saltWordArray || !saltWordArray.words) {
    throw new Error('Worker: 无效的盐值');
  }
  
  try {
    const derivedKey = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: CRYPTO_CONFIG.KEY_SIZE_BYTES / 4, // 32 bytes = 8 words
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hasher: CryptoJS.algo.SHA512 // 使用 SHA-512 提升安全性
    });
    
    if (!derivedKey || !derivedKey.words || derivedKey.sigBytes !== CRYPTO_CONFIG.KEY_SIZE_BYTES) {
      throw new Error('Worker: 密钥派生结果无效');
    }
    
    return derivedKey;
  } catch (err) {
    console.error('Worker: PBKDF2 密钥派生错误:', err);
    throw new Error('Worker: 密钥派生失败: ' + (err.message || err));
  }
}

/**
 * 验证消息大小
 */
function validateMessageSize(message) {
  if (!message) {
    throw new Error('Worker: 消息不能为空');
  }
  
  const size = new Blob([message]).size;
  if (size > CRYPTO_CONFIG.MAX_MESSAGE_SIZE) {
    throw new Error(`Worker: 消息过大 (${(size / 1024 / 1024).toFixed(2)}MB)，最大支持 ${CRYPTO_CONFIG.MAX_MESSAGE_SIZE / 1024 / 1024}MB`);
  }
  
  return true;
}

// ==================== 加密核心逻辑 (AES-256-GCM) ====================

/**
 * 加密文本消息
 * 使用 AES-256-GCM 模式，提供认证加密
 */
function performEncryption(textMessage, password, expiryTimestamp) {
  console.log("Worker: 开始加密操作 (AES-256-GCM)");
  
  try {
    // 验证输入
    if (typeof textMessage !== 'string') {
      throw new Error('Worker: 文本消息必须是字符串');
    }
    
    validateMessageSize(textMessage);
    
    if (!password || typeof password !== 'string') {
      throw new Error('Worker: 密码无效');
    }
    
    // 生成随机盐值和 IV
    const salt = CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.SALT_SIZE_BYTES);
    const iv = CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.IV_SIZE_BYTES);
    
    // 派生加密密钥
    const key = deriveKeyWithPBKDF2(password, salt);
    
    // 构建待加密的载荷
    const payloadToEncrypt = JSON.stringify({ 
      type: 'text',
      message: textMessage, 
      expiry: expiryTimestamp,
      timestamp: Date.now()
    });
    
    console.log("Worker: 载荷大小:", (new Blob([payloadToEncrypt]).size / 1024).toFixed(2), "KB");
    
    // 使用 AES-256-GCM 加密
    const encrypted = CryptoJS.AES.encrypt(payloadToEncrypt, key, {
      iv: iv,
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding // GCM 不需要 padding
    });
    
    const ciphertext = encrypted.ciphertext;
    
    // 提取 GCM 认证标签（最后 16 字节）
    const tag = CryptoJS.lib.WordArray.create(
      encrypted.tag?.words || ciphertext.words.slice(-4)
    );
    
    // 组合格式: salt.iv.ciphertext.tag (全部 Base64 编码)
    const combined = [
      wordArrayToBase64(salt),
      wordArrayToBase64(iv),
      wordArrayToBase64(ciphertext),
      wordArrayToBase64(tag)
    ].join('.');
    
    console.log("Worker: 加密完成，输出大小:", (combined.length / 1024).toFixed(2), "KB");
    
    return combined;
    
  } catch (error) {
    console.error("Worker 加密错误:", error);
    throw new Error("Worker: 加密失败: " + (error.message || "未知错误"));
  }
}

// ==================== 解密核心逻辑 (AES-256-GCM) ====================

/**
 * 解密加密字符串
 * 使用 AES-256-GCM 模式验证并解密
 */
function performDecryption(combinedStr, password) {
  console.log("Worker: 开始解密操作 (AES-256-GCM)");
  
  try {
    // 验证输入
    if (!combinedStr || typeof combinedStr !== 'string') {
      throw new Error("Worker: 无效的加密数据");
    }
    
    if (!password || typeof password !== 'string') {
      throw new Error('Worker: 密码无效');
    }
    
    // 分割加密数据
    const parts = combinedStr.split('.');
    if (parts.length !== CRYPTO_CONFIG.EXPECTED_PARTS_COUNT) {
      console.error("Worker: 加密数据格式无效，期望 4 部分，实际:", parts.length);
      throw new Error("Worker: 无效的加密数据格式");
    }
    
    // 解析各部分
    const salt = base64ToWordArray(parts[0]);
    const iv = base64ToWordArray(parts[1]);
    const ciphertext = base64ToWordArray(parts[2]);
    const storedTag = base64ToWordArray(parts[3]);
    
    // 验证数据完整性
    if (salt.sigBytes !== CRYPTO_CONFIG.SALT_SIZE_BYTES) {
      throw new Error("Worker: 盐值大小不正确");
    }
    if (iv.sigBytes !== CRYPTO_CONFIG.IV_SIZE_BYTES) {
      throw new Error("Worker: IV 大小不正确");
    }
    if (storedTag.sigBytes !== CRYPTO_CONFIG.TAG_SIZE_BYTES) {
      throw new Error("Worker: 认证标签大小不正确");
    }
    
    console.log("Worker: 数据完整性检查通过");
    
    // 派生解密密钥
    const key = deriveKeyWithPBKDF2(password, salt);
    
    // 使用 AES-256-GCM 解密
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext, tag: storedTag },
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      }
    );
    
    // 转换为 UTF-8 字符串
    const decryptedPayloadJson = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedPayloadJson) {
      console.warn("Worker: 解密后载荷为空，可能是密码错误或数据损坏");
      throw new Error("Worker: 解密失败，请检查密码是否正确");
    }
    
    console.log("Worker: 解密成功，载荷大小:", (decryptedPayloadJson.length / 1024).toFixed(2), "KB");
    
    // 解析 JSON
    let payloadObject;
    try {
      payloadObject = JSON.parse(decryptedPayloadJson);
    } catch (parseError) {
      console.error("Worker: JSON 解析失败:", parseError);
      throw new Error("Worker: 数据格式错误，可能是密码不正确");
    }
    
    // 验证载荷结构
    if (!payloadObject || typeof payloadObject !== 'object') {
      throw new Error("Worker: 解密数据格式无效");
    }
    
    if (payloadObject.type !== 'text') {
      throw new Error("Worker: 不支持的数据类型: " + payloadObject.type);
    }
    
    if (typeof payloadObject.message === 'undefined') {
      throw new Error("Worker: 载荷缺少消息字段");
    }
    
    // 检查过期时间
    if (payloadObject.expiry && Date.now() > payloadObject.expiry) {
      const expiryDate = new Date(payloadObject.expiry).toLocaleString('zh-CN');
      console.warn("Worker: 秘密已过期:", expiryDate);
      throw new Error(`Worker: 此密文已于 ${expiryDate} 过期`);
    }
    
    console.log("Worker: 解密成功，返回载荷");
    
    return payloadObject;
    
  } catch (error) {
    console.error("Worker 解密错误:", error);
    // 如果是已知错误，直接抛出；否则包装错误
    if (error.message && error.message.startsWith('Worker:')) {
      throw error;
    }
    throw new Error("Worker: 解密失败: " + (error.message || "未知错误"));
  }
}

// ==================== Worker 消息处理 ====================

/**
 * Worker 消息监听器
 */
self.onmessage = async function(event) {
  const startTime = performance.now();
  const { id, action, data } = event.data;
  
  if (!id) {
    console.error("Worker: 收到无效请求（缺少 ID）");
    return;
  }
  
  console.log(`Worker: 收到请求 '${action}' (ID: ${id})`);
  
  try {
    let resultPayloadContainer;
    
    if (action === 'encrypt') {
      // 验证加密参数
      if (!data || typeof data !== 'object') {
        throw new Error("Worker: 加密参数无效");
      }
      
      const { textMessage, password, expiryTimestamp } = data;
      
      if (!textMessage) {
        throw new Error("Worker: 文本消息不能为空");
      }
      
      if (!password) {
        throw new Error("Worker: 密码不能为空");
      }
      
      const encryptedPayloadStr = performEncryption(textMessage, password, expiryTimestamp);
      resultPayloadContainer = { encryptedPayload: encryptedPayloadStr };
      
    } else if (action === 'decrypt') {
      // 验证解密参数
      if (!data || typeof data !== 'object') {
        throw new Error("Worker: 解密参数无效");
      }
      
      const { combinedStr, password } = data;
      
      if (!combinedStr) {
        throw new Error("Worker: 加密数据不能为空");
      }
      
      if (!password) {
        throw new Error("Worker: 密码不能为空");
      }
      
      const decryptedObject = performDecryption(combinedStr, password);
      resultPayloadContainer = { decryptedPayload: decryptedObject };
      
    } else {
      throw new Error(`Worker: 未知操作: ${action}`);
    }
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`Worker: 操作 '${action}' 完成 (ID: ${id})，耗时: ${duration}ms`);
    
    self.postMessage({ id, ...resultPayloadContainer });
    
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error(`Worker: 操作 '${action}' 失败 (ID: ${id})，耗时: ${duration}ms:`, error.message);
    
    self.postMessage({ 
      id, 
      error: error.message || "未知错误"
    });
  }
};

/**
 * Worker 全局错误处理
 */
self.onerror = function(errorEvent) {
  console.error("Crypto Worker 未捕获错误:", {
    message: errorEvent.message,
    filename: errorEvent.filename,
    lineno: errorEvent.lineno,
    colno: errorEvent.colno
  });
  return true; // 阻止默认错误处理
};
