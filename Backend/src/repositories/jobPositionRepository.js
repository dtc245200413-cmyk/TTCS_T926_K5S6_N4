/**
 * jobPositionRepository.js
 * Database queries for job_positions.
 */

const { pool } = require('../config/database');

async function getAll({ search = '', status = '', page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(position_code LIKE ? OR position_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const sql = `
    SELECT *
    FROM job_positions
    ${whereClause}
    ORDER BY position_id DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limitNum, offset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function countAll({ search = '', status = '' }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(position_code LIKE ? OR position_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `SELECT COUNT(*) AS total FROM job_positions ${whereClause}`;
  const [rows] = await pool.execute(sql, params);
  return rows[0].total;
}

async function findById(positionId) {
  const sql = `SELECT * FROM job_positions WHERE position_id = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [positionId]);
  return rows.length > 0 ? rows[0] : null;
}

async function findByCode(code) {
  const sql = `SELECT * FROM job_positions WHERE position_code = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [code]);
  return rows.length > 0 ? rows[0] : null;
}

async function create({ positionCode, positionName, positionLevel, minSalary, maxSalary, description }) {
  const sql = `
    INSERT INTO job_positions
      (position_code, position_name, position_level, min_salary, max_salary, description, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `;
  const [result] = await pool.execute(sql, [
    positionCode,
    positionName,
    positionLevel || null,
    minSalary || null,
    maxSalary || null,
    description || null
  ]);
  return result.insertId;
}

async function update(positionId, fields) {
  const ALLOWED = ['position_name', 'position_level', 'min_salary', 'max_salary', 'description', 'status'];
  const setClauses = [];
  const params = [];

  for (const key of ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      params.push(fields[key] === undefined ? null : fields[key]);
    }
  }

  if (setClauses.length === 0) return false;

  params.push(positionId);
  const sql = `UPDATE job_positions SET ${setClauses.join(', ')} WHERE position_id = ?`;
  const [result] = await pool.execute(sql, params);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  countAll,
  findById,
  findByCode,
  create,
  update
};
