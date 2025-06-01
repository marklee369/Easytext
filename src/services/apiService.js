// frontend/src/services/apiService.js
const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL || 'http://127.0.0.1:8787';

export const apiService = {
  async createSecret(encryptedPayload, expiryOption, readOnce) {
    const response = await fetch(`${WORKER_BASE_URL}/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ encryptedPayload, expiryOption, readOnce }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "创建密文失败，服务器返回无效响应。" }));
      throw new Error(errorData.error || `创建密文失败: ${response.statusText}`);
    }
    return response.json();
  },

  async getSecret(secretId) {
    const response = await fetch(`${WORKER_BASE_URL}/api/secret/${secretId}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "获取密文失败，服务器返回无效响应。" }));
      if (response.status === 404) throw new Error("密文未找到，可能已过期或已被读取。");
      throw new Error(errorData.error || `获取密文失败: ${response.statusText}`);
    }
    return response.json();
  }
};

