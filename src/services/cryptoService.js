// frontend/src/services/cryptoService.js
// CryptoJS 在主线程中不再直接用于加解密核心逻辑

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
          resolve(event.data); 
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
      action, 
      data      
    });
  });
}


export const cryptoService = {
  encrypt: async (stringifiedPayload, password) => { 
    const result = await callWorker('encrypt', { stringifiedPayload, password });
    return result.encryptedPayload; 
  },

  decrypt: async (combinedStr, password) => {
    const result = await callWorker('decrypt', { combinedStr, password });
    return result.decryptedMessage; 
  }
};

