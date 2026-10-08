/**
 * competencyFrameworkRepository.js
 * Database queries for competency frameworks and criteria.
 */

const { pool } = require('../config/database');

async function getAll({ search = '', page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(framework_code LIKE ? OR framework_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const sql = `
    SELECT *
    FROM competency_frameworks
    ${whereClause}
    ORDER BY framework_id DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limitNum, offset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function countAll({ search = '' }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(framework_code LIKE ? OR framework_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `SELECT COUNT(*) AS total FROM competency_frameworks ${whereClause}`;
  const [rows] = await pool.execute(sql, params);
  return rows[0].total;
}

async function findById(frameworkId) {
  const sql = `SELECT * FROM competency_frameworks WHERE framework_id = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [frameworkId]);
  return rows.length > 0 ? rows[0] : null;
}

async function findByCode(code) {
  const sql = `SELECT * FROM competency_frameworks WHERE framework_code = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [code]);
  return rows.length > 0 ? rows[0] : null;
}

async function getCriteriaByFrameworkId(frameworkId, conn = pool) {
  const sql = `SELECT * FROM competency_criteria WHERE framework_id = ?`;
  const [rows] = await conn.execute(sql, [frameworkId]);
  return rows;
}

async function createFramework(frameworkData, criteriaList) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sql = `
      INSERT INTO competency_frameworks (framework_code, framework_name, description)
      VALUES (?, ?, ?)
    `;
    const [result] = await conn.execute(sql, [
      frameworkData.frameworkCode,
      frameworkData.frameworkName,
      frameworkData.description || null
    ]);
    
    const frameworkId = result.insertId;

    if (criteriaList && criteriaList.length > 0) {
      const criteriaSql = `
        INSERT INTO competency_criteria (framework_id, criteria_name, weight, description)
        VALUES (?, ?, ?, ?)
      `;
      for (const criteria of criteriaList) {
        await conn.execute(criteriaSql, [
          frameworkId,
          criteria.criteria_name,
          criteria.weight,
          criteria.description || null
        ]);
      }
    }

    await conn.commit();
    return frameworkId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function updateFramework(frameworkId, frameworkData, criteriaList) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (frameworkData) {
      const setClauses = [];
      const params = [];
      const ALLOWED = ['framework_name', 'description'];
      
      for (const key of ALLOWED) {
        if (Object.prototype.hasOwnProperty.call(frameworkData, key)) {
          setClauses.push(`${key} = ?`);
          params.push(frameworkData[key] === undefined ? null : frameworkData[key]);
        }
      }

      if (setClauses.length > 0) {
        params.push(frameworkId);
        const sql = `UPDATE competency_frameworks SET ${setClauses.join(', ')} WHERE framework_id = ?`;
        await conn.execute(sql, params);
      }
    }

    if (criteriaList !== undefined) {
      // For simplicity, we delete all existing criteria and re-insert them
      await conn.execute(`DELETE FROM competency_criteria WHERE framework_id = ?`, [frameworkId]);
      
      if (criteriaList.length > 0) {
        const criteriaSql = `
          INSERT INTO competency_criteria (framework_id, criteria_name, weight, description)
          VALUES (?, ?, ?, ?)
        `;
        for (const criteria of criteriaList) {
          await conn.execute(criteriaSql, [
            frameworkId,
            criteria.criteria_name,
            criteria.weight,
            criteria.description || null
          ]);
        }
      }
    }

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function deleteFramework(frameworkId) {
  const sql = `DELETE FROM competency_frameworks WHERE framework_id = ?`;
  const [result] = await pool.execute(sql, [frameworkId]);
  return result.affectedRows > 0;
}

module.exports = {
  getAll,
  countAll,
  findById,
  findByCode,
  getCriteriaByFrameworkId,
  createFramework,
  updateFramework,
  deleteFramework
};
