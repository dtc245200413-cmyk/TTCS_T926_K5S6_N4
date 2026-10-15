import axiosClient from './axiosClient';

const candidateApi = {
  getAll: (params) => axiosClient.get('/candidates', { params }),
  getById: (id) => axiosClient.get(`/candidates/${id}`),
  create: (payload) => {
    if (payload instanceof FormData) {
      return axiosClient.post('/candidates', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return axiosClient.post('/candidates', payload);
  },
  updateStatus: (id, payload) => axiosClient.put(`/candidates/${id}/status`, payload),
  checkDuplicates: (params) => axiosClient.get('/candidates/duplicates', { params }),
  merge: (payload) => axiosClient.post('/candidates/merge', payload),
  getMerges: () => axiosClient.get('/candidates/merges'),
  undoMerge: (mergeId) => axiosClient.post(`/candidates/merges/${mergeId}/undo`, {}),
  downloadResume: (id) => axiosClient.get(`/candidates/${id}/resume`, { responseType: 'blob' }),

  getNotes: (id) => axiosClient.get(`/candidates/${id}/notes`),
  addNote: (id, content) => axiosClient.post(`/candidates/${id}/notes`, { content }),
  updateNote: (id, noteId, content) => axiosClient.put(`/candidates/${id}/notes/${noteId}`, { content }),

  getMasterData: () => axiosClient.get('/master-data'),
  getMyRequests: () => axiosClient.get('/recruitment-requests/my'),
  getPositions: () => axiosClient.get('/candidates/positions'),
};

export default candidateApi;
