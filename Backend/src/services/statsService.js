/**
 * statsService.js
 */
const statsRepository = require('../repositories/statsRepository');

async function getDashboardStats() {
  return await statsRepository.getDashboardStats();
}

module.exports = {
  getDashboardStats
};
