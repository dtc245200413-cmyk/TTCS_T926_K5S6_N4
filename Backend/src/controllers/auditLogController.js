const { pool } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    // Only Admin can view audit logs
    const isAdmin = req.user.roles && req.user.roles.some((r) => r.role_code === 'ADMIN');
    if (!isAdmin) {
      return sendError(res, 'Chỉ Quản trị viên mới có quyền xem nhật ký hoạt động.', 403);
    }

    const { limit = 50, offset = 0 } = req.query;

    const [rows] = await pool.query(
      `SELECT al.*, u.full_name as user_name, u.employee_code
       FROM audit_logs al
       LEFT JOIN users u ON al.performed_by = u.user_id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), Number(offset)]
    );

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = countResult[0].total;

    return sendSuccess(res, 'Lấy danh sách nhật ký hoạt động thành công', {
      logs: rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
