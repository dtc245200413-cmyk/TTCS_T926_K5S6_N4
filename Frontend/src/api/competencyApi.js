import axiosClient from './axiosClient';

const competencyApi = {
  // Lấy danh sách tiêu chí năng lực cho dropdown
  getAll: () => {
    return axiosClient.get('/competencies');
  },

  // Lấy chi tiết tiêu chí năng lực
  getById: (id) => {
    return axiosClient.get(`/competencies/${id}`);
  },

  // Thêm tiêu chí năng lực mới
  create: (data) => {
    return axiosClient.post('/competencies', data);
  }
};

export default competencyApi;
