const { pool } = require('../config/database');

async function findCandidate(id) {
  // Internal staff can use tags/notes even when recruitment_requests is absent.
  const [rows] = await pool.execute(
    'SELECT id, recruitment_request_id FROM candidates WHERE id = ? LIMIT 1', [id]
  );
  return rows[0] || null;
}

async function findRequestDepartment(requestId) {
  try {
    const [rows] = await pool.execute(
      'SELECT department_id FROM recruitment_requests WHERE id = ? LIMIT 1', [requestId]
    );
    return rows[0]?.department_id ?? null;
  } catch (error) {
    // This query touches only the scope table. Missing table/columns cannot grant access.
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) return null;
    throw error;
  }
}

async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* Preserve the original error. */ }
    throw error;
  } finally {
    connection.release();
  }
}

async function findTagForUpdate(id, connection) {
  const [rows] = await connection.execute(
    'SELECT id, category_group, code, name, is_active FROM master_data WHERE id = ? FOR UPDATE', [id]
  );
  return rows[0] || null;
}

async function insertTag(candidateId, tagId, userId, connection) {
  await connection.execute(
    'INSERT INTO candidate_tags (candidate_id, tag_id, created_by) VALUES (?, ?, ?)',
    [candidateId, tagId, userId]
  );
}

async function getTags(candidateId) {
  // Do not filter is_active: previously attached inactive tags remain visible.
  const [rows] = await pool.execute(`
    SELECT ct.candidate_id, ct.tag_id, md.code, md.name, md.is_active,
           ct.created_by, ct.created_at
    FROM candidate_tags ct
    JOIN master_data md ON md.id = ct.tag_id
    WHERE ct.candidate_id = ?
    ORDER BY md.display_order ASC, md.name ASC, ct.tag_id ASC
  `, [candidateId]);
  return rows;
}

async function removeTag(candidateId, tagId) {
  const [result] = await pool.execute(
    'DELETE FROM candidate_tags WHERE candidate_id = ? AND tag_id = ?', [candidateId, tagId]
  );
  return result.affectedRows > 0;
}

async function insertNote(candidateId, authorId, content, connection) {
  const [result] = await connection.execute(
    'INSERT INTO candidate_notes (candidate_id, author_id, note_content) VALUES (?, ?, ?)',
    [candidateId, authorId, content]
  );
  const [rows] = await connection.execute(`
    SELECT n.id, n.candidate_id, n.note_content, n.author_id,
           u.full_name AS author_name, n.created_at
    FROM candidate_notes n
    JOIN users u ON u.user_id = n.author_id
    WHERE n.id = ?
  `, [result.insertId]);
  return rows[0];
}

async function getNotes(candidateId) {
  const [rows] = await pool.execute(`
    SELECT n.id, n.candidate_id, n.note_content, n.author_id,
           u.full_name AS author_name, n.created_at
    FROM candidate_notes n
    JOIN users u ON u.user_id = n.author_id
    WHERE n.candidate_id = ?
    ORDER BY n.created_at DESC, n.id DESC
  `, [candidateId]);
  return rows;
}

module.exports = {
  findCandidate, findRequestDepartment, withTransaction, findTagForUpdate,
  insertTag, getTags, removeTag, insertNote, getNotes
};
