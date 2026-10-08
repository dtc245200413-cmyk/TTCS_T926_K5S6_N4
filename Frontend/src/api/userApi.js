import axiosClient from './axiosClient';

const userApi = {
  getAll: (params) => {
    return axiosClient.get('/users', { params });
  },

  getById: (id) => {
    return axiosClient.get(`/users/${id}`);
  },

  // SCRUM-58: Self-profile endpoints (no admin permission required)
  getMe: () => {
    return axiosClient.get('/users/me');
  },

  updateMe: (data) => {
    return axiosClient.put('/users/me', data);
  },

  create: (data) => {
    return axiosClient.post('/users', data);
  },

  update: (id, data) => {
    return axiosClient.put(`/users/${id}`, data);
  },

  // PART 3 ENDPOINTS
  getRoles: (id) => {
    return axiosClient.get(`/users/${id}/roles`);
  },

  assignRole: (id, roleId) => {
    return axiosClient.post(`/users/${id}/roles`, { roleId });
  },

  revokeRole: (id, roleId) => {
    return axiosClient.delete(`/users/${id}/roles/${roleId}`);
  },

  lockAccount: (id, reason, handoverUserId) => {
    return axiosClient.patch(`/users/${id}/lock`, { reason, handoverUserId });
  },

  unlockAccount: (id) => {
    return axiosClient.patch(`/users/${id}/unlock`);
  }
};

export default userApi;
