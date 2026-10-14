const { pool } = require('../config/database');

// Rating, merge and undo must lock candidate parents before touching child rows.
// Individual primary-key reads make lock order independent of the query plan.
async function lockCandidates(connection, ids) {
  const rows = [];
  for (const id of [...new Set(ids.map(Number))].sort((a, b) => a - b)) {
    const [candidates] = await connection.execute(
      'SELECT * FROM candidates WHERE id = ? FOR UPDATE', [id]
    );
    if (candidates[0]) rows.push(candidates[0]);
  }
  return rows;
}

async function withCandidateTransaction(work) {
  const connection = await pool.getConnection();
  let reusable = true;
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    // Roll back the entire transaction, including lock-wait timeouts (which may
    // only roll back the failing statement in MySQL). Never replay an uncertain commit.
    try { await connection.rollback(); } catch (_) { reusable = false; }
    if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) {
      throw Object.assign(new Error('Hồ sơ đang được cập nhật bởi thao tác khác. Vui lòng tải lại và thử lại.'), { statusCode: 409 });
    }
    throw error;
  } finally {
    if (reusable) connection.release();
    else connection.destroy(); // Never return a connection with uncertain transaction state.
  }
}

module.exports = { lockCandidates, withCandidateTransaction };
