/**
 * auditRepository.js
 * All database queries related to the 'audit_logs' table.
 * Records important security and admin actions.
 */

const { pool } = require('../config/database');

/**
 * Insert a new record into audit_logs.
 *
 * Columns used from the existing DB:
 *   audit_log_id  - AUTO_INCREMENT PK
 *   user_id       - The user the action was performed ON (subject)
 *   performed_by  - The user who triggered the action (actor)
 *   action        - e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT'
 *   entity_type   - e.g. 'users'
 *   entity_id     - e.g. '1' (the user_id as string)
 *   description   - Human-readable description
 *   ip_address    - Client IP address
 *   created_at    - Automatically set by MySQL
 *
 * @param {object} params
 * @param {number|null} params.userId       - Subject user_id (can be null)
 * @param {number|null} params.performedBy  - Actor user_id (can be null)
 * @param {string}      params.action       - Action code
 * @param {string|null} params.entityType   - Table name
 * @param {string|null} params.entityId     - Record PK
 * @param {string|null} params.description  - Description text
 * @param {string|null} params.ipAddress    - Client IP
 */
async function createLog({
  userId = null,
  performedBy = null,
  action,
  entityType = null,
  entityId = null,
  description = null,
  ipAddress = null,
}) {
  const sql = `
    INSERT INTO audit_logs
      (user_id, performed_by, action, entity_type, entity_id, description, ip_address)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [
    userId,
    performedBy,
    action,
    entityType,
    entityId,
    description,
    ipAddress,
  ]);
}

module.exports = { createLog };
