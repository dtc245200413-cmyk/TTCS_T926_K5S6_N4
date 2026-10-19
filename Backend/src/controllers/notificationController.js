const { pool } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Lấy danh sách thông báo của người dùng hiện tại (chỉ xem thông báo của chính mình).
 * Hỗ trợ bộ lọc: filter = 'all' | 'unread' | 'read'
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { filter, type, limit = 50 } = req.query;

    let queryConditions = ['user_id = ?'];
    let queryParams = [userId];

    if (filter === 'unread' || req.query.is_read === '0' || req.query.is_read === 'false') {
      queryConditions.push('is_read = FALSE');
    } else if (filter === 'read' || req.query.is_read === '1' || req.query.is_read === 'true') {
      queryConditions.push('is_read = TRUE');
    }

    if (type) {
      queryConditions.push('type = ?');
      queryParams.push(type);
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    queryParams.push(parsedLimit);

    const [rows] = await pool.query(
      `SELECT notification_id, user_id, title, message, type, link, is_read, created_at
       FROM notifications 
       WHERE ${queryConditions.join(' AND ')}
       ORDER BY created_at DESC 
       LIMIT ?`,
      queryParams
    );

    const [unreadResult] = await pool.query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    const [totalResult] = await pool.query(
      `SELECT COUNT(*) as total_count FROM notifications WHERE user_id = ?`,
      [userId]
    );

    return sendSuccess(res, 'Lấy thông báo thành công', {
      notifications: rows,
      unreadCount: unreadResult[0]?.unread_count || 0,
      totalCount: totalResult[0]?.total_count || 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Đánh dấu một hoặc tất cả thông báo là đã đọc (hoặc cập nhật trạng thái đã đọc theo body).
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;
    const shouldRead = req.body && req.body.is_read !== undefined ? Boolean(req.body.is_read) : true;

    if (id === 'all') {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = ? WHERE notification_id = ? AND user_id = ?`,
        [shouldRead ? 1 : 0, id, userId]
      );
    }

    return sendSuccess(res, 'Cập nhật trạng thái thông báo thành công');
  } catch (error) {
    next(error);
  }
};

/**
 * Đánh dấu một thông báo là chưa đọc.
 */
const markAsUnread = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    await pool.query(
      `UPDATE notifications SET is_read = FALSE WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    return sendSuccess(res, 'Đánh dấu chưa đọc thành công');
  } catch (error) {
    next(error);
  }
};

/**
 * Đổi trạng thái đã đọc / chưa đọc của thông báo.
 */
const toggleRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [notif] = await pool.query(
      `SELECT is_read FROM notifications WHERE notification_id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!notif.length) {
      return sendError(res, 'Không tìm thấy thông báo', 404);
    }

    const newStatus = !notif[0].is_read;
    await pool.query(
      `UPDATE notifications SET is_read = ? WHERE notification_id = ? AND user_id = ?`,
      [newStatus ? 1 : 0, id, userId]
    );

    return sendSuccess(res, 'Chuyển đổi trạng thái thông báo thành công', { is_read: newStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    return sendSuccess(res, 'Đã đánh dấu tất cả thông báo là đã đọc');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAsUnread,
  toggleRead,
  markAllAsRead
};
