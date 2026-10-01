/**
 * statsRepository.js
 */
const { pool } = require('../config/database');

async function getDashboardStats() {
  const [userStats] = await pool.execute(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_users
    FROM users
  `);

  const [roleStats] = await pool.execute(`
    SELECT r.role_code, r.role_name, COUNT(ur.user_id) as total
    FROM roles r
    LEFT JOIN user_roles ur ON r.role_id = ur.role_id
    GROUP BY r.role_id
  `);

  return {
    users: {
      total: parseInt(userStats[0].total_users || 0),
      active: parseInt(userStats[0].active_users || 0)
    },
    roles: roleStats
  };
}

module.exports = {
  getDashboardStats
};
