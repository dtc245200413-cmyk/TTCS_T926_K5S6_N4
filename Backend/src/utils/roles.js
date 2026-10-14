/**
 * roles.js
 * Helper kiểm tra vai trò của req.user (được gắn bởi authMiddleware.authenticate).
 */

const { sendError } = require('./response');

function hasAnyRole(user, ...roleCodes) {
  if (!user || !Array.isArray(user.roles)) return false;
  return user.roles.some((r) => roleCodes.includes(r.role_code));
}

/** Middleware: chỉ cho phép các vai trò được liệt kê. */
function requireRoles(...roleCodes) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Not authenticated.', 401);
    if (!hasAnyRole(req.user, ...roleCodes)) {
      return sendError(res, 'Bạn không có quyền thực hiện chức năng này.', 403);
    }
    next();
  };
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { hasAnyRole, requireRoles, getIp, httpError };
