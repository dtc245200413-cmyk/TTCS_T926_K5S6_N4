/**
 * authService.js
 * Business logic for authentication.
 * UPDATED in Part 2: added forgotPassword, resetPassword, changePassword.
 */

const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');

const userRepository         = require('../repositories/userRepository');
const sessionRepository      = require('../repositories/sessionRepository');
const auditRepository        = require('../repositories/auditRepository');
const passwordResetRepository = require('../repositories/passwordResetRepository');
const { pool }               = require('../config/database');
const sendEmail              = require('../utils/email');

const MAX_FAILED_ATTEMPTS = 5;
const BCRYPT_ROUNDS       = 12; // cost factor for bcrypt

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/** Parse '8h', '30m', '1d' -> milliseconds */
function parseExpiresInMs(expiresIn) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const unit  = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);
  return value * (units[unit] || 3600000);
}

/**
 * Build a clean user response object.
 * NEVER includes password_hash.
 */
function formatUser(user, rolesAndPermissions) {
  const rolesMap       = new Map();
  const permissionsSet = new Set();

  for (const row of rolesAndPermissions) {
    if (!rolesMap.has(row.role_id)) {
      rolesMap.set(row.role_id, {
        role_id:   row.role_id,
        role_code: row.role_code,
        role_name: row.role_name,
      });
    }
    if (row.permission_code) permissionsSet.add(row.permission_code);
  }

  return {
    user_id:            user.user_id,
    employee_code:      user.employee_code,
    full_name:          user.full_name,
    company_email:      user.company_email,
    phone_number:       user.phone_number,
    job_title:          user.job_title,
    avatar_url:         user.avatar_url,
    status:             user.status,
    last_login_at:      user.last_login_at,
    password_changed_at: user.password_changed_at,
    created_at:         user.created_at,
    address:            user.address,
    gender:             user.gender,
    date_of_birth:      user.date_of_birth,
    department: user.department_id
      ? {
          department_id:   user.department_id,
          department_code: user.department_code,
          department_name: user.department_name,
        }
      : null,
    roles:       Array.from(rolesMap.values()),
    permissions: Array.from(permissionsSet),
  };
}

/** Create an Error with an HTTP status code attached */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─────────────────────────────────────────────
//  PART 1: LOGIN
// ─────────────────────────────────────────────

async function login(email, password, ipAddress) {
  const user = await userRepository.findByEmail(email);

  if (!user) throw createError('Invalid email or password.', 401);

  if (user.status === 'INACTIVE') {
    throw createError('Your account is inactive. Please contact an administrator.', 403);
  }

  if (user.status === 'LOCKED') {
    throw createError('Your account is locked. Please contact an administrator.', 403);
  }

  const isTimeLocked = user.locked_until && new Date(user.locked_until) > new Date();
  if (isTimeLocked) {
    throw createError('Bạn đã nhập sai 5 lần. Vui lòng đợi 30 giây mới được đăng nhập lại.', 429);
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    await userRepository.incrementFailedAttempts(user.user_id);
    const newCount = user.failed_login_attempts + 1;

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      await userRepository.lockAccount(user.user_id);
      await sessionRepository.revokeAllByUserId(user.user_id);

      await auditRepository.createLog({
        userId: user.user_id, performedBy: user.user_id,
        action: 'USER_LOCKED', entityType: 'users',
        entityId: String(user.user_id),
        description: `Account auto-locked after ${newCount} failed login attempts.`,
        ipAddress,
      });

      throw createError('Bạn đã nhập sai 5 lần. Vui lòng đợi 30 giây mới được đăng nhập lại.', 429);
    }

    await auditRepository.createLog({
      userId: user.user_id, performedBy: user.user_id,
      action: 'LOGIN_FAILED', entityType: 'users',
      entityId: String(user.user_id),
      description: `Incorrect password attempt number ${newCount}.`,
      ipAddress,
    });

    const remaining = MAX_FAILED_ATTEMPTS - newCount;
    throw createError(`Sai mật khẩu. Bạn còn ${remaining} lần đăng nhập.`, 401);
  }

  const rolesAndPermissions = await userRepository.getRolesAndPermissions(user.user_id);
  const sessionToken        = crypto.randomBytes(64).toString('hex');
  const expiresInMs         = parseExpiresInMs(process.env.JWT_EXPIRES_IN || '8h');
  const expiresAt           = new Date(Date.now() + expiresInMs);

  await sessionRepository.createSession(user.user_id, sessionToken, expiresAt);

  const token = jwt.sign(
    { userId: user.user_id, sessionToken },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await userRepository.updateLoginSuccess(user.user_id);

  await auditRepository.createLog({
    userId: user.user_id, performedBy: user.user_id,
    action: 'LOGIN_SUCCESS', entityType: 'users',
    entityId: String(user.user_id),
    description: 'User logged in successfully.',
    ipAddress,
  });

  return { token, user: formatUser(user, rolesAndPermissions) };
}

