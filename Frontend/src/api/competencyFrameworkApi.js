import axiosClient from './axiosClient';

const competencyFrameworkApi = {
  getAll: (params) => {
    return axiosClient.get('/competency-frameworks', { params });
  },

  getById: (id) => {
    return axiosClient.get(`/competency-frameworks/${id}`);
  },

  create: (data) => {
    return axiosClient.post('/competency-frameworks', data);
  },

  update: (id, data) => {
    return axiosClient.put(`/competency-frameworks/${id}`, data);
  },

  delete: (id) => {
    return axiosClient.delete(`/competency-frameworks/${id}`);
  }
};

export default competencyFrameworkApi;
