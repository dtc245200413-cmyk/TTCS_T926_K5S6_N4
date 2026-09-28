/**
 * passwordResetRepository.js
 * SQL queries for the 'password_reset_tokens' table.
 *
 * DB columns:
 *   reset_token_id  INT PK AUTO_INCREMENT
 *   user_id         INT FK -> users
 *   token_hash      VARCHAR(255) UNIQUE  <- SHA-256 hash of the raw token
 *   expires_at      DATETIME
 *   used_at         DATETIME  (NULL = not yet used)
 *   created_at      TIMESTAMP
 */

const { pool } = require('../config/database');

/**
 * Store a new password reset token (hashed).
 *
 * @param {number} userId
 * @param {string} tokenHash  - SHA-256 hash of the raw token
 * @param {Date}   expiresAt  - Expiry time (30 minutes from now)
 * @returns {number} reset_token_id of the inserted row
 */
async function create(userId, tokenHash, expiresAt) {
  const sql = `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [userId, tokenHash, expiresAt]);
  return result.insertId;
}

/**
 * Find a valid (unused, not expired) token by its hash.
 *
 * @param {string} tokenHash
 * @returns {object|null}
 */
async function findValidByHash(tokenHash) {
  const sql = `
    SELECT
      reset_token_id,
      user_id,
      token_hash,
      expires_at,
      used_at,
      created_at
    FROM password_reset_tokens
    WHERE token_hash = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [tokenHash]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Mark a token as used (set used_at = NOW()).
 * Must be called after the password has been successfully reset.
 * Uses the DB connection from an active transaction when provided.
 *
 * @param {number} resetTokenId
 * @param {object} conn - Optional: a transaction connection from pool.getConnection()
 */
async function markAsUsed(resetTokenId, conn = null) {
  const db = conn || pool;
  const sql = `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE reset_token_id = ?
  `;
  await db.execute(sql, [resetTokenId]);
}

module.exports = { create, findValidByHash, markAsUsed };
