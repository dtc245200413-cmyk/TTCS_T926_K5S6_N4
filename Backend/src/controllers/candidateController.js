const candidateService = require('../services/candidateService');
const { sendSuccess, sendError } = require('../utils/response');
const path = require('path');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const createCandidate = async (req, res, next) => {
  try {
    const result = await candidateService.createCandidate(
      req.body,
      req.user.user_id,
      getIp(req),
      req.body.allow_duplicate === true
    );
    return sendSuccess(res, 'Tạo ứng viên thành công.', result, 201);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, duplicates: error.duplicates || [] });
    }
    next(error);
  }
};

const findDuplicates = async (req, res, next) => {
  try {
    const result = await candidateService.findPotentialDuplicates({
      email: req.query.email,
      phone: req.query.phone,
      candidateId: req.query.candidate_id
    });
    return sendSuccess(res, 'Kiểm tra hồ sơ trùng thành công.', result);
  } catch (error) { next(error); }
};

const mergeCandidates = async (req, res, next) => {
  try {
    const { primary_id, secondary_id, chosen_fields } = req.body;
    if (!primary_id || !secondary_id) return sendError(res, 'Cần chọn hồ sơ chính và hồ sơ trùng.', 400);
    const result = await candidateService.mergeCandidates(primary_id, secondary_id, chosen_fields, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Đã gộp hồ sơ và giữ lại lịch sử.', result);
  } catch (error) { next(error); }
};

const getActiveMerges = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy lịch sử gộp có thể hoàn tác thành công.', await candidateService.getActiveMerges());
  } catch (error) { next(error); }
};

const downloadResume = async (req, res, next) => {
  try {
    const filename = await candidateService.getCandidateResume(req.params.id);
    const safeFilename = path.basename(filename);
    return res.download(path.join(__dirname, '../../private_uploads/resumes', safeFilename));
  } catch (error) { next(error); }
};

const undoMerge = async (req, res, next) => {
  try {
    const result = await candidateService.undoCandidateMerge(req.params.mergeId, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Đã hoàn tác gộp hồ sơ.', result);
  } catch (error) { next(error); }
};

const getAllCandidates = async (req, res, next) => {
  try {
    const result = await candidateService.getAllCandidates(req.user);
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
  updateStatus,
  findDuplicates,
  mergeCandidates,
  getActiveMerges,
  undoMerge,
  downloadResume
};
