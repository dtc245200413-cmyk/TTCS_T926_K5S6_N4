const budgetService = require('../services/departmentBudgetService');
const { sendSuccess } = require('../utils/response');

const getBudgets = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy chỉ tiêu thành công.', await budgetService.getBudgets(req.query.year));
  } catch (error) { next(error); }
};

const getAvailability = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy chỉ tiêu còn lại thành công.',
      await budgetService.getAvailability(req.params.departmentId, req.params.year));
  } catch (error) { next(error); }
};

const saveBudget = async (req, res, next) => {
  try {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
    return sendSuccess(res, 'Lưu chỉ tiêu thành công.',
      await budgetService.saveBudget(req.params.departmentId, req.params.year, req.body, req.user, ipAddress));
  } catch (error) { next(error); }
};

module.exports = { getBudgets, getAvailability, saveBudget };
