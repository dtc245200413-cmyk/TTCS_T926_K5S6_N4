import axiosClient from './axiosClient';

const interviewEvaluationApi = {
  getBySchedule: (scheduleId, signal) =>
    axiosClient.get(`/interview-evaluations/schedule/${scheduleId}`, { signal }),
  submit: (data) =>
    axiosClient.post('/interview-evaluations', data),
  getById: (id, signal) =>
    axiosClient.get(`/interview-evaluations/${id}`, { signal }),
  getByCandidate: (candidateId, signal) =>
    axiosClient.get(`/interview-evaluations/candidate/${candidateId}`, { signal })
};

export default interviewEvaluationApi;
