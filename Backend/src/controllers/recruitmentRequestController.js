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
    const result = await requestService.getAllForApproval();
    return sendSuccess(res, 'Lấy danh sách chờ duyệt thành công.', result);
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    if (status === 'REJECTED' && !rejection_reason) {
      return sendError(res, 'Vui lòng cung cấp lý do từ chối.', 400);
    }
    
    const result = await requestService.updateRequestStatus(id, status, rejection_reason || null, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestsForApproval,
  updateStatus
};
