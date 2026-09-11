import api from './ApiClient';

class TeacherAPI {
  getDashboard = () => api.get('/teacher/dashboard');

  getStudents = () => api.get('/teacher/students');

  searchStudents = (query) => api.post('/teacher/search', { query });

  getStudentGrades = (studentId) =>
    api.get(`/teacher/students/${studentId}/grades`);

  getStudentReport = (studentId) =>
    api.get(`/teacher/students/${studentId}/report`);

  createStudentReport = (studentId) =>
    api.post(`/teacher/students/${studentId}/report`, {});

  importGrades = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/teacher/grades/import', form);
  };

  getCredentials = (status = '') =>
    api.get(`/teacher/credentials${status ? `?status=${status}` : ''}`);

  reviewCredential = (fileId, status, comment) =>
    api.put(`/teacher/credentials/${fileId}/review`, { status, comment });

  previewCredential = (fileId) => api.getBlob(`/files/${fileId}?preview=1`);

  getCredentialAnalysis = (fileId) =>
    api.get(`/teacher/credentials/${fileId}/analysis`);

  analyzeCredential = (fileId) =>
    api.post(`/teacher/credentials/${fileId}/analysis`, {});

  getKnowledgeDocuments = () => api.get('/teacher/knowledge');

  uploadKnowledgeDocument = (file, metadata) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => form.append(key, value));
    return api.post('/teacher/knowledge', form);
  };

  deleteKnowledgeDocument = (documentId) =>
    api.delete(`/teacher/knowledge/${documentId}`);

  reindexKnowledgeDocument = (documentId) =>
    api.post(`/teacher/knowledge/${documentId}/reindex`, {});

  previewKnowledgeDocument = (documentId) =>
    api.getBlob(`/teacher/knowledge/${documentId}/file?preview=1`);
}

export default new TeacherAPI();
