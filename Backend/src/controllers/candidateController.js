const candidateService = require('../services/candidateService');
const { sendSuccess, sendError } = require('../utils/response');
const path = require('path');
const fs = require('fs');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const createCandidate = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.resume_url = req.file.filename;
    }
    const result = await candidateService.createCandidate(
      payload,
      req.user.user_id,
      getIp(req),
      req.body.allow_duplicate === true || req.body.allow_duplicate === 'true'
    );
    return sendSuccess(res, 'Tạo ứng viên thành công.', result, 201);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, duplicates: error.duplicates || [] });
    }
    if (error.statusCode === 400 && error.errors) {
      return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    next(error);
  }
};

const getAvailablePositions = async (req, res, next) => {
  try {
    const result = await candidateService.getAvailablePositions();
    return sendSuccess(res, 'Lấy danh sách vị trí thành công.', result);
  } catch (error) { next(error); }
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
    if (!filename) {
      return sendError(res, 'Hồ sơ này chưa có CV đính kèm.', 404);
    }
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return res.redirect(filename);
    }
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../../private_uploads/resumes', safeFilename);
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Tệp CV không tồn tại trên hệ thống.', 404);
    }
    return res.download(filePath, safeFilename);
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
    const result = await candidateService.listCandidates(req.query, req.user);
    return sendSuccess(res, 'Lấy danh sách thành công.', result);
  } catch (error) { next(error); }
};

const getCandidateDetail = async (req, res, next) => {
  try {
    const result = await candidateService.getCandidateDetail(req.params.id);
    return sendSuccess(res, 'Lấy chi tiết ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const getNotes = async (req, res, next) => {
  try {
    const result = await candidateService.getCandidateNotes(req.params.id);
    return sendSuccess(res, 'Lấy ghi chú thành công.', result);
  } catch (error) { next(error); }
};

const noteErrorResponse = (error, res, next) => {
  if (error.statusCode === 400 && error.errors) {
    return res.status(400).json({ success: false, message: error.message, errors: error.errors });
  }
  return next(error);
};

const addNote = async (req, res, next) => {
  try {
    const result = await candidateService.addCandidateNote(req.params.id, req.body.content, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Thêm ghi chú thành công.', result, 201);
  } catch (error) { noteErrorResponse(error, res, next); }
};

const updateNote = async (req, res, next) => {
  try {
    const result = await candidateService.updateCandidateNote(req.params.id, req.params.noteId, req.body.content, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật ghi chú thành công.', result);
  } catch (error) { noteErrorResponse(error, res, next); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason_code, rejection_reason } = req.body;
    
    const result = await candidateService.updateCandidateStatus(
      id,
      status,
      rejection_reason_code || null,
      rejection_reason || null,
      req.user.user_id,
      getIp(req)
    );
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
  downloadResume,
  getCandidateDetail,
  getNotes,
  addNote,
  updateNote,
  getAvailablePositions
};
