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
}

export default new TeacherAPI();
