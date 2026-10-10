/**
 * statsService.js
 */
const statsRepository = require('../repositories/statsRepository');

async function getDashboardStats() {
  return await statsRepository.getDashboardStats();
}

async function getHrDashboardStats(userId) {
  return await statsRepository.getHrDashboardStats(userId);
}

module.exports = {
  getDashboardStats,
  getHrDashboardStats
};
