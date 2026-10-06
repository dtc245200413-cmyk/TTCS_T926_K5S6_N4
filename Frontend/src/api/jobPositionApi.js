import axiosClient from './axiosClient';

const jobPositionApi = {
  getAll: (params) => {
    return axiosClient.get('/job-positions', { params });
  },

  getById: (id) => {
    return axiosClient.get(`/job-positions/${id}`);
  },

  create: (data) => {
    return axiosClient.post('/job-positions', data);
  },

  update: (id, data) => {
    return axiosClient.put(`/job-positions/${id}`, data);
  }
};

export default jobPositionApi;
