/**
 * jobPositionController.js
 */
const jobPositionService = require('../services/jobPositionService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const getAllPositions = async (req, res, next) => {
  try {
    const result = await jobPositionService.getAllPositions(req.query);
    return sendSuccess(res, 'Job positions retrieved successfully.', result);
  } catch (error) { next(error); }
};

const getPositionById = async (req, res, next) => {
  try {
    const positionId = parseInt(req.params.id, 10);
    if (isNaN(positionId)) return sendError(res, 'Invalid position ID.', 400);
    const position = await jobPositionService.getPositionById(positionId);
    return sendSuccess(res, 'Position retrieved successfully.', position);
  } catch (error) { next(error); }
};

const createPosition = async (req, res, next) => {
  try {
    const newPosition = await jobPositionService.createPosition(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Job position created successfully.', newPosition, 201);
  } catch (error) { next(error); }
};

const updatePosition = async (req, res, next) => {
  try {
    const positionId = parseInt(req.params.id, 10);
    if (isNaN(positionId)) return sendError(res, 'Invalid position ID.', 400);
    const updatedPosition = await jobPositionService.updatePosition(positionId, req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Job position updated successfully.', updatedPosition);
  } catch (error) { next(error); }
};

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition
};
