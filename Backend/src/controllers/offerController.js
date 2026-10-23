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

// Rollout compatibility: a teammate may pull the new code before running the
// reviewed Offer migration. Do not leak raw MySQL diagnostics or claim success.
function handleOfferReadError(error, res, next) {
  if (error.code === 'OFFER_SCHEMA_NOT_READY') {
    return res.status(503).json({
      success: false,
      code: 'OFFER_SCHEMA_NOT_READY',
      message: 'Cơ sở dữ liệu chưa được cập nhật cho chức năng Offer. Vui lòng liên hệ người quản trị.',
    });
  }
  return next(error);
}

const getAllOffers = async (req, res, next) => {
  try {
    const data = await offerService.getAllOffers(req.query, req.user);
    return sendSuccess(res, 'Lấy danh sách Offer thành công', data);
  } catch (error) {
    return handleOfferReadError(error, res, next);
  }
};

const getOfferById = async (req, res, next) => {
  try {
    const data = await offerService.getOfferById(req.params.id, req.user);
    return sendSuccess(res, 'Lấy chi tiết Offer thành công', data);
  } catch (error) {
    return handleOfferReadError(error, res, next);
  }
};

const assignApprover = async (req, res, next) => {
  try {
    const data = await offerService.assignApprover(
      req.params.id, req.body?.approver_id, req.user, req.get('If-Match'));
    return sendSuccess(res, 'Da ghi nhan nguoi duyet Offer', data);
  } catch (error) { return handleDraftError(error, res, next); }
};

const submitOffer = async (req, res, next) => {
  try {
    const data = await offerService.submitOffer(req.params.id, req.user, req.get('If-Match'));
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

// Atomic approval endpoint. Calls offerService to update status and record in offer_approvals.
const decideAtomic = async (req, res, next) => {
  try {
    const data = await offerService.processApproval(req.params.id, {
      action: req.body?.action,
      reason: req.body?.reason
    }, req.user);
    return sendSuccess(res, 'Đã xử lý phê duyệt Offer thành công', data);
  } catch (error) { return next(error); }
};

const getApprovalDetail = async (req, res, next) => {
  try {
    const data = await offerService.getOfferById(req.params.id, req.user);
    return sendSuccess(res, 'Chi tiết Offer được phân công', data);
  } catch (error) { return next(error); }
};

const getApprovalInbox = async (req, res, next) => {
  try {
    const data = await offerService.getAllOffers({ status: 'PENDING_APPROVAL' }, req.user);
    return sendSuccess(res, 'Danh sách Offer được phân công phê duyệt', data);
  } catch (error) { return next(error); }
};

const getEligibility = async (req, res) => {
  try {
    const data = await offerService.getEligibility(req.query, req.user);
    return sendSuccess(res, 'Kết quả kiểm tra điều kiện soạn Offer', data);
  } catch (error) {
    const status = [400, 401, 403, 503].includes(error.statusCode) ? error.statusCode : 500;
    const codes = { 400: 'INVALID_ELIGIBILITY_QUERY', 401: 'AUTHENTICATION_REQUIRED', 403: 'ELIGIBILITY_ACCESS_DENIED', 500: 'ELIGIBILITY_CHECK_FAILED' };
    const known = error.code === 'OFFER_ELIGIBILITY_DEPENDENCY_UNAVAILABLE';
    return res.status(status).json({ success: false,
      message: status === 503 ? 'Chức năng kiểm tra điều kiện Offer đang chờ hoàn thiện dependency Backend hoặc cơ sở dữ liệu.' : 'Không thể xác minh điều kiện soạn Offer cho yêu cầu này.',
      data: { eligible: false, reason_code: known ? error.code : codes[status], permissions: { can_create: false }, applications: [], next_cursor: null },
    });
  }
};


const publishOffer = async (req, res, next) => {
  try {
    const data = await offerService.publishOffer(req.params.id, req.user, req.get('If-Match'));
    return sendSuccess(res, 'Đã phát hành Offer tới cổng ứng viên.', data);
  } catch (error) { return handleDraftError(error, res, next); }
};
const getOnboardings = async (req, res, next) => {
  try {
    const data = await offerService.getOnboardings(req.user);
    return sendSuccess(res, 'Danh sách tiếp nhận nhân viên.', data);
  } catch (error) { return handleOfferReadError(error, res, next); }
};

module.exports = {
  unavailableApprovalExtension(req, res, next) {
    try {
      offerService.unavailableApprovalExtension(req.user);
    } catch (error) { return handleDraftError(error, res, next); }
  },
  getEligibility,
  publishOffer,
  getOnboardings,
  createDraft,
  updateDraft,
  getAllOffers,
  getOfferById,
  submitOffer,
  assignApprover,
  processApproval,
  decideAtomic,
  getApprovalInbox,
  getApprovalDetail
};
