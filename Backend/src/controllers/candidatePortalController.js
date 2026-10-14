const service = require('../services/candidatePortalService');
const { sendSuccess, sendError } = require('../utils/response');
const { getIp } = require('../utils/roles');

exports.register = async (req, res, next) => {
  try {
    const result = await service.register(req.body);
    return sendSuccess(res, 'Đăng ký tài khoản ứng viên thành công.', result, 201);
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const result = await service.login(req.body.email, req.body.password);
    return sendSuccess(res, 'Đăng nhập ứng viên thành công.', result);
  } catch (error) { next(error); }
};

exports.me = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy hồ sơ ứng viên thành công.', await service.getMe(req.candidate.account_id));
  } catch (error) { next(error); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Cập nhật hồ sơ thành công.', await service.updateProfile(req.candidate.account_id, req.body));
  } catch (error) { next(error); }
};

exports.dashboard = async (req, res, next) => {
  try {
    const [candidate, dashboard] = await Promise.all([
      service.getMe(req.candidate.account_id),
      service.getDashboard(req.candidate.candidate_id)
    ]);
    return sendSuccess(res, 'Lấy tổng quan ứng viên thành công.', { candidate, ...dashboard });
  } catch (error) { next(error); }
};

exports.applications = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy lịch sử ứng tuyển thành công.', await service.getApplications(req.candidate.candidate_id));
  } catch (error) { next(error); }
};

exports.apply = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Vui lòng đính kèm CV.', 400);
    const result = await service.submitApplication(
      req.candidate,
      req.params.jobPostingId,
      req.body,
      req.file.filename
    );
    return sendSuccess(res, 'Hồ sơ ứng tuyển đã được gửi.', result, 201);
  } catch (error) { next(error); }
};

exports.interviews = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy lịch phỏng vấn thành công.', await service.getInterviews(req.candidate.candidate_id));
  } catch (error) { next(error); }
};

exports.respondInterview = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Đã ghi nhận phản hồi lịch phỏng vấn.', await service.respondToInterview(req.candidate.candidate_id, req.params.id, req.body));
  } catch (error) { next(error); }
};

exports.offers = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy thư mời nhận việc thành công.', await service.getOffers(req.candidate.candidate_id));
  } catch (error) { next(error); }
};

exports.respondOffer = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Đã ghi nhận phản hồi thư mời.', await service.respondToOffer(req.candidate.candidate_id, req.params.id, req.body));
  } catch (error) { next(error); }
};

exports.notifications = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy thông báo ứng viên thành công.', await service.getNotifications(req.candidate.candidate_id));
  } catch (error) { next(error); }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Đã đánh dấu thông báo đã đọc.', await service.markNotificationRead(req.candidate.candidate_id, req.params.id));
  } catch (error) { next(error); }
};

exports.changePassword = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Đổi mật khẩu thành công.', await service.changePassword(req.candidate.account_id, req.body.current_password, req.body.new_password));
  } catch (error) { next(error); }
};