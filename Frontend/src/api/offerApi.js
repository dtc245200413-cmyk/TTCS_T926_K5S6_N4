import axiosClient from './axiosClient';

export const OFFER_UNAVAILABLE = 'Chức năng lưu/gửi Offer đang chờ hoàn thiện Backend hoặc cơ sở dữ liệu';
export const ELIGIBILITY_PENDING = 'Đang chờ Backend xác nhận điều kiện soạn Offer và danh sách hồ sơ đủ điều kiện.';

export function offerErrorMessage(error) {
  const status = error.response?.status;
  const messages = {
    400: 'Dữ liệu Offer chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.',
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không đủ quyền truy cập hoặc thao tác Offer này.',
    404: 'Không tìm thấy Offer.',
    409: 'Offer đã thay đổi hoặc đã có Offer hiệu lực cho hồ sơ này. Vui lòng tải lại.',
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
  getById: (id) => axiosClient.get(`/offers/${encodeURIComponent(id)}`),
  create: (payload) => axiosClient.post('/offers', payload),
  update: (id, payload, version) => {
    if (!validOfferVersion(version)) return Promise.reject({ response: { status: 428 } });
    return axiosClient.patch(`/offers/${encodeURIComponent(id)}`, payload, {
      headers: { 'If-Match': `"${version}"` },
    });
  },
  submit: (id) => axiosClient.post(`/offers/${encodeURIComponent(id)}/submit`),
  // No eligibility endpoint exists yet. Do not call /offers/eligibility:
  // the current router would interpret "eligibility" as an Offer ID.
  // This is a view adapter, NOT an agreed HTTP contract. A future adapter must
  // map an authenticated Backend eligibility response to verified applications.
  getCreationOptions: async () => ({ available: false, applications: [], message: ELIGIBILITY_PENDING }),
};

export default offerApi;
