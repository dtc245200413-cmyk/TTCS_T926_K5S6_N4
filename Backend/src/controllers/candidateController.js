const candidateService = require('../services/candidateService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const createCandidate = async (req, res, next) => {
  try {
    const result = await candidateService.createCandidate(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Tạo ứng viên thành công.', result, 201);
  } catch (error) { next(error); }
};

const getAllCandidates = async (req, res, next) => {
  try {
    const result = await candidateService.getAllCandidates();
    return sendSuccess(res, 'Lấy danh sách thành công.', result);
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason_code } = req.body;
    
    const result = await candidateService.updateCandidateStatus(id, status, rejection_reason_code || null, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  updateStatus
};
