const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO candidates
      (full_name, email, phone, status, source_code, recruitment_request_id, created_by)
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
    SELECT c.*, r.department_id, r.position_id 
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    WHERE c.id = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll() {
  const sql = `
    SELECT c.*, r.reason as job_reason, d.department_name, p.position_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    ORDER BY c.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function updateStatus(id, status, rejectionReasonCode = null) {
  const sql = `UPDATE candidates SET status = ?, rejection_reason_code = ? WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReasonCode, id]);
}

module.exports = {
  create,
  findById,
  getAll,
  updateStatus
};
