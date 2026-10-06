/**
 * competencyFrameworkController.js
 */

const competencyService = require('../services/competencyFrameworkService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const getAllFrameworks = async (req, res, next) => {
  try {
    const result = await competencyService.getAllFrameworks(req.query);
    return sendSuccess(res, 'Competency frameworks retrieved successfully.', result);
  } catch (error) { next(error); }
};

const getFrameworkById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid framework ID.', 400);
    const framework = await competencyService.getFrameworkById(id);
    return sendSuccess(res, 'Framework retrieved successfully.', framework);
  } catch (error) { next(error); }
};

const createFramework = async (req, res, next) => {
  try {
    const newFramework = await competencyService.createFramework(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Competency framework created successfully.', newFramework, 201);
  } catch (error) { next(error); }
};

const updateFramework = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid framework ID.', 400);
    const updatedFramework = await competencyService.updateFramework(id, req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Competency framework updated successfully.', updatedFramework);
  } catch (error) { next(error); }
};

const deleteFramework = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return sendError(res, 'Invalid framework ID.', 400);
    await competencyService.deleteFramework(id, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Competency framework deleted successfully.');
  } catch (error) { next(error); }
};

module.exports = {
  getAllFrameworks,
  getFrameworkById,
  createFramework,
  updateFramework,
  deleteFramework
};
