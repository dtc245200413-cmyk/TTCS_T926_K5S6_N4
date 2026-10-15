import axiosClient from './axiosClient';

const interviewScheduleApi = {
  getAll: (params = {}, signal) => axiosClient.get('/interview-schedules', { params, signal }),
  getOptions: signal => axiosClient.get('/interview-schedules/options', { signal }),
  getById: (id, signal) => axiosClient.get(`/interview-schedules/${id}`, { signal }),
  create: (data, signal) => axiosClient.post('/interview-schedules', data, { signal }),
  update: (id, data, signal) => axiosClient.patch(`/interview-schedules/${id}`, data, { signal }),
  cancel: (id, signal) => axiosClient.patch(`/interview-schedules/${id}/cancel`, {}, { signal }),
};

export default interviewScheduleApi;
