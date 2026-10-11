/**
 * recruitmentRequestController.js
 */

const requestService = require('../services/recruitmentRequestService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

// Keep the existing frontend contract at the HTTP boundary only.
function toRequestData(body) {
  return {
    ...body,
    date_needed: body.date_needed !== undefined ? body.date_needed : body.needed_by_date,
    proposed_min_salary: body.proposed_min_salary !== undefined ? body.proposed_min_salary : body.proposed_salary_min,
    proposed_max_salary: body.proposed_max_salary !== undefined ? body.proposed_max_salary : body.proposed_salary_max,
    requirements: body.requirements !== undefined ? body.requirements : body.candidate_requirements
  };
}

function toResponse(request) {
  return {
    ...request,
    id: request.requisition_id,
    needed_by_date: request.date_needed,
    proposed_salary_min: request.proposed_min_salary,
    proposed_salary_max: request.proposed_max_salary,
    candidate_requirements: request.requirements
  };
}

const createRequest = async (req, res, next) => {
  try {
    const result = await requestService.createRequest(toRequestData(req.body), req.user.user_id, getIp(req));
    return sendSuccess(res, 'Tạo yêu cầu tuyển dụng thành công.', toResponse(result), 201);
  } catch (error) { next(error); }
};

const getMyRequests = async (req, res, next) => {
  try {
    const result = await requestService.getMyRequests(req.user.user_id, req.user.permissions);
    return sendSuccess(res, 'Lấy danh sách thành công.', result.map(toResponse));
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
    if (result.created_by !== req.user.user_id && !req.user.permissions.includes('RECRUITMENT_REQUEST_VIEW_ALL')) {
      return sendError(res, 'Bạn không có quyền xem yêu cầu này.', 403);
    }
    return sendSuccess(res, 'Lấy thông tin chi tiết thành công.', toResponse(result));
  } catch (error) { next(error); }
};

const getRequestsForApproval = async (req, res, next) => {
  try {
    const result = await requestService.getAllForApproval();
    return sendSuccess(res, 'Lấy danh sách chờ duyệt thành công.', result.map(toResponse));
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await requestService.updateRequestStatus(id, req.body, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', toResponse(result));
  } catch (error) { next(error); }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestById,
  getRequestsForApproval,
  updateStatus
};
