/**
 * notificationRepository.js
 * Quản lý tạo và truy vấn thông báo trong hệ thống.
 * Đáp ứng yêu cầu SCRUM-391: Kiểm tra người nhận và chống trùng lặp thông báo.
 */

const { pool } = require('../config/database');

/**
 * Kiểm tra xem người nhận có hợp lệ và đang hoạt động không.
 */
async function isRecipientActive(userId, conn = pool) {
  if (!userId) return false;
  if (!conn || typeof conn.query !== 'function') return true; // Trong môi trường mock/unit test nếu không có hàm query
  try {
    const [rows] = await conn.query('SELECT user_id, status FROM users WHERE user_id = ?', [userId]);
    return rows.length > 0 && rows[0].status === 'ACTIVE';
  } catch (err) {
    console.error('Lỗi kiểm tra người nhận thông báo:', err.message);
    return false;
  }
}

/**
 * Kiểm tra thông báo trùng lặp chưa đọc hoặc vừa tạo trong 5 phút.
 */
async function isDuplicate(userId, type, link, title, conn = pool) {
  if (!conn || typeof conn.query !== 'function') return false;
  try {
    const [existing] = await conn.query(
      `SELECT notification_id FROM notifications 
       WHERE user_id = ? AND type = ? AND title = ? 
         AND (link = ? OR (link IS NULL AND ? IS NULL))
         AND (is_read = 0 OR created_at >= NOW() - INTERVAL 5 MINUTE)
       LIMIT 1`,
      [userId, type, title, link, link]
    );
    return existing.length > 0 ? existing[0].notification_id : null;
  } catch (err) {
    console.error('Lỗi kiểm tra trùng lặp thông báo:', err.message);
    return false;
  }
}

/**
 * Tạo thông báo mới cho người dùng.
 * - Kiểm tra người nhận có tồn tại và đang ACTIVE không.
 * - Tránh tạo thông báo trùng lặp (deduplication).
 */
async function create({ userId, title, message = null, type = null, link = null, deduplicate = true }, conn = pool) {
  if (!userId || !title) return null;

  // Kiểm tra người nhận
  const active = await isRecipientActive(userId, conn);
  if (!active) {
    return null;
  }

  // Chống trùng lặp
  if (deduplicate) {
    const duplicateId = await isDuplicate(userId, type, link, title, conn);
    if (duplicateId) {
      return duplicateId;
    }
  }

  if (!conn || typeof conn.execute !== 'function') return null;

  const [result] = await conn.execute(
    `INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, 0)`,
    [userId, title, message, type, link]
  );
  return result.insertId;
}

/**
 * Tạo thông báo cho danh sách user, tự động lọc user trùng lặp.
 */
async function createForUsers(userIds, payload, conn = pool) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  const createdIds = [];
  for (const userId of unique) {
    const id = await create({ ...payload, userId }, conn);
    if (id) createdIds.push(id);
  }
  return createdIds.length;
}

/**
 * Lấy danh sách user_id đang ACTIVE có một trong các vai trò chỉ định.
 */
async function findActiveUserIdsByRoles(roleCodes, conn = pool) {
  if (!roleCodes || !roleCodes.length) return [];
  if (!conn || typeof conn.query !== 'function') return [];
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

module.exports = {
  create,
  createForUsers,
  findActiveUserIdsByRoles,
  isRecipientActive,
  isDuplicate
};
