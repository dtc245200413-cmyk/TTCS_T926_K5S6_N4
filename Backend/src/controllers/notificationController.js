const { pool } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    const [unreadCount] = await pool.query(
      `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );

    return sendSuccess(res, 'Lấy thông báo thành công', {
      notifications: rows,
      unreadCount: unreadCount[0].c
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    if (id === 'all') {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
        [userId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?`,
        [id, userId]
      );
    }

    return sendSuccess(res, 'Cập nhật trạng thái thông báo thành công');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead
};
