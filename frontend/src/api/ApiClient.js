const API_ROOT = import.meta.env.VITE_API_ROOT || '/api';

class ApiClient {
  async request(path, options = {}) {
    const token = localStorage.getItem('student_token');
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && token) {
        localStorage.removeItem('student_token');
        localStorage.removeItem('student_user');
      }
      throw new Error(data.error || '请求失败，请稍后重试');
    }

    return data;
  }

  async getBlob(path) {
    const token = localStorage.getItem('student_token');
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('文件读取失败，请稍后重试');
    return response.blob();
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}

export default new ApiClient();
