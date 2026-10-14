/**
 * notificationRepository.js
 * Tạo thông báo trong hệ thống (chuông thông báo trên Header).
 */

const { pool } = require('../config/database');

async function create({ userId, title, message = null, type = null, link = null }, conn = pool) {
  const [result] = await conn.execute(
    `INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, title, message, type, link]
  );
  return result.insertId;
}

async function createForUsers(userIds, payload, conn = pool) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    await create({ ...payload, userId }, conn);
  }
  return unique.length;
}

/** Lấy danh sách user_id đang ACTIVE có một trong các vai trò. */
async function findActiveUserIdsByRoles(roleCodes, conn = pool) {
  if (!roleCodes.length) return [];
  const placeholders = roleCodes.map(() => '?').join(',');
  const [rows] = await conn.query(
    `SELECT DISTINCT u.user_id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.user_id
     JOIN roles r ON r.role_id = ur.role_id
     WHERE u.status = 'ACTIVE' AND r.role_code IN (${placeholders})`,
    roleCodes
  );
  return rows.map((r) => r.user_id);
}

module.exports = { create, createForUsers, findActiveUserIdsByRoles };
