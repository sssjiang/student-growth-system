import api from './ApiClient';

class StudentAPI {
  getProfile = () => api.get('/student/profile');

  updateProfile = (profile) => api.put('/student/profile', profile);

  getGrades = () => api.get('/student/grades');

  getFiles = () => api.get('/student/files');

  uploadFile = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/student/files', form);
  };
}

export default new StudentAPI();
