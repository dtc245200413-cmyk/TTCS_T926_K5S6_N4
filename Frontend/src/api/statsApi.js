import axiosClient from './axiosClient';

const statsApi = {
  getDashboardStats: () => {
    return axiosClient.get('/stats/dashboard');
  }
};

export default statsApi;
