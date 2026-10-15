import axiosClient from './axiosClient';

const candidateApi = {
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
};

export default candidateApi;
