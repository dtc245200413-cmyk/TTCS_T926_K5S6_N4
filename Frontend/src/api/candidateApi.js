import axiosClient from './axiosClient';

const candidateApi = {
<<<<<<< HEAD
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
=======
  getAll: (params) => {
    return axiosClient.get('/candidates', { params });
  },

  getUnifiedProfile: (id) => {
    return axiosClient.get(`/candidates/${id}/unified-profile`);
  },

  addNote: (id, noteContent) => {
    return axiosClient.post(`/candidates/${id}/notes`, { note_content: noteContent });
  },

  updateStage: (id, stageCode, note) => {
    return axiosClient.put(`/candidates/${id}/stage`, { stage_code: stageCode, note });
  },

  updateRating: (id, rating) => {
    return axiosClient.put(`/candidates/${id}/rating`, { rating });
  },

  getRatings: (id, signal) => {
    return axiosClient.get(`/candidates/${id}/ratings`, { signal });
  },

  saveMyRating: (id, { rating, comment }) => {
    return axiosClient.put(`/candidates/${id}/ratings/me`, { rating, comment });
  },

  updateTags: (id, tags) => {
    return axiosClient.put(`/candidates/${id}/tags`, { tags });
  },

  toggleTalentPool: (id, isTalentPool) => {
    return axiosClient.put(`/candidates/${id}/talent-pool`, { is_talent_pool: isTalentPool });
  },

  uploadCv: (id, file) => {
    const formData = new FormData();
    formData.append('cv', file);
    return axiosClient.post(`/candidates/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updateStatus: (id, status, rejectionReasonCode) => {
    const payload = typeof status === 'object' ? status : { status, rejection_reason_code: rejectionReasonCode };
    return axiosClient.put(`/candidates/${id}/status`, payload);
  }
>>>>>>> 27c5b55ac5c2c5fd3de79a2e5637d3ea01e18e22
};

export default candidateApi;
