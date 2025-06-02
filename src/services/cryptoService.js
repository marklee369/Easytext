// frontend/src/services/cryptoService.js
let cryptoWorker = null;

function getCryptoWorker() {
  if (!cryptoWorker) {
    cryptoWorker = new Worker(new URL('../workers/crypto.worker.js', import.meta.url), {
      type: 'module'
    });
    
    cryptoWorker.onerror = (event) => {
        console.error("全局 Crypto Worker 错误:", event.message, event);
    };
  }
  return cryptoWorker;
}

function callWorker(action, data) {
  return new Promise((resolve, reject) => {
    const worker = getCryptoWorker();
    const messageId = `${action}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    console.log(`CryptoService: 调用 worker 动作 '${action}' (ID: '${messageId}')`);

    const handleMessage = (event) => {
      if (event.data && event.data.id === messageId) {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleErrorForRequest);
        
        if (event.data.error) {
          console.error(`CryptoService: Worker 返回错误 (动作 '${action}', ID '${messageId}'):`, event.data.error);
          reject(new Error(event.data.error));
        } else {
          console.log(`CryptoService: Worker 成功响应 (动作 '${action}', ID '${messageId}'):`, event.data);
          resolve(event.data); 
        }
      }
    };

    const handleErrorForRequest = (errorEvent) => {
      console.error(`CryptoService: Worker 请求时发生一般错误 (动作 '${action}', ID '${messageId}'):`, errorEvent.message || errorEvent);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleErrorForRequest);
      reject(new Error(`${action} worker 失败: ` + (errorEvent.message || "未知错误")));
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
  encrypt: async (textMessage, password, expiryTimestamp) => { 
    console.log("CryptoService: 请求加密文本。");
    const result = await callWorker('encrypt', { textMessage, password, expiryTimestamp });
    return result.encryptedPayload; 
  },

  decrypt: async (combinedStr, password) => {
    console.log("CryptoService: 请求解密。");
    const result = await callWorker('decrypt', { combinedStr, password });
    // Worker 现在通过 'decryptedPayload' 键返回解析后的对象
    if (result.decryptedPayload && typeof result.decryptedPayload === 'object') {
      console.log("CryptoService: 解密服务收到载荷对象:", result.decryptedPayload);
      return result.decryptedPayload; // 直接返回对象
    } else {
      console.error("CryptoService: 解密 worker 未返回预期的 'decryptedPayload' 对象。收到:", result);
      throw new Error("从解密服务接收到未知的数据结构。");
    }
  }
};


