/**
 * recruitmentRequestRepository.js
 */

const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO job_requisitions
      (requisition_code, department_id, position_id, headcount, reason, proposed_min_salary, proposed_max_salary, date_needed, job_description, requirements, status, created_by, budget_year, estimated_salary_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    data.requisition_code,
    data.department_id ?? null,
    data.position_id ?? null,
    data.headcount ?? null,
    data.reason ?? null,
    data.proposed_min_salary ?? null,
    data.proposed_max_salary ?? null,
    data.date_needed ?? null,
    data.job_description ?? null,
    data.requirements ?? null,
    data.status ?? 'DRAFT',
    data.created_by ?? null,
    data.budget_year ?? null,
    data.estimated_salary_cost ?? null
  ]);
  return result.insertId;
}

async function findById(id, connection = pool) {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, p.min_salary AS std_min_salary, p.max_salary AS std_max_salary, u.full_name AS created_by_name,
      (SELECT a.comments FROM recruitment_request_approvals a
       WHERE a.requisition_id = r.requisition_id AND a.action = 'REJECTED'
       ORDER BY a.approval_id DESC LIMIT 1) AS rejection_reason
    FROM job_requisitions r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.requisition_id = ? LIMIT 1
  `;
  const [rows] = await connection.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll(userId) {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, u.full_name AS created_by_name
    FROM job_requisitions r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.created_by = ?
    ORDER BY r.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

async function getAllSystemWide() {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, u.full_name AS created_by_name
    FROM job_requisitions r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    ORDER BY r.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function getAllForApproval() {
  const sql = `
    SELECT r.*, d.department_name, p.position_name, u.full_name AS created_by_name
    FROM job_requisitions r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    WHERE r.status != 'DRAFT'
    ORDER BY CASE WHEN r.status = 'PENDING' THEN 1 ELSE 2 END, r.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function findByIdForUpdate(id, connection) {
  const [rows] = await connection.execute('SELECT * FROM job_requisitions WHERE requisition_id = ? FOR UPDATE', [id]);
  return rows[0] || null;
}

async function updateStatus(id, data, connection) {
  const sql = `UPDATE job_requisitions SET status = ?,
    decided_at = CURRENT_TIMESTAMP, decided_by = ?, budget_year = ?, estimated_salary_cost = ?
    WHERE requisition_id = ? AND status = 'PENDING'`;
  const [result] = await connection.execute(sql, [data.status, data.decided_by,
    data.budget_year, data.estimated_salary_cost, id]);
  return result.affectedRows;
}

module.exports = {
  create,
  findById,
  findByIdForUpdate,
  getAll,
  getAllSystemWide,
  getAllForApproval,
  updateStatus
};
