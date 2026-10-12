const { pool } = require('../config/database');

// Check candidate existence and status without recruitment joins.
async function findCandidateById(candidateId) {
  const [rows] = await pool.execute(
    'SELECT id, status FROM candidates WHERE id = ? LIMIT 1', [candidateId]
  );
  return rows[0] || null;
}

async function upsertRating(candidateId, reviewerId, rating, comment) {
  await pool.execute(`
    INSERT INTO candidate_ratings (candidate_id, reviewer_id, rating, comment)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE rating = ?, comment = ?
  `, [candidateId, reviewerId, rating, comment, rating, comment]);
}

async function getRatingsByCandidate(candidateId) {
  const [rows] = await pool.execute(`
    SELECT cr.reviewer_id, u.full_name AS reviewer_name,
           cr.rating, cr.comment, cr.created_at, cr.updated_at
    FROM candidate_ratings cr
    JOIN users u ON u.user_id = cr.reviewer_id
    WHERE cr.candidate_id = ?
    ORDER BY cr.updated_at DESC, cr.id DESC
  `, [candidateId]);
  return rows;
}

async function getRatingByReviewer(candidateId, reviewerId) {
  const [rows] = await pool.execute(`
    SELECT rating, comment, created_at, updated_at
    FROM candidate_ratings
    WHERE candidate_id = ? AND reviewer_id = ?
    LIMIT 1
  `, [candidateId, reviewerId]);
  return rows[0] || null;
}

async function getSummary(candidateId) {
  const [rows] = await pool.execute(`
    SELECT AVG(rating) AS average_rating, COUNT(*) AS rating_count
    FROM candidate_ratings
    WHERE candidate_id = ?
  `, [candidateId]);
  // mysql2 returns DECIMAL aggregates as strings by default.
  return {
    average_rating: rows[0].average_rating === null ? null : Number(rows[0].average_rating),
    rating_count: Number(rows[0].rating_count)
  };
}

module.exports = {
  findCandidateById,
  upsertRating,
  getRatingsByCandidate,
  getRatingByReviewer,
  getSummary
};
