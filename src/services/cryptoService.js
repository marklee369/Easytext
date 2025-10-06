// frontend/src/services/cryptoService.js

// ==================== Worker 管理 ====================

let cryptoWorker = null;
let workerInitialized = false;
let pendingRequests = new Map(); // 存储待处理的请求

/**
 * 获取或创建 Crypto Worker 实例（单例模式）
 */
function getCryptoWorker() {
  if (!cryptoWorker) {
    try {
      cryptoWorker = new Worker(
        new URL('../workers/crypto.worker.js', import.meta.url),
        { type: 'module' }
      );
      
      // Worker 全局错误处理
      cryptoWorker.onerror = (event) => {
        console.error("Crypto Worker 全局错误:", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno
        });
        
        // 通知所有待处理的请求失败
        pendingRequests.forEach((request, id) => {
          request.reject(new Error('Worker 发生严重错误: ' + event.message));
        });
        pendingRequests.clear();
      };
      
      // Worker 消息处理
      cryptoWorker.onmessage = handleWorkerMessage;
      
      workerInitialized = true;
      console.log("CryptoService: Worker 初始化成功");
      
    } catch (error) {
      console.error("CryptoService: Worker 创建失败:", error);
      throw new Error('无法初始化加密服务: ' + error.message);
    }
  }
  
  return cryptoWorker;
}

/**
 * 处理 Worker 返回的消息
 */
function handleWorkerMessage(event) {
  const { id, error, ...result } = event.data;
  
  if (!id) {
    console.error("CryptoService: 收到无效的 Worker 响应（缺少 ID）");
    return;
  }
  
  const request = pendingRequests.get(id);
  
  if (!request) {
    console.warn(`CryptoService: 收到未知请求的响应 (ID: ${id})`);
    return;
  }
  
  // 清理请求
  pendingRequests.delete(id);
  clearTimeout(request.timeout);
  
  // 处理响应
  if (error) {
    console.error(`CryptoService: Worker 返回错误 (ID: ${id}):`, error);
    request.reject(new Error(error));
  } else {
    console.log(`CryptoService: Worker 成功响应 (ID: ${id})`);
    request.resolve(result);
  }
}

/**
 * 生成唯一的消息 ID
 */
