/**
 * recruitmentRequestController.js
 */

const requestService = require('../services/recruitmentRequestService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const createRequest = async (req, res, next) => {
  try {
    const result = await requestService.createRequest(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Tạo yêu cầu tuyển dụng thành công.', result, 201);
  } catch (error) { next(error); }
};

const getMyRequests = async (req, res, next) => {
  try {
    const result = await requestService.getMyRequests(req.user.user_id, req.user.roles);
    return sendSuccess(res, 'Lấy danh sách thành công.', result);
  } catch (error) { next(error); }
};

const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requestRepo = require('../repositories/recruitmentRequestRepository');
    const result = await requestRepo.findById(id);
    if (!result) {
      return sendError(res, 'Yêu cầu không tồn tại.', 404);
    }
    return sendSuccess(res, 'Lấy thông tin chi tiết thành công.', result);
  } catch (error) { next(error); }
};

const getRequestsForApproval = async (req, res, next) => {
  try {
    const result = await requestService.getAllForApproval(req.user);
    return sendSuccess(res, 'Lấy danh sách chờ duyệt thành công.', result);
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    if (!['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(status)) {
      return sendError(res, 'Trạng thái không hợp lệ.', 400);
    }
    if ((status === 'REJECTED' || status === 'NEEDS_REVISION') && (!rejection_reason || !rejection_reason.trim())) {
      return sendError(res, status === 'REJECTED' ? 'Vui lòng cung cấp lý do từ chối.' : 'Vui lòng cung cấp lý do yêu cầu bổ sung.', 400);
    }
    
    const result = await requestService.updateRequestStatus(
      id,
      status,
      rejection_reason || null,
      req.user.user_id,
      getIp(req),
      req.user
    );
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', result);
  } catch (error) { next(error); }
};

const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await requestService.updateRequest(id, req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật yêu cầu tuyển dụng thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  createRequest,
  updateRequest,
  getMyRequests,
  getRequestById,
  getRequestsForApproval,
  updateStatus
};
