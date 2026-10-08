/**
 * interviewQuestionController.js
 */

const questionService = require('../services/interviewQuestionService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const getAllQuestions = async (req, res, next) => {
  try {
    const result = await questionService.getAllQuestions(req.query);
    return sendSuccess(res, 'Questions retrieved successfully.', result);
  } catch (error) { next(error); }
};

const getQuestionById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid question ID.', 400);
    const question = await questionService.getQuestionById(id);
    return sendSuccess(res, 'Question retrieved successfully.', question);
  } catch (error) { next(error); }
};

const createQuestion = async (req, res, next) => {
  try {
    const newQuestion = await questionService.createQuestion(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Question created successfully.', newQuestion, 201);
  } catch (error) { next(error); }
};

const updateQuestion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid question ID.', 400);
    const updatedQuestion = await questionService.updateQuestion(id, req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Question updated successfully.', updatedQuestion);
  } catch (error) { next(error); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid question ID.', 400);
    await questionService.deleteQuestion(id, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Question deleted successfully.');
  } catch (error) { next(error); }
};

const getCriteriaOptions = async (req, res, next) => {
  try {
    const options = await questionService.getCriteriaOptions();
    return sendSuccess(res, 'Criteria options retrieved.', options);
  } catch (error) { next(error); }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getCriteriaOptions
};
