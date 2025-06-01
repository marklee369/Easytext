// frontend/src/services/cryptoService.js
// CryptoJS 不再需要在主线程中用于加密或解密核心逻辑，但如果其他地方用到它的工具函数可以保留
// import CryptoJS from 'crypto-js'; 

// --- Web Worker 实例管理 ---
let cryptoWorker = null; // 单例 Worker

function getCryptoWorker() {
  if (!cryptoWorker) {
    cryptoWorker = new Worker(new URL('../workers/crypto.worker.js', import.meta.url), {
      type: 'module'
    });
    
    cryptoWorker.onerror = (event) => {
        console.error("Global Crypto Worker Error:", event.message, event);
    };
  }
  return cryptoWorker;
}

// 辅助函数，用于向Worker发送消息并处理响应
function callWorker(action, data) {
  return new Promise((resolve, reject) => {
    const worker = getCryptoWorker();
    const messageId = `${action}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const handleMessage = (event) => {
      if (event.data && event.data.id === messageId) {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleErrorForRequest);
        
        if (event.data.error) {
          console.error(`${action} error from worker (ID: ${messageId}):`, event.data.error);
          reject(new Error(event.data.error));
        } else {
          resolve(event.data); // Worker 返回整个对象，包含 encryptedPayload 或 decryptedMessage
        }
      }
    };

    const handleErrorForRequest = (errorEvent) => {
      console.error(`${action} Worker general error for request (ID: ${messageId}):`, errorEvent.message || errorEvent);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleErrorForRequest);
      reject(new Error(`${action} worker failed: ` + (errorEvent.message || "Unknown error")));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleErrorForRequest);

    worker.postMessage({
      id: messageId,
      action, // 'encrypt' 或 'decrypt'
      data      // 包含所需参数的对象
    });
  });
}


export const cryptoService = {
  encrypt: async (text, password, expiryTimestamp = null) => {
    const result = await callWorker('encrypt', { text, password, expiryTimestamp });
    return result.encryptedPayload; // 从结果中提取实际的加密负载
  },

  decrypt: async (combinedStr, password) => {
    const result = await callWorker('decrypt', { combinedStr, password });
    return result.decryptedMessage; // 从结果中提取实际的解密消息
  }
};

