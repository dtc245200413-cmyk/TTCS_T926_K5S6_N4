import axiosClient from './axiosClient';

const candidateEvaluationApi = {
  getAll: (params) => axiosClient.get('/candidate-evaluations', { params }),
  getById: (id) => axiosClient.get(`/candidate-evaluations/${id}`),
  recordDecision: (id, data) => axiosClient.post(`/candidate-evaluations/${id}/verified-decision`, data),
  addEvaluation: (id, data) => axiosClient.post(`/candidate-evaluations/${id}/evaluations`, data),
  createOffer: (id, data) => axiosClient.post(`/candidate-evaluations/${id}/offer`, data),
  seedSample: () => axiosClient.post('/candidate-evaluations/seed-sample')
};

export default candidateEvaluationApi;
