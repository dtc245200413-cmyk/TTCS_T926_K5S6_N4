const offerService = require('../services/offerService');
const { sendSuccess, sendError } = require('../utils/response');

const getAllOffers = async (req, res, next) => {
  try {
    const data = await offerService.getAllOffers(req.query, req.user);
    return sendSuccess(res, 'Lấy danh sách Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

const getOfferById = async (req, res, next) => {
  try {
    const data = await offerService.getOfferById(req.params.id, req.user);
    return sendSuccess(res, 'Lấy chi tiết Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

const submitOffer = async (req, res, next) => {
  try {
    const data = await offerService.submitOffer(req.params.id, req.user);
    return sendSuccess(res, 'Gửi duyệt Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

const processApproval = async (req, res, next) => {
  try {
    const data = await offerService.processApproval(req.params.id, req.body, req.user);
    return sendSuccess(res, 'Xử lý phê duyệt Offer thành công', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOffers,
  getOfferById,
  submitOffer,
  processApproval
};

