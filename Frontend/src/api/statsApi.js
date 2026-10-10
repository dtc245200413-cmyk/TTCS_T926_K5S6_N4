import axiosClient from './axiosClient';

const statsApi = {
  getDashboardStats: () => {
    return axiosClient.get('/stats/dashboard');
  },
  getHrDashboardStats: () => {
    return axiosClient.get('/stats/hr-dashboard');
  }
};

export default statsApi;
