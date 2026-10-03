/**
 * // Updated by dtc245200935
 * authMiddleware.js
 * Middleware to protect routes that require authentication.
 *
 * authenticate  - Verifies the JWT token AND validates the session in the DB.
 * authorize     - Checks whether the authenticated user has a specific permission.
 */

const jwt = require('jsonwebtoken');
const sessionRepository = require('../repositories/sessionRepository');
const userRepository    = require('../repositories/userRepository');
const { sendError }     = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// AUTHENTICATE MIDDLEWARE
// Protects any route that requires the user to be logged in.
// ─────────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    // Step 1: Read the Authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    // Step 2: Extract the token string after "Bearer "
    const token = authHeader.split(' ')[1];

    // Step 3: Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return sendError(res, 'Invalid or expired token.', 401);
    }

    const { userId, sessionToken } = decoded;

    // Step 4: Find the session in the database
    const session = await sessionRepository.findByToken(sessionToken);

    if (!session) {
      return sendError(res, 'Session not found. Please log in again.', 401);
    }

    // Step 5: Check that the session has not been revoked (logged out or locked)
    if (session.revoked_at !== null) {
      return sendError(res, 'Session has been revoked. Please log in again.', 401);
    }

    // Step 6: Check that the session has not expired
    if (new Date(session.expires_at) <= new Date()) {
      return sendError(res, 'Session has expired. Please log in again.', 401);
    }

    // Step 7: Find the user and check their status
    const user = await userRepository.findById(userId);

    if (!user) {
      return sendError(res, 'User account not found.', 401);
    }

    if (user.status !== 'ACTIVE') {
      // The account was locked or deactivated after they logged in
      return sendError(res, 'Your account is no longer active. Please contact an administrator.', 403);
    }

    // Step 8: Load roles and permissions
    const rolesAndPermissions = await userRepository.getRolesAndPermissions(userId);

    // Build unique roles list and permissions set
    const rolesMap = new Map();
    const permissionsSet = new Set();

    for (const row of rolesAndPermissions) {
      if (!rolesMap.has(row.role_id)) {
        rolesMap.set(row.role_id, {
          role_id:   row.role_id,
          role_code: row.role_code,
          role_name: row.role_name,
        });
      }
      if (row.permission_code) {
        permissionsSet.add(row.permission_code);
      }
    }

    // Step 9: Attach user info to req.user so controllers can use it
    req.user = {
      user_id:       user.user_id,
      employee_code: user.employee_code,
      full_name:     user.full_name,
      company_email: user.company_email,
      status:        user.status,
      sessionToken,                        // needed for logout
      roles:       Array.from(rolesMap.values()),
      permissions: Array.from(permissionsSet),
    };

    next(); // all checks passed, continue to the controller

  } catch (error) {
    next(error); // pass unexpected errors to the global error handler
  }
};

// ─────────────────────────────────────────────────────────────
// AUTHORIZE MIDDLEWARE FACTORY
// Returns a middleware that checks for a specific permission.
//
// Usage in routes:
//   router.get('/users', authenticate, authorize('USER_VIEW'), controller)
// ─────────────────────────────────────────────────────────────
const authorize = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authenticated.', 401);
    }

    if (!req.user.permissions.includes(requiredPermission)) {
      return sendError(
        res,
        'Bạn không có quyền truy cập chức năng này. Vui lòng liên hệ quản trị viên.',
        403
      );
    }

    next();
  };
};

module.exports = { authenticate, authorize };
