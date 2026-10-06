/**
 * competencyRepository.js
 * Database operations for Competency criteria management.
 */

const { pool } = require('../config/database');

/**
 * Get all competencies ordered by ID ascending.
 */
async function findAll() {
  const sql = `
    SELECT
      id,
      name,
      description,
      created_at
    FROM competencies
    ORDER BY id ASC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

/**
 * Find competency by ID.
 */
async function findById(id) {
  const sql = `
    SELECT
      id,
      name,
      description,
      created_at
    FROM competencies
    WHERE id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Find competency by exact name (case-insensitive).
 */
async function findByName(name) {
  const sql = `
    SELECT
      id,
      name,
      description,
      created_at
    FROM competencies
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [name.trim()]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Insert a new competency.
 */
async function create({ name, description }) {
  const sql = `
    INSERT INTO competencies (name, description)
    VALUES (?, ?)
  `;
  const [result] = await pool.execute(sql, [
    name.trim(),
    description ? description.trim() : null
  ]);
  return result.insertId;
}

/**
 * Update an existing competency.
 */
async function update(id, { name, description }) {
  const sql = `
    UPDATE competencies
    SET
      name = ?,
      description = ?
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [
    name.trim(),
    description ? description.trim() : null,
    id
  ]);
  return result.affectedRows > 0;
}

/**
 * Delete a competency by ID.
 */
async function deleteById(id) {
  const sql = `DELETE FROM competencies WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  deleteById
};