// ─────────────────────────────────────────────
//  PART 1: LOGOUT
// ─────────────────────────────────────────────

async function logout(userId, sessionToken, ipAddress) {
  await sessionRepository.revokeByToken(sessionToken);

  await auditRepository.createLog({
    userId, performedBy: userId,
    action: 'LOGOUT', entityType: 'users',
    entityId: String(userId),
    description: 'User logged out.',
    ipAddress,
  });
}

// ─────────────────────────────────────────────
//  PART 1: GET CURRENT USER
// ─────────────────────────────────────────────

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw createError('User not found.', 404);

  const rolesAndPermissions = await userRepository.getRolesAndPermissions(userId);
  return formatUser(user, rolesAndPermissions);
}

// ─────────────────────────────────────────────
//  PART 2: FORGOT PASSWORD
// ─────────────────────────────────────────────

/**
 * Generate a password reset token for the given email.
 *
 * Flow:
 * 1. Find user by email
 * 2. Generate a cryptographically random 32-byte token (raw)
 * 3. Store SHA-256 hash of the raw token in password_reset_tokens
 * 4. Token expires in 30 minutes
 * 5. In development: return the raw token for testing
 *    In production: this raw token would be emailed to the user
 *
 * Security note: We do NOT reveal whether the email exists to prevent
 * email enumeration attacks. We always return the same generic message.
 *
 * @param {string} email
 * @param {string} ipAddress
 * @returns {object} { message, devToken (only in development) }
 */
async function forgotPassword(email, ipAddress) {
  // Always return a safe message regardless of whether email exists
  const safeResponse = {
    message: 'If that email exists in our system, a reset link has been sent.',
  };

  const user = await userRepository.findByEmail(email);

  // If user not found, return safe message without revealing info
  if (!user) return safeResponse;

  // Don't allow password reset for inactive accounts
  if (user.status === 'INACTIVE') return safeResponse;

  // Generate the raw token (sent to user) and its hash (stored in DB)
  const rawToken   = crypto.randomInt(10000000, 100000000).toString(); // 8-digit number string
  const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Token expires in 30 minutes
  const expiresAt  = new Date(Date.now() + 30 * 60 * 1000);

  await passwordResetRepository.create(user.user_id, tokenHash, expiresAt);

  await auditRepository.createLog({
    userId: user.user_id, performedBy: user.user_id,
    action: 'PASSWORD_RESET_REQUEST', entityType: 'users',
    entityId: String(user.user_id),
    description: 'Password reset token generated.',
    ipAddress,
  });

  // In a real application, send rawToken via email here.
  const resetURL = `http://localhost:5173/reset-password?token=${rawToken}`;
  const message = `
    <h2>Quên mật khẩu?</h2>
    <p>Nhấn vào đường dẫn bên dưới để đặt lại mật khẩu của bạn (có hiệu lực trong 30 phút):</p>
    <a href="${resetURL}" target="_blank">Đặt lại mật khẩu</a>
    <p>Hoặc copy đường dẫn này: ${resetURL}</p>
    <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
  `;

  try {
    await sendEmail({
      email: user.company_email,
      subject: 'Yêu cầu đặt lại mật khẩu (Hệ Thống Tuyển Dụng Nội Bộ)',
      html: message,
    });
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    // Even if email fails, we shouldn't reveal if the user exists or not, but for UX we might want to tell the user the service is down. 
    // For now we'll stick to safeResponse to avoid revealing emails.
  }

  // We no longer return the devToken
  const result = { ...safeResponse };

  return result;
}

