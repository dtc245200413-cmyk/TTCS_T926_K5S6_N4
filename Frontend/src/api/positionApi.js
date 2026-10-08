import axiosClient from './axiosClient';

const positionApi = {
  getAll: (params) => {
    return axiosClient.get('/positions', { params });
  },
  getById: (id) => {
    return axiosClient.get(`/positions/${id}`);
  },
  create: (data) => {
    return axiosClient.post('/positions', data);
  },
  update: (id, data) => {
    return axiosClient.put(`/positions/${id}`, data);
  },
  delete: (id) => {
    return axiosClient.delete(`/positions/${id}`);
  },
  validateOffer: (id, proposedSalary) => {
    return axiosClient.post(`/positions/${id}/validate-offer`, {
      proposed_salary: proposedSalary,
    });
  },
};

export default positionApi;
