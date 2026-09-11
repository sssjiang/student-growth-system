const API_ROOT = import.meta.env.VITE_API_ROOT || '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('student_token');
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试');
  return data;
}

export const authApi = {
  login: (payload) => api('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => api('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
};
