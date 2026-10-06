/**
 * positionRepository.js
 * All database operations for 'job_positions' table (SCRUM-62 / SCRUM-98).
 *
 * DB columns:
 *   position_id, position_code, position_name, position_level,
 *   min_salary, max_salary, competency_framework_id, description, status,
 *   created_at, updated_at
 */

const { pool } = require('../config/database');

/**
 * Get all job positions with optional search & filter
 */
async function getAll(filters = {}) {
  let sql = `
    SELECT
      position_id,
      position_code,
      position_name,
      position_level,
      min_salary,
      max_salary,
      competency_framework_id,
      description,
      status,
      created_at,
      updated_at
    FROM job_positions
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    sql += ` AND status = ?`;
    params.push(filters.status.toUpperCase());
  }

  if (filters.level) {
    sql += ` AND position_level = ?`;
    params.push(filters.level);
  }

  if (filters.search) {
    sql += ` AND (position_code LIKE ? OR position_name LIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term);
  }

  sql += ` ORDER BY position_id DESC`;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Find a job position by ID
 */
async function findById(id) {
  const sql = `
    SELECT
      position_id,
      position_code,
      position_name,
      position_level,
      min_salary,
      max_salary,
      competency_framework_id,
      description,
      status,
      created_at,
      updated_at
    FROM job_positions
    WHERE position_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Find a position by its unique code
 */
async function findByCode(code) {
  const sql = `
    SELECT position_id, position_code, position_name
    FROM job_positions
    WHERE UPPER(position_code) = UPPER(?)
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [code.trim()]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new job position
 */
async function create(data) {
  const sql = `
    INSERT INTO job_positions (
      position_code,
      position_name,
      position_level,
      min_salary,
      max_salary,
      competency_framework_id,
      description,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    data.position_code.trim().toUpperCase(),
    data.position_name.trim(),
    data.position_level || null,
    data.min_salary !== undefined ? Number(data.min_salary) : null,
    data.max_salary !== undefined ? Number(data.max_salary) : null,
    data.competency_framework_id || null,
    data.description || null,
    data.status ? data.status.toUpperCase() : 'ACTIVE',
  ];

  const [result] = await pool.execute(sql, params);
  return findById(result.insertId);
}

/**
 * Update an existing job position
 */
async function update(id, data) {
  const sql = `
    UPDATE job_positions
    SET
      position_name = ?,
      position_level = ?,
      min_salary = ?,
      max_salary = ?,
      competency_framework_id = ?,
      description = ?,
      status = ?
    WHERE position_id = ?
  `;
  const params = [
    data.position_name.trim(),
    data.position_level || null,
    data.min_salary !== undefined ? Number(data.min_salary) : null,
    data.max_salary !== undefined ? Number(data.max_salary) : null,
    data.competency_framework_id || null,
    data.description || null,
    data.status ? data.status.toUpperCase() : 'ACTIVE',
    id,
  ];

  await pool.execute(sql, params);
  return findById(id);
}

/**
 * Delete a position by ID
 */
async function deleteById(id) {
  const sql = `DELETE FROM job_positions WHERE position_id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  findById,
  findByCode,
  create,
  update,
  deleteById,
};
