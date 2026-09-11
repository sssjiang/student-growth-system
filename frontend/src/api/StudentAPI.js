import api from './ApiClient';

class StudentAPI {
  getProfile = () => api.get('/student/profile');

  updateProfile = (profile) => api.put('/student/profile', profile);

  getGrades = () => api.get('/student/grades');

  getFiles = () => api.get('/student/files');

  uploadFile = (file, metadata) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => form.append(key, value));
    return api.post('/student/files', form);
  };

  previewFile = (fileId) => api.getBlob(`/files/${fileId}?preview=1`);

  downloadFile = (fileId) => api.getBlob(`/files/${fileId}`);

  deleteFile = (fileId) => api.delete(`/student/files/${fileId}`);

  resubmitFile = (fileId, file, metadata) => {
    const form = new FormData();
    if (file) form.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => form.append(key, value));
    return api.post(`/student/files/${fileId}/resubmit`, form);
  };
}

export default new StudentAPI();
