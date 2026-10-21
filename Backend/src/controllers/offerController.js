/**
 * offerController.js
 */

const offerService = require('../services/offerService');
const { sendSuccess, sendError } = require('../utils/response');
const { getIp } = require('../utils/roles');

exports.getOffers = async (req, res, next) => {
  try {
    const data = await offerService.listOffers(req.user, req.query);
    return sendSuccess(res, 'Lấy danh sách Offer thành công.', data);
  } catch (error) {
    next(error);
  }
};

exports.getOfferById = async (req, res, next) => {
  try {
    const data = await offerService.getOfferDetail(req.user, req.params.id);
    return sendSuccess(res, 'Lấy thông tin chi tiết Offer thành công.', data);
  } catch (error) {
    next(error);
  }
};

exports.approveOffer = async (req, res, next) => {
  try {
    const data = await offerService.approveOffer(req.user, req.params.id, req.body, getIp(req));
    return sendSuccess(res, 'Phê duyệt Thư mời nhận việc thành công.', data);
  } catch (error) {
    next(error);
  }
};

exports.rejectOffer = async (req, res, next) => {
  try {
    const data = await offerService.rejectOffer(req.user, req.params.id, req.body, getIp(req));
    return sendSuccess(res, 'Đã từ chối Thư mời nhận việc.', data);
  } catch (error) {
    next(error);
  }
};

exports.requestChangeOffer = async (req, res, next) => {
  try {
    const data = await offerService.requestChangeOffer(req.user, req.params.id, req.body, getIp(req));
    return sendSuccess(res, 'Đã gửi yêu cầu chỉnh sửa Thư mời nhận việc.', data);
  } catch (error) {
    next(error);
  }
};

exports.publishOffer = async (req, res, next) => {
  try {
    const data = await offerService.publishOffer(req.user, req.params.id, getIp(req));
    return sendSuccess(res, 'Đã phát hành Thư mời nhận việc tới ứng viên thành công.', data);
  } catch (error) {
    next(error);
  }
};

exports.getOnboardings = async (req, res, next) => {
  try {
    const data = await offerService.listOnboardings(req.user);
    return sendSuccess(res, 'Lấy danh sách Onboarding thành công.', data);
  } catch (error) {
    next(error);
  }
};
