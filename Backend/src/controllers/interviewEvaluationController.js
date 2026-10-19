const service = require('../services/interviewEvaluationService');
const { sendSuccess } = require('../utils/response');

async function getBySchedule(req, res, next) {
  try {
    const data = await service.getEvaluationFormBySchedule(req.params.scheduleId, req.user);
    return sendSuccess(res, 'Lấy thông tin phiếu đánh giá thành công.', data);
  } catch (error) {
    next(error);
  }
}

async function submit(req, res, next) {
  try {
    const data = await service.submitEvaluation(req.body, req.user);
    return sendSuccess(res, data.message, data.evaluation, 201);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const data = await service.getEvaluationById(req.params.id, req.user);
    return sendSuccess(res, 'Lấy chi tiết phiếu đánh giá thành công.', data);
  } catch (error) {
    next(error);
  }
}

async function getByCandidate(req, res, next) {
  try {
    const data = await service.getEvaluationsByCandidate(req.params.candidateId, req.user);
    return sendSuccess(res, 'Lấy lịch sử đánh giá phỏng vấn của ứng viên thành công.', data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBySchedule,
  submit,
  getById,
  getByCandidate
};
