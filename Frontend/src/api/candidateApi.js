import axiosClient from './axiosClient';

const candidateApi = {
  getAll: (params) => axiosClient.get('/candidates', { params }),
  getById: (id) => axiosClient.get(`/candidates/${id}`),
  getUnifiedProfile: (id) => axiosClient.get(`/candidates/${id}/unified-profile`),
  create: (payload) => {
    if (payload instanceof FormData) {
      return axiosClient.post('/candidates', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return axiosClient.post('/candidates', payload);
  },
  updateStatus: (id, status, rejectionReasonCode) => {
    const payload = typeof status === 'object' ? status : { status, rejection_reason_code: rejectionReasonCode };
    return axiosClient.put(`/candidates/${id}/status`, payload);
  },
  checkDuplicates: (params) => axiosClient.get('/candidates/duplicates', { params }),
  merge: (payload) => axiosClient.post('/candidates/merge', payload),
  getMerges: () => axiosClient.get('/candidates/merges'),
  undoMerge: (mergeId) => axiosClient.post(`/candidates/merges/${mergeId}/undo`, {}),
  downloadResume: (id) => axiosClient.get(`/candidates/${id}/resume`, { responseType: 'blob' }),

  getNotes: (id) => axiosClient.get(`/candidates/${id}/notes`),
  addNote: (id, noteContent) => {
    const payload = typeof noteContent === 'object' ? noteContent : { content: noteContent, note_content: noteContent };
    return axiosClient.post(`/candidates/${id}/notes`, payload);
  },
  updateNote: (id, noteId, content) => axiosClient.put(`/candidates/${id}/notes/${noteId}`, { content }),

  updateStage: (id, stageCode, note) => axiosClient.put(`/candidates/${id}/stage`, { stage_code: stageCode, note }),
  updateRating: (id, rating) => axiosClient.put(`/candidates/${id}/rating`, { rating }),
  getRatings: (id, signal) => axiosClient.get(`/candidates/${id}/ratings`, { signal }),
  saveMyRating: (id, { rating, comment }) => axiosClient.put(`/candidates/${id}/ratings/me`, { rating, comment }),
  updateTags: (id, tags) => axiosClient.put(`/candidates/${id}/tags`, { tags }),
  toggleTalentPool: (id, isTalentPool) => axiosClient.put(`/candidates/${id}/talent-pool`, { is_talent_pool: isTalentPool }),
  uploadCv: (id, file) => {
    const formData = new FormData();
    formData.append('cv', file);
    return axiosClient.post(`/candidates/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getMasterData: () => axiosClient.get('/master-data'),
  getMyRequests: () => axiosClient.get('/recruitment-requests/my'),
  getPositions: () => axiosClient.get('/candidates/positions')
};

export default candidateApi;
