import axiosClient from './axiosClient';

const interviewQuestionApi = {
  getAll: (params) => {
    return axiosClient.get('/interview-questions', { params });
  },

  getById: (id) => {
    return axiosClient.get(`/interview-questions/${id}`);
  },

  create: (data) => {
    return axiosClient.post('/interview-questions', data);
  },

  update: (id, data) => {
    return axiosClient.put(`/interview-questions/${id}`, data);
  },

  delete: (id) => {
    return axiosClient.delete(`/interview-questions/${id}`);
  },

  getCriteriaOptions: () => {
    return axiosClient.get('/interview-questions/criteria-options');
  }
};

export default interviewQuestionApi;
