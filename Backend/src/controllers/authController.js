/**
 * authController.js
 * HTTP handlers for authentication endpoints.
 * UPDATED in Part 2: added forgotPassword, resetPassword, changePassword.
 */

const authService            = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');

// ─────────────────────────────────────────────
//  Helper: get client IP address
// ─────────────────────────────────────────────
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

// ─────────────────────────────────────────────
//  PART 1: LOGIN
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Please provide a valid email address.', 400);
    }

    const { token, user } = await authService.login(email, password, getIp(req));

    return sendSuccess(res, 'Login successful.', { token, user });

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PART 1: LOGOUT
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.user_id, req.user.sessionToken, getIp(req));
    return sendSuccess(res, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PART 1: GET CURRENT USER
// ─────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const userProfile = await authService.getCurrentUser(req.user.user_id);
    return sendSuccess(res, 'User profile retrieved successfully.', userProfile);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PART 2: FORGOT PASSWORD
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'Email is required.', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Please provide a valid email address.', 400);
    }

    const result = await authService.forgotPassword(email, getIp(req));

    // result contains { message } and optionally { devToken, devNote } in dev mode
    return sendSuccess(res, result.message, result.devToken ? {
      devToken: result.devToken,
      devNote:  result.devNote,
    } : null);

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PART 2: RESET PASSWORD
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return sendError(res, 'Reset token is required.', 400);
    }

    if (!newPassword) {
      return sendError(res, 'New password is required.', 400);
    }

    await authService.resetPassword(token, newPassword, getIp(req));

    return sendSuccess(res, 'Password has been reset successfully. Please log in with your new password.');

  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PART 2: CHANGE PASSWORD (requires auth)
// ─────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Both currentPassword and newPassword are required.', 400);
    }

    await authService.changePassword(
      req.user.user_id,
      currentPassword,
      newPassword,
      getIp(req)
    );

    return sendSuccess(
      res,
      'Password changed successfully. All sessions have been logged out. Please log in again.'
    );

  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, me, forgotPassword, resetPassword, changePassword };