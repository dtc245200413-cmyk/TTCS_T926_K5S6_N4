import axiosClient from './axiosClient';

const departmentApi = {
  getAll() {
    return axiosClient.get('/departments');
  },

  getById(id) {
    return axiosClient.get(`/departments/${id}`);
  },

  create(data) {
    return axiosClient.post('/departments', data);
  },

  update(id, data) {
    return axiosClient.put(`/departments/${id}`, data);
  },

  deactivate(id) {
    return axiosClient.patch(`/departments/${id}/deactivate`);
  },

  activate(id) {
    return axiosClient.patch(`/departments/${id}/activate`);
  },

  remove(id) {
    return axiosClient.delete(`/departments/${id}`);
  },
};

export default departmentApi;