import axiosClient from './axiosClient';

const candidateProfileApi = {
  // The existing Backend exposes basic candidate information through its list API.
  async getCandidate(id, signal) {
    const response = await axiosClient.get('/candidates', { signal });
    if (!Array.isArray(response.data.data)) throw new Error('Dữ liệu hồ sơ không hợp lệ.');
    const candidate = response.data.data.find(item => String(item.id) === String(id));
    if (!candidate) {
      const error = new Error('Không tìm thấy ứng viên');
      error.response = { status: 404 };
      throw error;
    }
    return candidate;
  },
  getSources: signal => axiosClient.get('/master-data', { params: { group: 'CANDIDATE_SOURCE' }, signal }),
  getTagOptions: signal => axiosClient.get('/master-data', { params: { group: 'CANDIDATE_TAG' }, signal }),
  getTags: (id, signal) => axiosClient.get(`/candidates/${id}/tags`, { signal }),
  addTag: (id, tagId, signal) => axiosClient.post(`/candidates/${id}/tags`, { tag_id: tagId }, { signal }),
  removeTag: (id, tagId, signal) => axiosClient.delete(`/candidates/${id}/tags/${tagId}`, { signal }),
  getNotes: (id, signal) => axiosClient.get(`/candidates/${id}/profile-notes`, { signal }),
  addNote: (id, content, signal) => axiosClient.post(`/candidates/${id}/profile-notes`, { note_content: content }, { signal }),
};

export default candidateProfileApi;
