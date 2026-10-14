const service = require('../services/slaService');
const { sendSuccess } = require('../utils/response');

exports.getConfigs = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy cấu hình SLA thành công.', await service.getConfigs());
  } catch (error) { next(error); }
};

exports.saveConfigs = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lưu cấu hình SLA thành công.', await service.saveConfigs(req.body.configs, req.user.user_id));
  } catch (error) { next(error); }
};

exports.runCheck = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Đã kiểm tra SLA.', await service.runDailySlaCheck('MANUAL'));
  } catch (error) { next(error); }
};