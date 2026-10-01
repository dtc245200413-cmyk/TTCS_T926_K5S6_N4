/**
 * statsController.js
 */
const statsService = require('../services/statsService');

async function getDashboardStats(req, res, next) {
  try {
    const stats = await statsService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
      message: 'Dashboard stats retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats
};
