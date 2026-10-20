const offerService = require('../services/offerService');
const { sendSuccess, sendError } = require('../utils/response');

function handleDraftError(error, res, next) {
  // Only this known dependency error gets a public 503 explanation; unexpected
  // SQL errors still use the existing generic error handler.
  if (error.code === 'OFFER_DRAFT_DEPENDENCY_UNAVAILABLE') {
    return sendError(res, 'Chức năng ghi Offer chưa được kích hoạt: cần xác nhận schema, hồ sơ tuyển dụng và nguồn quyết định Đạt.', 503);
  }
  return next(error);
}

const createDraft = async (req, res, next) => {
  try {
    const data = await offerService.createDraft(req.body, req.user);
    return sendSuccess(res, 'Lưu nháp Offer thành công', data, 201);
  } catch (error) {
    return handleDraftError(error, res, next);
  }
};

const updateDraft = async (req, res, next) => {
  try {
    const data = await offerService.updateDraft(req.params.id, req.body, req.user, req.get('If-Match'));
    return sendSuccess(res, 'Cập nhật nháp Offer thành công', data);
  } catch (error) {
    return handleDraftError(error, res, next);
  }
};

const getAllOffers = async (req, res, next) => {
  try {
    const data = await offerService.getAllOffers(req.query, req.user);
    return sendSuccess(res, 'Lấy danh sách Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

const getOfferById = async (req, res, next) => {
  try {
    const data = await offerService.getOfferById(req.params.id, req.user);
    return sendSuccess(res, 'Lấy chi tiết Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

const submitOffer = async (req, res, next) => {
  try {
    const data = await offerService.submitOffer(req.params.id, req.user);
    return sendSuccess(res, 'Gửi duyệt Offer thành công', data);
  } catch (error) {
    return handleDraftError(error, res, next);
  }
};

const processApproval = async (req, res, next) => {
  try {
    const data = await offerService.processApproval(req.params.id, req.body, req.user);
    return sendSuccess(res, 'Xử lý phê duyệt Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDraft,
  updateDraft,
  getAllOffers,
  getOfferById,
  submitOffer,
  processApproval
};
