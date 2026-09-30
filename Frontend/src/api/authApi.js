import axiosClient from './axiosClient';

const authApi = {
  login: (email, password) => {
    return axiosClient.post('/auth/login', { email, password });
  },

  logout: () => {
    return axiosClient.post('/auth/logout');
  },

  getCurrentUser: () => {
    return axiosClient.get('/auth/me');
  },

  forgotPassword: (email) => {
    return axiosClient.post('/auth/forgot-password', { email });
  },

  resetPassword: (token, newPassword) => {
    return axiosClient.post('/auth/reset-password', { token, newPassword });
  },

  changePassword: (currentPassword, newPassword) => {
    return axiosClient.put('/auth/change-password', { currentPassword, newPassword });
  }
};

export default authApi;
