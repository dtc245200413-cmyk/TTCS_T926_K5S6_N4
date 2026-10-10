/**
 * statsRepository.js
 */
const { pool } = require('../config/database');

async function getDashboardStats() {
  const [userStats] = await pool.execute(`
    SELECT 
      COUNT(*) as total_users,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_users,
      SUM(CASE WHEN status = 'LOCKED' THEN 1 ELSE 0 END) as locked_users
    FROM users
  `);

  const [roleStats] = await pool.execute(`
    SELECT r.role_code, r.role_name, COUNT(ur.user_id) as total
    FROM roles r
    LEFT JOIN user_roles ur ON r.role_id = ur.role_id
    GROUP BY r.role_id
  `);
  
  const [roleCount] = await pool.execute(`SELECT COUNT(*) as total FROM roles`);

  const [deptStats] = await pool.execute(`
    SELECT d.department_name, COUNT(u.user_id) as total_users
    FROM departments d
    LEFT JOIN users u ON d.department_id = u.department_id
    GROUP BY d.department_id
  `);
  
  const [deptCount] = await pool.execute(`SELECT COUNT(*) as total FROM departments`);

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
      active: parseInt(userStats[0].active_users || 0),
      locked: parseInt(userStats[0].locked_users || 0)
    },
    roles: roleStats,
    departments: deptStats,
    totals: {
      roles: parseInt(roleCount[0].total || 0),
      departments: parseInt(deptCount[0].total || 0)
    },
    jobs: jobReqStats,
    activities: recentActivities
  };
}

async function getHrDashboardStats(userId) {
  const [deptCount] = await pool.execute(`SELECT COUNT(*) as total FROM departments`);
  
  // Total employees (excluding candidates if candidate role exists)
  // Let's assume CANDIDATE role exists or we count all active users for simplicity.
  // We'll count users who have roles that are internal.
  const [userCount] = await pool.execute(`
    SELECT COUNT(DISTINCT u.user_id) as total 
    FROM users u
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.role_id
    WHERE r.role_code != 'CANDIDATE'
  `);

  const [positionCount] = await pool.execute(`SELECT COUNT(*) as total FROM job_positions`);
  
  let competencyCount = { total: 0 };
  try {
    const [cc] = await pool.execute(`SELECT COUNT(*) as total FROM competency_frameworks`);
    competencyCount = cc[0];
  } catch (e) {}

  let questionCount = { total: 0 };
  try {
    const [qc] = await pool.execute(`SELECT COUNT(*) as total FROM questions`);
    questionCount = qc[0];
  } catch (e) {}

  let unreadNotifications = 0;
  try {
    const [nc] = await pool.execute(`SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE`, [userId]);
    unreadNotifications = nc[0].total;
  } catch (e) {}

  let recentNotifications = [];
  try {
    const [nots] = await pool.execute(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`, [userId]);
    recentNotifications = nots;
  } catch (e) {}

  const [deptChartData] = await pool.execute(`
    SELECT d.department_name, COUNT(DISTINCT u.user_id) as total_users
    FROM departments d
    LEFT JOIN users u ON d.department_id = u.department_id
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    WHERE (r.role_code IS NULL OR r.role_code != 'CANDIDATE')
    GROUP BY d.department_id
  `);

  return {
    departments: parseInt(deptCount[0].total || 0),
    employees: parseInt(userCount[0].total || 0),
    positions: parseInt(positionCount[0].total || 0),
    competencies: parseInt(competencyCount.total || 0),
    questions: parseInt(questionCount.total || 0),
    unreadNotifications: parseInt(unreadNotifications || 0),
    recentNotifications,
    departmentChart: deptChartData.map(d => ({
      name: d.department_name,
      value: parseInt(d.total_users || 0)
    }))
  };
}

module.exports = {
  getDashboardStats,
  getHrDashboardStats
};
