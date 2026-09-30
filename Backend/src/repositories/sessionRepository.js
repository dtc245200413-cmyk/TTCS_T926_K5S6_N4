/**
 * sessionRepository.js
 * All database queries related to the 'user_sessions' table.
 * Handles creating, finding, and revoking login sessions.
 */

const { pool } = require('../config/database');

/**
 * Create a new session record in user_sessions.
 *
 * @param {number} userId       - The user who is logging in
 * @param {string} sessionToken - Unique random token stored in JWT payload
 * @param {Date}   expiresAt    - When this session expires
 * @returns {number} session_id of the created session
 */
async function createSession(userId, sessionToken, expiresAt) {
  const sql = `
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [userId, sessionToken, expiresAt]);
  return result.insertId;
}

/**
 * Find a session by its token.
 * Used in authentication middleware to validate incoming requests.
 *
 * @param {string} sessionToken
 * @returns {object|null} session row or null
 */
async function findByToken(sessionToken) {
  const sql = `
    SELECT
      session_id,
      user_id,
      session_token,
      created_at,
      expires_at,
      revoked_at
    FROM user_sessions
    WHERE session_token = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [sessionToken]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Revoke a single session by its token.
 * Sets revoked_at = NOW() so the session is no longer valid.
 * Called on logout.
 *
 * @param {string} sessionToken
 */
async function revokeByToken(sessionToken) {
  const sql = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE session_token = ?
  `;
  await pool.execute(sql, [sessionToken]);
}

/**
 * Revoke ALL active sessions for a user.
 * Called when an account is locked so existing logins are kicked out.
 *
 * @param {number} userId
 */
async function revokeAllByUserId(userId) {
  const sql = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE user_id = ? AND revoked_at IS NULL
  `;
  await pool.execute(sql, [userId]);
}

module.exports = {
  createSession,
  findByToken,
  revokeByToken,
  revokeAllByUserId,
};
