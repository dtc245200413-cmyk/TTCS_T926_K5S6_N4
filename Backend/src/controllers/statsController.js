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

async function getHrDashboardStats(req, res, next) {
  try {
    const userId = req.user.user_id;
    const stats = await statsService.getHrDashboardStats(userId);
    res.json({
      success: true,
      data: stats,
      message: 'HR Dashboard stats retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardStats,
  getHrDashboardStats
};
