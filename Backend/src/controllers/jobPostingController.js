const service = require('../services/jobPostingService');
const { sendSuccess, sendError } = require('../utils/response');
const { getIp } = require('../utils/roles');

exports.getEligibleRequests = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy yêu cầu đủ điều kiện đăng tin thành công.', await service.getEligibleRequests());
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy danh sách tin tuyển dụng thành công.', await service.getAll(req.query.status || ''));
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Tạo bản nháp tin tuyển dụng thành công.', await service.create(req.body, req.user.user_id, getIp(req)), 201);
  } catch (error) { next(error); }
};

exports.getPreview = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy bản xem trước thành công.', await service.getPreview(req.params.id));
  } catch (error) { next(error); }
};

exports.submit = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Gửi tin chờ duyệt thành công.', await service.submit(req.params.id, req.user.user_id, getIp(req)));
  } catch (error) { next(error); }
};

exports.review = async (req, res, next) => {
  try {
    if (typeof req.body.approved !== 'boolean') return sendError(res, 'Thiếu kết quả duyệt hợp lệ.', 400);
    const posting = await service.review(req.params.id, req.body.approved, req.body.note, req.user.user_id, getIp(req));
    return sendSuccess(res, req.body.approved ? 'Tin đã được duyệt.' : 'Tin đã bị từ chối.', posting);
  } catch (error) { next(error); }
};

exports.publish = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Xuất bản tin thành công.', await service.publish(req.params.id, req.user.user_id, getIp(req)));
  } catch (error) { next(error); }
};

exports.getPublicJobs = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy danh sách việc làm công khai thành công.', await service.getPublicJobs(req.query));
  } catch (error) { next(error); }
};

exports.getPublicJob = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy chi tiết việc làm thành công.', await service.getPublicJob(req.params.id));
  } catch (error) { next(error); }
};

exports.applyPublicJob = async (req, res, next) => {
  try {
    const postingId = req.params.id || req.body.job_posting_id;
    if (!postingId) return sendError(res, 'Vui lòng chọn vị trí tuyển dụng.', 400);
    const resumeFilename = req.file?.filename || null;
    const result = await service.applyToPublicJob(postingId, req.body, resumeFilename, req.ip);
    return sendSuccess(res, 'Hồ sơ ứng tuyển đã được gửi thành công.', result, 201);
  } catch (error) { next(error); }
};

exports.trackApplication = async (req, res, next) => {
  try {
    const code = req.body?.application_code || req.query?.code;
    const email = req.body?.email || req.query?.email;
    const result = await service.trackApplication(code, email);
    return sendSuccess(res, 'Tra cứu trạng thái hồ sơ thành công.', result);
  } catch (error) { next(error); }
};

exports.updateDraft = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Cập nhật bản nháp thành công.', await service.updateDraft(req.params.id, req.body, req.user.user_id, getIp(req)));
  } catch (error) { next(error); }
};