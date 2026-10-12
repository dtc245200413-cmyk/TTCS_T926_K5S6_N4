import axiosClient from './axiosClient';

export default {
  getAll: (year, config = {}) => axiosClient.get('/department-budgets', { ...config, params: { year } }),
  save: (departmentId, year, data) => axiosClient.put(`/department-budgets/${departmentId}/${year}`, data),
  availability: (departmentId, year, config = {}) => axiosClient.get(`/department-budgets/${departmentId}/${year}/availability`, config),
};
