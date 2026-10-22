const service = require('../services/candidateEvaluationService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const getCandidates = async (req, res, next) => {
  try {
    const data = await service.getCandidates(req.user);
    return sendSuccess(res, 'Lấy danh sách ứng viên đánh giá thành công.', data);
  } catch (error) {
    next(error);
  }
};

const getCandidateDetail = async (req, res, next) => {
  try {
    const data = await service.getCandidateDetail(req.params.id, req.user);
    return sendSuccess(res, 'Lấy chi tiết điểm và đánh giá phỏng vấn thành công.', data);
  } catch (error) {
    next(error);
  }
};

const recordDecision = async (req, res, next) => {
  try {
    const data = await service.recordDecision(req.params.id, req.body, req.user, getIp(req));
    return sendSuccess(res, 'Xác nhận quyết định tuyển chọn của Trưởng bộ phận thành công.', data);
  } catch (error) {
    next(error);
  }
};

const recordVerifiedDecision = async (req, res, next) => {
  try {
    const data = await service.recordVerifiedDecision(req.params.id, req.body, req.user, getIp(req));
    return sendSuccess(res, 'Quyet dinh da duoc xac minh theo application va ghi audit.', data);
  } catch (error) { next(error); }
};

const createOffer = async (req, res, next) => {
  try {
    const data = await service.createOffer(req.params.id, req.body, req.user, getIp(req));
    return sendSuccess(res, 'Tạo Thư mời nhận việc (Offer) thành công.', data, 201);
  } catch (error) {
    next(error);
  }
};

const addEvaluation = async (req, res, next) => {
  try {
    const data = await service.addEvaluation(req.params.id, req.body, req.user, getIp(req));
    return sendSuccess(res, 'Nhập phiếu đánh giá phỏng vấn thành công.', data, 201);
  } catch (error) {
    next(error);
  }
};

const seedSampleData = async (req, res, next) => {
  try {
    const data = await service.seedSampleEvaluationData();
    return sendSuccess(res, 'Khởi tạo dữ liệu mẫu thành công.', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCandidates,
  getCandidateDetail,
  recordDecision,
  recordVerifiedDecision,
  createOffer,
  addEvaluation,
  seedSampleData
};
