/**
 * auditRepository.js
 * Database queries for audit_logs.
 */

const { pool } = require('../config/database');

/**
 * Tạo một bản ghi audit log.
 *
 * @param {Object} params
 * @param {number|null} params.userId
 * @param {number|null} params.performedBy
 * @param {string} params.action
 * @param {string|null} params.entityType
 * @param {string|null} params.entityId
 * @param {string|null} params.description
 * @param {string|null} params.ipAddress
 */
async function createLog({
  userId = null,
  performedBy = null,
  action,
  entityType = null,
  entityId = null,
  description = null,
  ipAddress = null
}) {
  const sql = `
    INSERT INTO audit_logs
      (
        user_id,
        performed_by,
        action,
        entity_type,
        entity_id,
        description,
        ip_address
      )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.execute(sql, [
    userId ?? null,
    performedBy ?? null,
    action ?? null,
    entityType ?? null,
    entityId ?? null,
    description ?? null,
    ipAddress ?? null
  ]);
}

/**
 * Hàm create tương thích với code cũ.
 * Một số service cũ có thể vẫn gọi auditRepo.create().
 */
async function create(params) {
  return createLog(params);
}

module.exports = {
  createLog,
  create
};