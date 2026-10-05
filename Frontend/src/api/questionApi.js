import axiosClient from './axiosClient';

const questionApi = {
  // Lấy danh sách câu hỏi có phân trang, tìm kiếm, lọc
  getAll: (params) => {
    return axiosClient.get('/questions', { params });
  },

  // Lấy chi tiết một câu hỏi
  getById: (id) => {
    return axiosClient.get(`/questions/${id}`);
  },

  // Thêm câu hỏi mới
  create: (data) => {
    return axiosClient.post('/questions', data);
  },

  // Cập nhật câu hỏi
  update: (id, data) => {
    return axiosClient.put(`/questions/${id}`, data);
  },

  // Xóa câu hỏi
  delete: (id) => {
    return axiosClient.delete(`/questions/${id}`);
  },

  // Lấy danh sách tiêu chí năng lực
  getCriteria: () => {
    return axiosClient.get('/questions/criteria');
  },

  // Lấy thống kê nhanh
  getStats: () => {
    return axiosClient.get('/questions/stats');
  },
};

export default questionApi;
