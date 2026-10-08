/**
 * questionRepository.js
 * Database queries for Question Bank management (SCRUM-74).
 */

const { pool } = require('../config/database');

/**
 * Get all questions with filters, search, and pagination.
 */
async function findAll({
  search = '',
  competency_criteria_id = null,
  difficulty_level = null,
  page = 1,
  limit = 10,
  sortBy = 'q.id',
  sortOrder = 'DESC'
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  if (search && search.trim() !== '') {
    conditions.push(`(q.question_text LIKE ? OR q.sample_answer LIKE ? OR c.name LIKE ?)`);
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (competency_criteria_id) {
    conditions.push(`q.competency_criteria_id = ?`);
    params.push(parseInt(competency_criteria_id, 10));
  }

  if (difficulty_level && difficulty_level !== 'ALL') {
    conditions.push(`q.difficulty_level = ?`);
    params.push(difficulty_level);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Safe sorting columns whitelist
  const allowedSortCols = {
    id: 'q.id',
    difficulty_level: 'q.difficulty_level',
    created_at: 'q.created_at',
    criteria_name: 'c.name',
    name: 'c.name'
  };
  const sanitizedSortBy = allowedSortCols[sortBy] || 'q.id';
  const sanitizedOrder = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  // Count query
  const countSql = `
    SELECT COUNT(*) AS total
    FROM questions q
    LEFT JOIN competencies c ON q.competency_criteria_id = c.id
    ${whereClause}
  `;
  const [countRows] = await pool.execute(countSql, params);
  const total = (countRows && countRows.length > 0) ? Number(countRows[0].total ?? countRows[0]['COUNT(*)'] ?? 0) : 0;
  const totalPages = Math.ceil(total / limitNum) || 1;

  // Data query
  const dataSql = `
    SELECT
      q.id,
      q.competency_criteria_id,
      q.competency_criteria_id AS competency_id,
      q.difficulty_level,
      q.question_text,
      q.sample_answer,
      q.created_at,
      q.updated_at,
      c.name AS criteria_name,
      c.name AS competency_name,
      c.name,
      c.description
    FROM questions q
    LEFT JOIN competencies c ON q.competency_criteria_id = c.id
    ${whereClause}
    ORDER BY ${sanitizedSortBy} ${sanitizedOrder}
    LIMIT ${limitNum} OFFSET ${offset}
  `;

  const [rows] = await pool.execute(dataSql, params);

  return {
    questions: rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
}

/**
 * Find question by ID with competency details.
 */
async function findById(id) {
  const sql = `
    SELECT
      q.id,
      q.competency_criteria_id,
      q.competency_criteria_id AS competency_id,
      q.difficulty_level,
      q.question_text,
      q.sample_answer,
      q.created_at,
      q.updated_at,
      c.name AS criteria_name,
      c.name AS competency_name,
      c.name,
      c.description
    FROM questions q
    LEFT JOIN competencies c ON q.competency_criteria_id = c.id
    WHERE q.id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Insert a new question.
 */
async function create({ competency_criteria_id, difficulty_level, question_text, sample_answer }) {
  const sql = `
    INSERT INTO questions (competency_criteria_id, difficulty_level, question_text, sample_answer)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    competency_criteria_id,
    difficulty_level,
    question_text,
    sample_answer || null
  ]);
  return result.insertId;
}

/**
 * Update an existing question.
 */
async function update(id, { competency_criteria_id, difficulty_level, question_text, sample_answer }) {
  const sql = `
    UPDATE questions
    SET
      competency_criteria_id = ?,
      difficulty_level = ?,
      question_text = ?,
      sample_answer = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const [result] = await pool.execute(sql, [
    competency_criteria_id,
    difficulty_level,
    question_text,
    sample_answer || null,
    id
  ]);
  return result.affectedRows > 0;
}

/**
 * Delete a question by ID.
 */
async function deleteById(id) {
  const sql = `DELETE FROM questions WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows > 0;
}

/**
 * Get all competencies for dropdown selectors.
 */
async function getAllCriteria() {
  const sql = `
    SELECT
      c.id,
      c.id AS criteria_id,
      c.name,
      c.name AS criteria_name,
      c.description,
      c.created_at
    FROM competencies c
    ORDER BY c.id ASC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

/**
 * Get quick statistics of questions by difficulty level and total.
 */
async function getSummaryStats() {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN difficulty_level = 'Easy' THEN 1 ELSE 0 END) AS easyCount,
      SUM(CASE WHEN difficulty_level = 'Medium' THEN 1 ELSE 0 END) AS mediumCount,
      SUM(CASE WHEN difficulty_level = 'Hard' THEN 1 ELSE 0 END) AS hardCount,
      COUNT(DISTINCT competency_criteria_id) AS criteriaWithQuestions
    FROM questions
  `;
  const [rows] = await pool.execute(sql);
  return rows[0] || { total: 0, easyCount: 0, mediumCount: 0, hardCount: 0, criteriaWithQuestions: 0 };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  deleteById,
  getAllCriteria,
  getSummaryStats
};
