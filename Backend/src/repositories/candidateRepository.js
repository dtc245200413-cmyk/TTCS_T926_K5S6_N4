const { pool } = require('../config/database');

function isMissingRecruitmentRequests(error) {
  // ER_NO_SUCH_TABLE may also refer to candidates or another joined table.
  // Match the missing table in MySQL's diagnostic, never in the query text.
  return error.code === 'ER_NO_SUCH_TABLE'
    && /\bTable ['`](?:[^'`]+\.)?recruitment_requests['`] doesn't exist/i.test(error.sqlMessage || error.message || '');
}

async function create(data) {
  const sql = `
    INSERT INTO candidates
      (full_name, email, phone, status, source_code, recruitment_request_id, created_by, resume_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    data.full_name,
    data.email,
    data.phone || null,
    data.status || 'NEW',
    data.source_code || null,
    data.recruitment_request_id || null,
    data.created_by,
    data.resume_url || null
  ]);

  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT c.*, r.department_id, r.position_id, d.department_name, p.position_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    WHERE c.id = ? LIMIT 1
  `;
  try {
    const [rows] = await pool.execute(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    if (!isMissingRecruitmentRequests(error)) throw error;
    const [rows] = await pool.execute(`
      SELECT c.*
      FROM candidates c
      WHERE c.id = ?
      LIMIT 1
    `, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
}

function getRoleFlags(user) {
  const roles = user?.roles || [];

  return {
    isHiringManager: roles.some(
      (role) => role.role_code === 'HIRING_MANAGER'
    ),
    isHRManager: roles.some(
      (role) =>
        role.role_code === 'HR_MANAGER' ||
        role.role_code === 'ADMIN'
    ),
    isRecruiter: roles.some(
      (role) => role.role_code === 'RECRUITER'
    )
  };
}

async function getAll(user) {
  const {
    isHiringManager,
    isHRManager,
    isRecruiter
  } = getRoleFlags(user);

  let sql = `
    SELECT
      c.*,
      r.reason AS job_reason,
      d.department_name,
      p.position_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    WHERE c.merged_into_id IS NULL
  `;

  const params = [];

  // Hiring Manager chỉ xem hồ sơ thuộc phòng ban của mình.
  if (
    isHiringManager &&
    !isHRManager &&
    !isRecruiter
  ) {
    sql += ` AND r.department_id = ?`;
    params.push(user.department_id);
  }

  sql += ` ORDER BY c.created_at DESC`;

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    if (!isMissingRecruitmentRequests(error)) throw error;
    const canViewAll = user?.roles?.some(role =>
      ['RECRUITER', 'HR_MANAGER', 'ADMIN'].includes(role.role_code)
    );
    // Department scope cannot be established without recruitment_requests.
    if (!canViewAll) return [];
    const [rows] = await pool.execute(`
      SELECT c.*, NULL AS job_reason, NULL AS department_name, NULL AS position_name
      FROM candidates c
      ORDER BY c.created_at DESC
    `);
    return rows;
  }
}

async function updateStatus(id, status, rejectionReasonCode = null) {
  const sql = `UPDATE candidates SET status = ?, rejection_reason_code = ?, stage_changed_at = NOW(), sla_overdue = 0, sla_flagged_at = NULL WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReasonCode, id]);
}

module.exports = {
  create,
  findById,
  getAll,
  updateStatus
};
