import api from './ApiClient';

class AdminAPI {
  getDashboard = () => api.get('/admin/dashboard');

  getUsers = () => api.get('/admin/users');

  createUser = (data) => api.post('/admin/users', data);

  getKnowledge = () => api.get('/admin/knowledge');

  getKnowledgeChunks = (documentId) =>
    api.get(`/admin/knowledge/${documentId}/chunks`);

  reindexKnowledge = (documentId) =>
    api.post(`/admin/knowledge/${documentId}/reindex`, {});

  getRagTraces = (subject = '') =>
    api.get(`/admin/rag-traces${subject ? `?subject=${subject}` : ''}`);

  getRagTrace = (traceId) => api.get(`/admin/rag-traces/${traceId}`);

  getSettings = () => api.get('/admin/settings');
}

export default new AdminAPI();
