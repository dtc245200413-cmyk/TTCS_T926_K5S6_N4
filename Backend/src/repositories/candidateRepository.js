const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO candidates
      (
        full_name,
        email,
        phone,
        status,
        source_code,
        recruitment_request_id,
        created_by
      )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    data.full_name,
    data.email,
    data.phone || null,
    data.status || 'NEW',
    data.source_code || null,
    data.recruitment_request_id || null,
    data.created_by
  ]);

  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT *
    FROM candidates
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [id]);

  return rows.length > 0 ? rows[0] : null;
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
    LEFT JOIN recruitment_requests r
      ON c.recruitment_request_id = r.id
    LEFT JOIN departments d
      ON r.department_id = d.department_id
    LEFT JOIN job_positions p
      ON r.position_id = p.position_id
    WHERE 1 = 1
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
    /*
     * Một số database cũ chưa có recruitment_requests.
     * Recruiter/HR vẫn phải có thể quản lý hồ sơ ứng viên.
     */
    if (error.code !== 'ER_NO_SUCH_TABLE') {
      throw error;
    }

    // Hiring Manager cần bảng recruitment_requests để giới hạn
    // hồ sơ theo phòng ban. Nếu bảng chưa tồn tại thì không
    // trả toàn bộ hồ sơ cho Hiring Manager.
    if (
      isHiringManager &&
      !isHRManager &&
      !isRecruiter
    ) {
      return [];
    }

    const fallbackSql = `
      SELECT
        c.*,
        NULL AS job_reason,
        NULL AS department_name,
        NULL AS position_name
      FROM candidates c
      ORDER BY c.created_at DESC
    `;

    const [rows] = await pool.execute(fallbackSql);

    return rows;
  }
}

async function updateStatus(
  id,
  status,
  rejectionReasonCode = null
) {
  const sql = `
    UPDATE candidates
    SET
      status = ?,
      rejection_reason_code = ?
    WHERE id = ?
  `;

  await pool.execute(sql, [
    status,
    rejectionReasonCode,
    id
  ]);
}

module.exports = {
  create,
  findById,
  getAll,
  updateStatus
};