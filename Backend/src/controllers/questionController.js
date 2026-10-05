/**
 * questionController.js
 * HTTP handlers for Question Bank management endpoints (SCRUM-74).
 */

const questionService = require('../services/questionService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

/**
 * GET /api/questions
 * List questions with search, criteria filter, difficulty filter, pagination.
 */
const getAllQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getAllQuestions(req.query);
    return sendSuccess(res, 'Lấy danh sách câu hỏi thành công.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/criteria
 * Get list of all competency criteria for select dropdowns.
 */
const getAllCriteria = async (req, res, next) => {
  try {
    const criteria = await questionService.getAllCriteria();
    return sendSuccess(res, 'Lấy danh sách tiêu chí năng lực thành công.', criteria);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/stats
 * Get quick summary statistics.
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await questionService.getStats();
    return sendSuccess(res, 'Lấy dữ liệu thống kê câu hỏi thành công.', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/questions/:id
 * Get single question detail.
 */
const getQuestionById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'ID câu hỏi phải là một số hợp lệ.', 400);

    const question = await questionService.getQuestionById(id);
    return sendSuccess(res, 'Lấy thông tin câu hỏi thành công.', question);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/questions
 * Create a new question.
 */
const createQuestion = async (req, res, next) => {
  try {
    const userId = req.user?.user_id || null;
    const ipAddress = getIp(req);
    const newQuestion = await questionService.createQuestion(req.body, userId, ipAddress);
    return sendSuccess(res, 'Tạo câu hỏi mới thành công.', newQuestion, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/questions/:id
 * Update an existing question.
 */
const updateQuestion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'ID câu hỏi phải là một số hợp lệ.', 400);

    const userId = req.user?.user_id || null;
    const ipAddress = getIp(req);
    const updatedQuestion = await questionService.updateQuestion(id, req.body, userId, ipAddress);
    return sendSuccess(res, 'Cập nhật thông tin câu hỏi thành công.', updatedQuestion);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/questions/:id
 * Delete a question.
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'ID câu hỏi phải là một số hợp lệ.', 400);

    const userId = req.user?.user_id || null;
    const ipAddress = getIp(req);
    const result = await questionService.deleteQuestion(id, userId, ipAddress);
    return sendSuccess(res, 'Xóa câu hỏi thành công.', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllQuestions,
  getAllCriteria,
  getStats,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
};