function generateMessageId(action) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${action}_${timestamp}_${random}`;
}

/**
 * 调用 Worker 执行操作
 */
function callWorker(action, data, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    try {
      const worker = getCryptoWorker();
      const messageId = generateMessageId(action);
      
      console.log(`CryptoService: 发送请求 '${action}' (ID: ${messageId})`);
      
      // 设置超时处理
      const timeout = setTimeout(() => {
        if (pendingRequests.has(messageId)) {
          pendingRequests.delete(messageId);
          reject(new Error(`${action} 操作超时 (${timeoutMs}ms)`));
        }
      }, timeoutMs);
      
      // 存储请求信息
      pendingRequests.set(messageId, {
        action,
        resolve,
        reject,
        timeout,
        startTime: performance.now()
      });
      
      // 发送消息到 Worker
      worker.postMessage({
        id: messageId,
        action,
        data
      });
      
    } catch (error) {
      console.error(`CryptoService: 调用 Worker 失败 (${action}):`, error);
      reject(new Error(`调用加密服务失败: ${error.message}`));
    }
  });
}

/**
 * 验证加密参数
 */
function validateEncryptParams(textMessage, password) {
  if (!textMessage || typeof textMessage !== 'string') {
    throw new Error('文本消息无效');
  }
  
  if (textMessage.trim().length === 0) {
    throw new Error('文本消息不能为空');
  }
  
  if (!password || typeof password !== 'string') {
    throw new Error('密码无效');
  }
  
  if (password.length < 1) {
    throw new Error('密码不能为空');
  }
  
  // 检查消息大小
  const size = new Blob([textMessage]).size;
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (size > maxSize) {
    throw new Error(`消息过大 (${(size / 1024 / 1024).toFixed(2)}MB)，最大支持 10MB`);
  }
}

/**
 * 验证解密参数
 */
function validateDecryptParams(combinedStr, password) {
  if (!combinedStr || typeof combinedStr !== 'string') {
    throw new Error('加密数据无效');
  }
  
  if (combinedStr.trim().length === 0) {
    throw new Error('加密数据不能为空');
  }
  
  // 验证格式：应该包含 4 个用点分隔的 Base64 部分
  const parts = combinedStr.split('.');
  if (parts.length !== 4) {
    throw new Error('加密数据格式无效');
  }
  
  // 简单验证每个部分是否像 Base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  for (let i = 0; i < parts.length; i++) {
    if (!base64Regex.test(parts[i])) {
      throw new Error(`加密数据格式无效 (部分 ${i + 1})`);
    }
  }
  
  if (!password || typeof password !== 'string') {
    throw new Error('密码无效');
  }
  
  if (password.length < 1) {
    throw new Error('密码不能为空');
  }
}

// ==================== 导出的加密服务 ====================

export const cryptoService = {
  /**
   * 加密文本消息
   * @param {string} textMessage - 要加密的文本
   * @param {string} password - 加密密码
   * @param {number} expiryTimestamp - 过期时间戳（可选）
   * @returns {Promise<string>} 加密后的字符串
   */
  encrypt: async (textMessage, password, expiryTimestamp) => {
    const startTime = performance.now();
    console.log("CryptoService: 开始加密请求");
    
    try {
      // 验证参数
      validateEncryptParams(textMessage, password);
      
      // 调用 Worker
      const result = await callWorker('encrypt', {
        textMessage,
        password,
        expiryTimestamp
      });
      
      if (!result.encryptedPayload || typeof result.encryptedPayload !== 'string') {
        throw new Error('Worker 返回的加密数据无效');
      }
      
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`CryptoService: 加密完成，耗时: ${duration}ms`);
      
      return result.encryptedPayload;
      
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error(`CryptoService: 加密失败，耗时: ${duration}ms:`, error.message);
      throw error;
    }
  },

  /**
   * 解密加密字符串
   * @param {string} combinedStr - 加密的字符串
   * @param {string} password - 解密密码
   * @returns {Promise<object>} 解密后的对象 { type, message, expiry }
   */
  decrypt: async (combinedStr, password) => {
    const startTime = performance.now();
    console.log("CryptoService: 开始解密请求");
    
    try {
      // 验证参数
      validateDecryptParams(combinedStr, password);
      
      // 调用 Worker
      const result = await callWorker('decrypt', {
        combinedStr,
        password
      });
      
      if (!result.decryptedPayload || typeof result.decryptedPayload !== 'object') {
        throw new Error('Worker 返回的解密数据无效');
      }
      
      const payload = result.decryptedPayload;
      
      // 验证解密后的数据结构
      if (payload.type !== 'text') {
        throw new Error('不支持的数据类型: ' + payload.type);
      }
      
      if (typeof payload.message === 'undefined') {
        throw new Error('解密数据缺少消息字段');
      }
      
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`CryptoService: 解密完成，耗时: ${duration}ms`);
      
      return payload;
      
    } catch (error) {
      const duration = (performance.now() - startTime).toFixed(2);
      console.error(`CryptoService: 解密失败，耗时: ${duration}ms:`, error.message);
      throw error;
    }
  },

  /**
   * 终止 Worker（用于清理资源）
   */
  terminate: () => {
    if (cryptoWorker) {
      console.log("CryptoService: 终止 Worker");
      
      // 拒绝所有待处理的请求
      pendingRequests.forEach((request, id) => {
        request.reject(new Error('Worker 已终止'));
      });
      pendingRequests.clear();
      
      cryptoWorker.terminate();
      cryptoWorker = null;
      workerInitialized = false;
    }
  },

  /**
   * 检查 Worker 是否已初始化
   */
  isInitialized: () => workerInitialized,

  /**
   * 获取待处理请求数量
   */
  getPendingRequestCount: () => pendingRequests.size
};
