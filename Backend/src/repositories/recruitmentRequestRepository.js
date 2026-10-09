/**
 * recruitmentRequestRepository.js
 */

const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO recruitment_requests
      (department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, salary_explanation, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    data.department_id,
    data.position_id,
    data.headcount,
    data.reason,
    data.proposed_salary_min || null,
    data.proposed_salary_max || null,
    data.needed_by_date,
    data.job_description || null,
    data.candidate_requirements || null,
    data.salary_explanation || null,
    data.status || 'DRAFT',
    data.created_by
  ]);
  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, p.min_salary AS std_min_salary, p.max_salary AS std_max_salary, u.full_name AS created_by_name
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.id = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll(userId) {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, u.full_name AS created_by_name
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.created_by = ?
    ORDER BY r.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

async function getAllForApproval() {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, u.full_name AS created_by_name
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.status != 'DRAFT'
    ORDER BY CASE WHEN r.status = 'PENDING' THEN 1 ELSE 2 END, r.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function updateStatus(id, status, rejectionReason = null) {
  const sql = `UPDATE recruitment_requests SET status = ?, rejection_reason = ? WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReason, id]);
}

module.exports = {
  create,
  findById,
  getAll,
  getAllForApproval,
  updateStatus
};
