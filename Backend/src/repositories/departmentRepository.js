/**
 * departmentRepository.js
 * Database queries for department management.
 */

const { pool } = require('../config/database');

/**
 * Get all departments with parent + manager information.
 */
async function getAll() {
  const sql = `
    SELECT
      d.department_id,
      d.department_code,
      d.department_name,
      d.description,
      d.parent_department_id,
      d.manager_user_id,
      d.status,
      d.created_at,

      p.department_name AS parent_department_name,

      m.employee_code AS manager_employee_code,
      m.full_name AS manager_name,
      m.company_email AS manager_email

    FROM departments d

    LEFT JOIN departments p
      ON d.parent_department_id = p.department_id

    LEFT JOIN users m
      ON d.manager_user_id = m.user_id

    ORDER BY d.department_name ASC
  `;

  const [rows] = await pool.execute(sql);
  return rows;
}

/**
 * Find department by ID.
 */
async function findById(departmentId) {
  const sql = `
    SELECT
      d.department_id,
      d.department_code,
      d.department_name,
      d.description,
      d.parent_department_id,
      d.manager_user_id,
      d.status,
      d.created_at,

      p.department_name AS parent_department_name,

      m.employee_code AS manager_employee_code,
      m.full_name AS manager_name,
      m.company_email AS manager_email

    FROM departments d

    LEFT JOIN departments p
      ON d.parent_department_id = p.department_id

    LEFT JOIN users m
      ON d.manager_user_id = m.user_id

    WHERE d.department_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [departmentId]);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check whether department code already exists.
 */
async function codeExists(departmentCode, excludeDepartmentId = null) {
  let sql = `
    SELECT department_id
    FROM departments
    WHERE department_code = ?
  `;

  const params = [departmentCode];

  if (excludeDepartmentId !== null) {
    sql += ` AND department_id <> ?`;
    params.push(excludeDepartmentId);
  }

  sql += ` LIMIT 1`;

  const [rows] = await pool.execute(sql, params);

  return rows.length > 0;
}

/**
 * Create department.
 */
async function create({
  departmentCode,
  departmentName,
  description,
  parentDepartmentId,
  managerUserId,
  status = 'ACTIVE',
}) {
  const sql = `
    INSERT INTO departments
    (
      department_code,
      department_name,
      description,
      parent_department_id,
      manager_user_id,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.execute(sql, [
    departmentCode,
    departmentName,
    description || null,
    parentDepartmentId || null,
    managerUserId || null,
    status,
  ]);

  return result.insertId;
}

/**
 * Update department.
 */
async function update(departmentId, fields) {
  const allowedFields = [
    'department_code',
    'department_name',
    'description',
    'parent_department_id',
    'manager_user_id',
    'status',
  ];

  const setClauses = [];
  const params = [];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(fields, field)) {
      setClauses.push(`${field} = ?`);
      params.push(fields[field]);
    }
  }

  if (setClauses.length === 0) {
    return false;
  }

  params.push(departmentId);

  const sql = `
    UPDATE departments
    SET ${setClauses.join(', ')}
    WHERE department_id = ?
  `;

  const [result] = await pool.execute(sql, params);

  return result.affectedRows > 0;
}

/**
 * Count direct child departments.
 */
async function countChildren(departmentId) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM departments
    WHERE parent_department_id = ?
  `;

  const [rows] = await pool.execute(sql, [departmentId]);

  return Number(rows[0].total);
}

/**
 * Count OPEN recruitment requisitions.
 *
 * DRAFT / PENDING / APPROVED are treated as active.
 */
async function countActiveRequisitions(departmentId) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM job_requisitions
    WHERE department_id = ?
      AND status IN ('DRAFT', 'PENDING', 'APPROVED')
  `;

  const [rows] = await pool.execute(sql, [departmentId]);

  return Number(rows[0].total);
}

/**
 * Count all recruitment requisitions.
 */
async function countAllRequisitions(departmentId) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM job_requisitions
    WHERE department_id = ?
  `;

  const [rows] = await pool.execute(sql, [departmentId]);

  return Number(rows[0].total);
}

/**
 * Delete department.
 */
async function remove(departmentId) {
  const sql = `
    DELETE FROM departments
    WHERE department_id = ?
  `;

  const [result] = await pool.execute(sql, [departmentId]);

  return result.affectedRows > 0;
}

/**
 * Activate / deactivate department.
 */
async function updateStatus(departmentId, status) {
  const sql = `
    UPDATE departments
    SET status = ?
    WHERE department_id = ?
  `;

  const [result] = await pool.execute(sql, [
    status,
    departmentId,
  ]);

  return result.affectedRows > 0;
}

/**
 * Check whether a user exists.
 */
async function managerExists(userId) {
  const sql = `
    SELECT user_id
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [userId]);

  return rows.length > 0;
}

module.exports = {
  getAll,
  findById,
  codeExists,
  create,
  update,
  countChildren,
  countActiveRequisitions,
  countAllRequisitions,
  remove,
  updateStatus,
  managerExists,
};