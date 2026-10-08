/**
 * jobPositionController.js
 */
const jobPositionRepo = require('../repositories/jobPositionRepository');
const { sendSuccess } = require('../utils/response');

const getAllPositions = async (req, res, next) => {
  try {
    const positions = await jobPositionRepo.findAll();
    return sendSuccess(res, 'Lấy danh sách chức danh thành công.', positions);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPositions
};