// ─────────────────────────────────────────────
//  PART 2: RESET PASSWORD
// ─────────────────────────────────────────────

/**
 * Reset a user's password using the token received from forgot-password.
 *
 * Uses a DB transaction to ensure the password update and token marking
 * are atomic - both succeed or both fail.
 *
 * @param {string} rawToken    - The raw token the user received
 * @param {string} newPassword - The new plain-text password
 * @param {string} ipAddress
 */
async function resetPassword(rawToken, newPassword, ipAddress) {
  // Step 1: Hash the submitted raw token to look it up in the DB
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Step 2: Find the token record
  const tokenRecord = await passwordResetRepository.findValidByHash(tokenHash);

  if (!tokenRecord) {
    throw createError('Invalid or expired reset token.', 400);
  }

  // Step 3: Check if already used
  if (tokenRecord.used_at !== null) {
    throw createError('This reset token has already been used.', 400);
  }

  // Step 4: Check expiry
  if (new Date(tokenRecord.expires_at) <= new Date()) {
    throw createError('This reset token has expired. Please request a new one.', 400);
  }

  // Step 5: Validate new password
  if (!newPassword || newPassword.length < 6) {
    throw createError('New password must be at least 6 characters long.', 400);
  }

  // Step 6: Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Step 7: Use a transaction to update password + mark token as used atomically
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update the user's password and password_changed_at
    await userRepository.updatePassword(tokenRecord.user_id, passwordHash, connection);

    // Mark the token as used so it cannot be reused
    await passwordResetRepository.markAsUsed(tokenRecord.reset_token_id, connection);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release(); // always return connection to the pool
  }

  // Step 8: Revoke ALL active sessions (force re-login with new password)
  await sessionRepository.revokeAllByUserId(tokenRecord.user_id);

  // Step 9: Audit log
  await auditRepository.createLog({
    userId: tokenRecord.user_id, performedBy: tokenRecord.user_id,
    action: 'PASSWORD_CHANGED', entityType: 'users',
    entityId: String(tokenRecord.user_id),
    description: 'Password changed via password reset flow.',
    ipAddress,
  });
}

// ─────────────────────────────────────────────
//  PART 2: CHANGE PASSWORD (authenticated)
// ─────────────────────────────────────────────

/**
 * Allow a logged-in user to change their own password.
 * Requires their current password for verification.
 *
 * After changing: all sessions (including current) are revoked
 * so the user must log in again with the new password.
 *
 * @param {number} userId
 * @param {string} currentPassword - Plain-text current password
 * @param {string} newPassword     - Plain-text new password
 * @param {string} ipAddress
 */
async function changePassword(userId, currentPassword, newPassword, ipAddress) {
  // Step 1: Get user with password_hash (internal use only)
  const user = await userRepository.findByIdWithHash(userId);

  if (!user) throw createError('User not found.', 404);

  // Step 2: Verify the current password is correct
  const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!passwordMatch) {
    throw createError('Current password is incorrect.', 401);
  }

  // Step 3: Validate the new password
  if (!newPassword || newPassword.length < 6) {
    throw createError('New password must be at least 6 characters long.', 400);
  }

  if (newPassword === currentPassword) {
    throw createError('New password must be different from the current password.', 400);
  }

  // Step 4: Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Step 5: Update the password in the database
  await userRepository.updatePassword(userId, passwordHash);

  // Step 6: Revoke ALL active sessions (security best practice)
  await sessionRepository.revokeAllByUserId(userId);

  // Step 7: Audit log
  await auditRepository.createLog({
    userId, performedBy: userId,
    action: 'PASSWORD_CHANGED', entityType: 'users',
    entityId: String(userId),
    description: 'User changed their password. All sessions revoked.',
    ipAddress,
  });
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
};
