/**
 * jobPositionRepository.js
 */
const { pool } = require('../config/database');

async function findAll() {
  const [rows] = await pool.execute('SELECT * FROM job_positions ORDER BY position_name');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM job_positions WHERE position_id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  findAll,
  findById
};
