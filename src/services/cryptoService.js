// frontend/src/services/cryptoService.js

// Web Worker 实例管理 (与之前版本相同)
let cryptoWorker = null;
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

// 辅助函数 (与之前版本相同)
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
    worker.postMessage({ id: messageId, action, data });
  });
}

export const cryptoService = {
  encrypt: async (stringifiedPayload, password) => { 
    const result = await callWorker('encrypt', { stringifiedPayload, password });
    return result.encryptedPayload; // 这个仍然是加密后的字符串
  },

  decrypt: async (combinedStr, password) => {
    const result = await callWorker('decrypt', { combinedStr, password });
    // Worker 现在通过 'decryptedPayload' 键返回解析后的对象
    if (result.decryptedPayload) {
      return result.decryptedPayload; // <--- 修改点：直接返回对象
    } else {
      // 如果 Worker 返回的结构不是预期的，或者发生错误但未被捕获为 error
      throw new Error("Unexpected data structure received from decryption worker.");
    }
  }
};

