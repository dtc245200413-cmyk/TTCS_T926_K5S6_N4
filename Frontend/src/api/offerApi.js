import axiosClient from './axiosClient';

export const OFFER_UNAVAILABLE = 'Chức năng lưu/gửi Offer đang chờ hoàn thiện Backend hoặc cơ sở dữ liệu';
export const ELIGIBILITY_PENDING = 'Đang chờ Backend xác nhận điều kiện soạn Offer và danh sách hồ sơ đủ điều kiện.';

export function offerErrorMessage(error) {
  const status = error.response?.status;
  if (status === 503 && error.response?.data?.code === 'OFFER_SCHEMA_NOT_READY') {
    return 'Cơ sở dữ liệu chưa được cập nhật cho chức năng Offer. Vui lòng liên hệ người quản trị.';
  }
  const messages = {
    400: 'Dữ liệu Offer chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.',
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không đủ quyền truy cập hoặc thao tác Offer này.',
    404: 'Không tìm thấy Offer.',
    409: 'Offer đã thay đổi hoặc đã có Offer hiệu lực cho hồ sơ này. Vui lòng tải lại.',
    422: 'Offer chưa đủ điều kiện gửi duyệt. Vui lòng kiểm tra các trường bắt buộc và quyết định tuyển dụng của hồ sơ.',
    428: 'Thiếu phiên bản cập nhật hợp lệ. Vui lòng tải lại Offer.',
    503: OFFER_UNAVAILABLE,
  };
  // Only validation errors may add server-provided field details.
  if (status === 400 && typeof error.response?.data?.message === 'string') {
    return `${messages[400]} ${error.response.data.message}`;
  }
  return messages[status] || 'Không thể hoàn tất thao tác Offer. Vui lòng thử lại.';
}

export function validOfferVersion(version) {
  return ['string', 'number'].includes(typeof version) &&
    /^[1-9]\d*$/.test(String(version)) && Number.isSafeInteger(Number(version));
}

const offerApi = {
  // PR #35 view shares the same scoped Backend and closed approval workflow.
  getOffers: (params) => axiosClient.get('/offers', { params }),
  getOfferById: (id) => axiosClient.get(`/offers/${encodeURIComponent(id)}`),
  // Explicit assignment-only views; the ordinary creator list is not an approver inbox.
  getApprovalInbox: () => axiosClient.get('/offers/approval-inbox'),
  getApprovalDetail: (id) => axiosClient.get(`/offers/${encodeURIComponent(id)}/approval-detail`),
  decideAtomic: (id, action, reason, version) => {
    if (!validOfferVersion(version)) return Promise.reject({ response: { status: 428 } });
    return axiosClient.post(`/offers/${encodeURIComponent(id)}/decide-atomic`,
      { action, reason }, { headers: { 'If-Match': `"${version}"` } });
  },

  approveOffer: (id, data) => axiosClient.post(`/offers/${encodeURIComponent(id)}/approve`, data),
  rejectOffer: (id, data) => axiosClient.post(`/offers/${encodeURIComponent(id)}/reject`, data),
  requestChangeOffer: (id, data) => axiosClient.post(`/offers/${encodeURIComponent(id)}/request-change`, data),
  publishOffer: (id) => axiosClient.post(`/offers/${encodeURIComponent(id)}/publish`),
  getOnboardings: () => axiosClient.get('/offers/onboardings'),
  getById: (id) => axiosClient.get(`/offers/${encodeURIComponent(id)}`),
  create: (payload) => axiosClient.post('/offers', payload),
  update: (id, payload, version) => {
    if (!validOfferVersion(version)) return Promise.reject({ response: { status: 428 } });
    return axiosClient.patch(`/offers/${encodeURIComponent(id)}`, payload, {
      headers: { 'If-Match': `"${version}"` },
    });
  },
  submit: (id, version) => {
    if (!validOfferVersion(version)) return Promise.reject({ response: { status: 428 } });
    return axiosClient.post(`/offers/${encodeURIComponent(id)}/submit`, {}, {
      headers: { 'If-Match': `"${version}"` },
    });
  },
  getCreationOptions: async (params = {}) => {
    const response = await axiosClient.get('/offers/eligibility', { params });
    const data = response.data?.data;
    if (response.data?.success !== true || typeof data?.eligible !== 'boolean' || !Array.isArray(data.applications)) {
      throw new Error('Invalid eligibility response');
    }
    const allowed = data.eligible === true && data.permissions?.can_create === true;
    return {
      available: true, eligible: allowed, reason_code: data.reason_code, reason: data.reason,
      next_cursor: data.next_cursor,
      applications: data.applications.map(item => ({
        eligible: allowed && item.eligible === true && item.permissions?.can_create === true &&
          validOfferVersion(item.candidate?.id) && validOfferVersion(item.application?.id),
        application_id: item.application?.id, application_name: item.application?.code,
        candidate_name: item.candidate?.name, position_id: item.position?.id,
        position_name: item.position?.name, department_name: item.department?.name,
        reason_code: item.reason_code, reason: item.reason,
        prefill: { job_title: typeof item.prefill?.job_title === 'string' ? item.prefill.job_title : '' },
      })),
    };
  },
};

export default offerApi;
