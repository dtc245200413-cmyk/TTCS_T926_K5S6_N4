import axiosClient from './axiosClient';

const competencyApi = {
  // Lấy toàn bộ danh sách khung năng lực từ BE
  getAll: () => axiosClient.get('/competencies'),

  // Thêm mới 1 khung năng lực kèm danh sách tiêu chí sang BE
  create: (data) => axiosClient.post('/competencies', data),

  // Xóa khung năng lực theo ID
  delete: (id) => axiosClient.delete(`/competencies/${id}`)
};

export default competencyApi;