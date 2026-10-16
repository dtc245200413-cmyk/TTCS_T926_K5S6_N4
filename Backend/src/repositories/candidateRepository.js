const { pool } = require('../config/database');

function isMissingRecruitmentRequests(error) {
  // Check MySQL's missing-table diagnostic, not the SQL query (which names all joins).
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

async function getAll(user) {
  let sql = `
    SELECT c.*, r.reason as job_reason, r.position_id, d.department_name, p.position_name,
           u_changer.full_name AS stage_changer_name,
           md_reason.name AS rejection_reason_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users u_changer ON u_changer.user_id = c.stage_changed_by
    LEFT JOIN master_data md_reason ON md_reason.category_group = 'REJECTION_REASON' AND md_reason.code = c.rejection_reason_code
    WHERE c.merged_into_id IS NULL
  `;
  const params = [];

  if (user) {
    const isHiringManager = user.roles && user.roles.some(r => r.role_code === 'HIRING_MANAGER');
    const isHRManager = user.roles && user.roles.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'ADMIN');
    const isRecruiter = user.roles && user.roles.some(r => r.role_code === 'RECRUITER');
    
    if (isHiringManager && !isHRManager && !isRecruiter) {
      sql += ` AND r.department_id = ? `;
      params.push(user.department_id);
    }
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
    if (!canViewAll) return [];
    const [rows] = await pool.execute(`
      SELECT c.*, NULL AS job_reason, NULL AS position_id, NULL AS department_name, NULL AS position_name,
             NULL AS stage_changer_name, NULL AS rejection_reason_name
      FROM candidates c
      ORDER BY c.created_at DESC
    `);
    return rows;
  }
}

async function updateStatus(id, status, rejectionReasonCode = null, rejectionNote = null, userId = null, fromStage = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const sql = `
      UPDATE candidates 
      SET status = ?, 
          rejection_reason_code = ?, 
          rejection_note = ?,
          stage_changed_by = ?,
          stage_changed_at = NOW(), 
          sla_overdue = 0, 
          sla_flagged_at = NULL 
      WHERE id = ?
    `;
    await connection.execute(sql, [status, rejectionReasonCode || null, rejectionNote || null, userId || null, id]);

    await connection.execute(`
      INSERT INTO candidate_stage_history 
        (candidate_id, from_stage, to_stage, rejection_reason_code, rejection_note, changed_by, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [id, fromStage || null, status, rejectionReasonCode || null, rejectionNote || null, userId || null]);

    const appStatusMap = {
      'NEW': 'SUBMITTED',
      'SCREENING': 'SCREENING',
      'INTERVIEWING': 'INTERVIEWING',
      'OFFERED': 'OFFERED',
      'HIRED': 'HIRED',
      'REJECTED': 'REJECTED'
    };
    if (appStatusMap[status]) {
      await connection.execute(
        `UPDATE candidate_applications SET status = ?, updated_at = NOW() WHERE candidate_id = ?`,
        [appStatusMap[status], id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getStageHistory(candidateId) {
  const [rows] = await pool.execute(`
    SELECT h.*, u.full_name AS changed_by_name, u.job_title AS changed_by_title,
           md.name AS rejection_reason_name
    FROM candidate_stage_history h
    LEFT JOIN users u ON u.user_id = h.changed_by
    LEFT JOIN master_data md ON md.category_group = 'REJECTION_REASON' AND md.code = h.rejection_reason_code
    WHERE h.candidate_id = ?
    ORDER BY h.changed_at DESC, h.id DESC
  `, [candidateId]);
  return rows;
}

module.exports = {
  create,
  findById,
  getAll,
  updateStatus,
  getStageHistory
};
