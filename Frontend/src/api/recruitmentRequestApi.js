import axiosClient from './axiosClient';

export default {
  getMy: (config = {}) => axiosClient.get('/recruitment-requests/my', config),
  getApprovals: (config = {}) => axiosClient.get('/recruitment-requests/approvals', config),
  getById: (id, config = {}) => axiosClient.get(`/recruitment-requests/${id}`, config),
  create: data => axiosClient.post('/recruitment-requests', data),
  decide: (id, data) => axiosClient.patch(`/recruitment-requests/${id}/status`, data),
};
