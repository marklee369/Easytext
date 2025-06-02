// frontend/src/services/cryptoService.js

// Web Worker 实例管理
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
    // Worker 现在可能返回 decryptedMessage (文本) 或 decryptedFilePayload (文件对象)
    if (result.decryptedMessage) {
      return result.decryptedMessage; // 返回文本消息
    } else if (result.decryptedFilePayload) {
      // 如果是文件，我们返回整个对象，让 ViewSecretView.vue 处理
      // 为了与之前的返回类型（字符串）保持某种程度的一致性，
      // 我们可以选择在这里就将文件payload对象转回JSON字符串，
      // 或者直接返回对象，并在ViewSecretView中调整逻辑。
      // 为了ViewSecretView的改动最小，我们这里返回JSON字符串。
      // ViewSecretView.vue 中的 handleDecrypt 会 JSON.parse() 它。
      return JSON.stringify(result.decryptedFilePayload);
    } else {
      throw new Error("Unknown data structure received from decryption worker.");
    }
  }
};

