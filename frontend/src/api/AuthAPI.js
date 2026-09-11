import api from './ApiClient';

class AuthAPI {
  login = (credentials) => api.post('/auth/login', credentials);

  register = (student) => api.post('/auth/register', student);
}

export default new AuthAPI();
