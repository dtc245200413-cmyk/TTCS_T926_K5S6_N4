/**
 * interviewQuestionRepository.js
 */

const { pool } = require('../config/database');

async function getAll({ search = '', difficulty = '', criteriaId = '', positionId = '', page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  let joinClause = `
    FROM interview_questions iq
    JOIN competency_criteria cc ON iq.criteria_id = cc.criteria_id
    JOIN competency_frameworks cf ON cc.framework_id = cf.framework_id
  `;

  if (positionId) {
    joinClause += `
      JOIN job_positions jp ON jp.competency_framework_id = cf.framework_id
    `;
    conditions.push('jp.position_id = ?');
    params.push(positionId);
  }

  if (search) {
    conditions.push('(iq.question_content LIKE ? OR iq.good_answer_hint LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  if (difficulty) {
    conditions.push('iq.difficulty_level = ?');
    params.push(difficulty);
  }

  if (criteriaId) {
    conditions.push('iq.criteria_id = ?');
    params.push(criteriaId);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const sql = `
    SELECT DISTINCT iq.*, cc.criteria_name, cf.framework_name, cf.framework_id
    ${joinClause}
    ${whereClause}
    ORDER BY iq.question_id DESC
    LIMIT ? OFFSET ?
  `;
  
  // Need to clone params for count
  const countParams = [...params];

  params.push(limitNum, offset);

  const [rows] = await pool.execute(sql, params);
  
  const countSql = `
    SELECT COUNT(DISTINCT iq.question_id) AS total 
    ${joinClause}
    ${whereClause}
  `;
  const [countRows] = await pool.execute(countSql, countParams);
  
  return {
    data: rows,
    total: countRows[0].total
  };
}

async function findById(questionId) {
  const sql = `
    SELECT iq.*, cc.criteria_name, cf.framework_name, cf.framework_id
    FROM interview_questions iq
    JOIN competency_criteria cc ON iq.criteria_id = cc.criteria_id
    JOIN competency_frameworks cf ON cc.framework_id = cf.framework_id
    WHERE iq.question_id = ? 
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [questionId]);
  return rows.length > 0 ? rows[0] : null;
}

async function create({ criteriaId, questionContent, difficultyLevel, goodAnswerHint }) {
  const sql = `
    INSERT INTO interview_questions (criteria_id, question_content, difficulty_level, good_answer_hint)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    criteriaId,
    questionContent,
    difficultyLevel || 'MEDIUM',
    goodAnswerHint || null
  ]);
  return result.insertId;
}

async function update(questionId, fields) {
  const ALLOWED = ['criteria_id', 'question_content', 'difficulty_level', 'good_answer_hint'];
  const setClauses = [];
  const params = [];

  for (const key of ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      params.push(fields[key] === undefined ? null : fields[key]);
    }
  }

  if (setClauses.length === 0) return false;

  params.push(questionId);
  const sql = `UPDATE interview_questions SET ${setClauses.join(', ')} WHERE question_id = ?`;
  const [result] = await pool.execute(sql, params);
  return result.affectedRows > 0;
}

async function deleteQuestion(questionId) {
  const sql = `DELETE FROM interview_questions WHERE question_id = ?`;
  const [result] = await pool.execute(sql, [questionId]);
  return result.affectedRows > 0;
}

// Helper to get all criteria for dropdowns (grouped by framework)
async function getAllCriteria() {
  const sql = `
    SELECT cc.criteria_id, cc.criteria_name, cf.framework_id, cf.framework_name
    FROM competency_criteria cc
    JOIN competency_frameworks cf ON cc.framework_id = cf.framework_id
    ORDER BY cf.framework_name, cc.criteria_name
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

module.exports = {
  getAll,
  findById,
  create,
  update,
  deleteQuestion,
  getAllCriteria
};
