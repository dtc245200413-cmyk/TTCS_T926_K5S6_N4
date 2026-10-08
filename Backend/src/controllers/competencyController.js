/**
 * competencyController.js
 * HTTP request handlers for Competency criteria endpoints (/api/competencies).
 */

const competencyService = require('../services/competencyService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

/**
 * GET /api/competencies
 * Returns all competencies for dropdown selection.
 */
const getAllCompetencies = async (req, res, next) => {
  try {
    const list = await competencyService.getAllCompetencies();
    return sendSuccess(res, 'Lấy danh sách tiêu chí năng lực thành công.', list);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/competencies/:id
 * Returns detail of a specific competency.
 */
const getCompetencyById = async (req, res, next) => {
  try {
    const item = await competencyService.getCompetencyById(req.params.id);
    return sendSuccess(res, 'Lấy thông tin tiêu chí năng lực thành công.', item);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/competencies
 * Creates a new competency.
 */
const createCompetency = async (req, res, next) => {
  try {
    const userId = req.user?.user_id || null;
    const ipAddress = getIp(req);
    const newItem = await competencyService.createCompetency(req.body, userId, ipAddress);
    return sendSuccess(res, 'Thêm tiêu chí năng lực thành công.', newItem, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCompetencies,
  getCompetencyById,
  createCompetency
};
