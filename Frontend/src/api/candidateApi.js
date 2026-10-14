import axiosClient from './axiosClient';

const candidateApi = {
  getAll: () => axiosClient.get('/candidates'),
  updateStatus: (id, data) => axiosClient.put(`/candidates/${id}/status`, data),
  getRatings: (id, signal) => axiosClient.get(`/candidates/${id}/ratings`, { signal }),
  saveMyRating: (id, { rating, comment }) =>
    axiosClient.put(`/candidates/${id}/ratings/me`, { rating, comment }),
};

export default candidateApi;
