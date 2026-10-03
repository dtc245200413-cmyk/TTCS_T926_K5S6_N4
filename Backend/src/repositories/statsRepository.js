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

  const [deptStats] = await pool.execute(`
    SELECT d.department_name, COUNT(u.user_id) as total_users
    FROM departments d
    LEFT JOIN users u ON d.department_id = u.department_id
    GROUP BY d.department_id
  `);

  let jobReqStats = { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0, closed: 0 };
  try {
    const [jobs] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed
      FROM job_requisitions
    `);
    if (jobs[0]) {
      jobReqStats = {
        total: parseInt(jobs[0].total || 0),
        draft: parseInt(jobs[0].draft || 0),
        pending: parseInt(jobs[0].pending || 0),
        approved: parseInt(jobs[0].approved || 0),
        rejected: parseInt(jobs[0].rejected || 0),
        closed: parseInt(jobs[0].closed || 0)
      };
    }
  } catch (e) {
    // In case job_requisitions table doesn't exist yet
  }

  let recentActivities = [];
  try {
    const [logs] = await pool.execute(`
      SELECT al.action, al.description, al.created_at, u.full_name
      FROM audit_logs al 
      JOIN users u ON al.performed_by = u.user_id 
      ORDER BY al.created_at DESC 
      LIMIT 5
    `);
    recentActivities = logs;
  } catch (e) {
    // ignore
  }

  return {
    users: {
      total: parseInt(userStats[0].total_users || 0),
      active: parseInt(userStats[0].active_users || 0)
    },
    roles: roleStats,
    departments: deptStats,
    jobs: jobReqStats,
    activities: recentActivities
  };
}

module.exports = {
  getDashboardStats
};
