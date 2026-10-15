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
    const result = await candidateService.getAllCandidates(req.user, req.query);
    return sendSuccess(res, 'Lấy danh sách ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const getUnifiedProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await candidateService.getUnifiedProfile(id, req.user, getIp(req));
    return sendSuccess(res, 'Lấy thông tin hồ sơ ứng viên hợp nhất thành công.', result);
  } catch (error) { next(error); }
};

const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note_content } = req.body;
    const result = await candidateService.addCandidateNote(id, note_content, req.user, getIp(req));
    return sendSuccess(res, 'Thêm ghi chú thành công.', result, 201);
  } catch (error) { next(error); }
};

const updateStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage_code, note } = req.body;
    const result = await candidateService.updateCandidateStage(id, stage_code, note, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật giai đoạn ứng tuyển thành công.', result);
  } catch (error) { next(error); }
};

const updateRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const result = await candidateService.updateCandidateRating(id, rating, req.user, getIp(req));
    return sendSuccess(res, 'Đánh giá ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const updateTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const result = await candidateService.updateCandidateTags(id, tags, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật nhãn phân loại thành công.', result);
  } catch (error) { next(error); }
};

const toggleTalentPool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_talent_pool } = req.body;
    const result = await candidateService.toggleCandidateTalentPool(id, is_talent_pool, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật kho ứng viên tiềm năng thành công.', result);
  } catch (error) { next(error); }
};

const uploadCv = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return sendError(res, 'Vui lòng chọn tệp CV để tải lên.', 400);
    }
    const cvFilePath = `/uploads/cvs/${req.file.filename}`;
    const result = await candidateService.updateCandidateCv(id, cvFilePath, req.user, getIp(req));
    return sendSuccess(res, 'Tải lên CV thành công.', { cv_file_path: cvFilePath, candidate: result });
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
  getUnifiedProfile,
  addNote,
  updateStage,
  updateRating,
  updateTags,
  toggleTalentPool,
  uploadCv,
  updateStatus
};
