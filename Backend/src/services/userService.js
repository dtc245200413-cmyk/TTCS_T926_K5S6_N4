/**
 * userService.js
 * Business logic for user management (S1-08, S1-10).
 * UPDATED in Part 3: added lockUser and unlockUser.
 */

const bcrypt          = require('bcrypt');
const { pool }        = require('../config/database');
const userRepository  = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

const BCRYPT_ROUNDS = 12;

/** Create an Error with an attached HTTP status code */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Format a raw DB user row for API response.
 * NEVER includes password_hash.
 */
function formatUserRow(row) {
  return {
    user_id:               row.user_id,
    employee_code:         row.employee_code,
    full_name:             row.full_name,
    company_email:         row.company_email,
    phone_number:          row.phone_number,
    job_title:             row.job_title,
    status:                row.status,
    failed_login_attempts: row.failed_login_attempts,
    last_login_at:         row.last_login_at,
    password_changed_at:   row.password_changed_at,
    created_at:            row.created_at,
    updated_at:            row.updated_at,
    department: row.department_id
      ? {
          department_id:   row.department_id,
          department_name: row.department_name,
          department_code: row.department_code,
        }
      : null,
  };
}

// ─────────────────────────────────────────────
//  PART 2: GET ALL USERS (with filters + pagination)
// ─────────────────────────────────────────────

async function getAllUsers(query) {
  const { search = '', status = '', departmentId = '', page = 1, limit = 20 } = query;

  const allowedStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
  if (status && !allowedStatuses.includes(status.toUpperCase())) {
    throw createError(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}.`, 400);
  }

  const filters = {
    search,
    status:       status ? status.toUpperCase() : '',
    departmentId,
    page:         parseInt(page,  10) || 1,
    limit:        parseInt(limit, 10) || 20,
  };

  const [users, total] = await Promise.all([
    userRepository.getAll(filters),
    userRepository.countAll(filters),
  ]);

  const formattedUsers = users.map(formatUserRow);

  // Fetch roles for these users
  if (formattedUsers.length > 0) {
    const userIds = formattedUsers.map(u => u.user_id);
    const { pool } = require('../config/database');
    const [userRoles] = await pool.query(
      `SELECT ur.user_id, r.role_id, r.role_code, r.role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.role_id
       WHERE ur.user_id IN (?)`,
      [userIds]
    );

    for (const u of formattedUsers) {
      u.roles = userRoles.filter(ur => ur.user_id === u.user_id).map(ur => ({
        role_id: ur.role_id,
        role_code: ur.role_code,
        role_name: ur.role_name
      }));
    }
  }

  return {
    users: formattedUsers,
    total,
    page:  filters.page,
    limit: filters.limit,
  };
}

// ─────────────────────────────────────────────
//  PART 2: GET USER BY ID (with roles)
// ─────────────────────────────────────────────

async function getUserById(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw createError('User not found.', 404);

  const rolesAndPermissions = await userRepository.getRolesAndPermissions(userId);

  const rolesMap = new Map();
  for (const row of rolesAndPermissions) {
    if (!rolesMap.has(row.role_id) && row.role_id) {
      rolesMap.set(row.role_id, {
        role_id:   row.role_id,
        role_code: row.role_code,
        role_name: row.role_name,
      });
    }
  }

  return {
    ...formatUserRow(user),
    roles: Array.from(rolesMap.values()),
  };
}

// ─────────────────────────────────────────────
//  PART 2: CREATE USER
// ─────────────────────────────────────────────

async function createUser(data, performedByUserId, ipAddress) {
  const {
    employee_code,
    full_name,
    company_email,
    password,
    phone_number,
    job_title,
    department_id,
  } = data;

  if (!employee_code || String(employee_code).trim() === '') {
    throw createError('employee_code is required.', 400);
  }
  if (!full_name || String(full_name).trim() === '') {
    throw createError('full_name is required.', 400);
  }
  if (!company_email || String(company_email).trim() === '') {
    throw createError('company_email is required.', 400);
  }
  if (!password) {
    throw createError('password is required.', 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(company_email)) {
    throw createError('Please provide a valid email address.', 400);
  }

  if (password.length < 6) {
    throw createError('Password must be at least 6 characters long.', 400);
  }

  const emailTaken = await userRepository.emailExistsForOtherUser(company_email);
  if (emailTaken) {
    throw createError('This company email is already in use.', 409);
  }

  const codeTaken = await userRepository.employeeCodeExists(String(employee_code).trim());
  if (codeTaken) {
    throw createError('This employee code is already in use.', 409);
  }

  if (phone_number) {
    const phoneStr = String(phone_number).trim();
    if (phoneStr !== '') {
      const phoneTaken = await userRepository.phoneNumberExistsForOtherUser(phoneStr);
      if (phoneTaken) {
        throw createError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.', 409);
      }
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const newUserId = await userRepository.create({
    departmentId: department_id || null,
    employeeCode: String(employee_code).trim(),
    fullName:     String(full_name).trim(),
    companyEmail: String(company_email).trim().toLowerCase(),
    phoneNumber:  phone_number || null,
    jobTitle:     job_title    || null,
    passwordHash,
  });

  await auditRepository.createLog({
    userId:      newUserId,
    performedBy: performedByUserId,
    action:      'USER_CREATED',
    entityType:  'users',
    entityId:    String(newUserId),
    description: `New account created for '${full_name}' (${company_email}).`,
    ipAddress,
  });

  return getUserById(newUserId);
}

// ─────────────────────────────────────────────
//  PART 2: UPDATE USER
// ─────────────────────────────────────────────

// Vietnamese mobile-number format used by the profile form.
// Accepted examples: 0912345678 and +84912345678.
const VIETNAM_MOBILE_REGEX = /^(0[35789]\d{8}|\+84[35789]\d{8})$/;
const PROFILE_UPDATE_FIELDS = ['full_name', 'phone_number', 'job_title'];

async function updateUser(userId, data = {}, performedByUserId, ipAddress) {
  const existing = await userRepository.findById(userId);
  if (!existing) throw createError('User not found.', 404);

  const incomingFields = Object.keys(data || {});
  const unsupportedFields = incomingFields.filter(
    (field) => !PROFILE_UPDATE_FIELDS.includes(field)
  );

  // Security rule for SCRUM-58: email, department and role are read-only
  // in the personal-profile update flow. The backend also rejects these
  // fields so the rule cannot be bypassed by calling the API directly.
  if (unsupportedFields.length > 0) {
    throw createError(
      'Chỉ được cập nhật họ tên, số điện thoại và chức danh. Email, phòng ban và vai trò không thể thay đổi tại đây.',
      400
    );
  }

  const { full_name, phone_number, job_title } = data;
  const fields = {};

  if (full_name !== undefined) {
    const fullName = String(full_name).trim();
    if (!fullName) throw createError('Họ tên không được để trống.', 400);
    if (fullName.length > 150) throw createError('Họ tên không được vượt quá 150 ký tự.', 400);
    fields.full_name = fullName;
  }

  if (phone_number !== undefined) {
    const phone = String(phone_number).trim();
    if (phone === '') {
      fields.phone_number = null;
    } else if (!VIETNAM_MOBILE_REGEX.test(phone)) {
      throw createError(
        'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 số (03/05/07/08/09...) hoặc dạng +84.',
        400
      );
    } else {
      const phoneTaken = await userRepository.phoneNumberExistsForOtherUser(phone, userId);
      if (phoneTaken) {
        throw createError('Số điện thoại này đã được sử dụng bởi một tài khoản khác.', 409);
      }
      fields.phone_number = phone;
    }
  }

  if (job_title !== undefined) {
    const jobTitle = String(job_title).trim();
    if (jobTitle.length > 100) throw createError('Chức danh không được vượt quá 100 ký tự.', 400);
    fields.job_title = jobTitle || null;
  }

  if (Object.keys(fields).length === 0) {
    throw createError('Vui lòng nhập ít nhất một thông tin cần cập nhật.', 400);
  }

  await userRepository.update(userId, fields);

  await auditRepository.createLog({
    userId,
    performedBy: performedByUserId,
    action:      'USER_UPDATED',
    entityType:  'users',
    entityId:    String(userId),
    description: `User profile updated. Fields changed: ${Object.keys(fields).join(', ')}.`,
    ipAddress,
  });

  return getUserById(userId);
}

// ─────────────────────────────────────────────
//  PART 3: LOCK USER (S1-10)
// ─────────────────────────────────────────────

/**
 * Manually lock a user account.
 *
 * Uses a transaction to ensure BOTH operations succeed atomically:
 *   1. Set user status = 'LOCKED'
 *   2. Revoke ALL active sessions (existing logins are kicked out)
 *
 * The lock reason is stored in audit_logs, not in the users table
 * (the existing users table has no lock_reason column).
 *
 * @param {number} targetUserId
 * @param {string|null} reason         - Optional reason (stored in audit log)
 * @param {number}      performedByUserId
 * @param {string}      ipAddress
 */
async function lockUser(targetUserId, reason, performedByUserId, ipAddress, handoverUserId = null) {
  // Step 1: Verify user exists
  const user = await userRepository.findById(targetUserId);
  if (!user) throw createError('User not found.', 404);

  // Step 2: Prevent locking an already-locked account
  if (user.status === 'LOCKED') {
    throw createError('This account is already locked.', 409);
  }

  // Prevent locking self
  if (targetUserId === performedByUserId) {
    throw createError('Không thể tự khóa tài khoản của chính mình.', 403);
  }

  // Prevent locking the last active ADMIN
  const { pool } = require('../config/database');
  const [roleRows] = await pool.query(
    `SELECT COUNT(*) as count FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id JOIN users u ON ur.user_id = u.user_id WHERE r.role_code = 'ADMIN' AND u.status = 'ACTIVE'`
  );
  
  // Check if target user is an Admin
  const [isAdminRows] = await pool.query(
    `SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id = ? AND r.role_code = 'ADMIN'`,
    [targetUserId]
  );
  if (isAdminRows.length > 0 && roleRows[0].count <= 1) {
    throw createError('Không thể khóa tài khoản ADMIN đang hoạt động duy nhất của hệ thống.', 403);
  }

  // Step 3: Transaction — lock account and revoke sessions together
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lock the user (admin lock uses status only, no locked_until date needed)
    await connection.execute(
      `UPDATE users SET status = 'LOCKED' WHERE user_id = ?`,
      [targetUserId]
    );

    // Revoke ALL active sessions so the user is immediately logged out everywhere
    await connection.execute(
      `UPDATE user_sessions SET revoked_at = NOW()
       WHERE user_id = ? AND revoked_at IS NULL`,
      [targetUserId]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release(); // always return connection to pool
  }

  // Step 4: Audit log (reason stored here since users table has no lock_reason column)
  await auditRepository.createLog({
    userId:      targetUserId,
    performedBy: performedByUserId,
    action:      'USER_LOCKED',
    entityType:  'users',
    entityId:    String(targetUserId),
    description: reason
      ? `Account manually locked. Reason: ${reason}.`
      : `Account manually locked by admin.`,
    ipAddress,
  });

  // Step 5: Check for active job requisitions to warn about handover
  let handoverWarning = null;
  let handoverMessage = null;
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as active_count FROM job_requisitions WHERE created_by = ? AND status IN ('DRAFT', 'PENDING', 'APPROVED')`,
      [targetUserId]
    );
    if (rows[0] && rows[0].active_count > 0) {
      if (handoverUserId) {
        // Handover the jobs
        await pool.execute(
          `UPDATE job_requisitions SET created_by = ? WHERE created_by = ? AND status IN ('DRAFT', 'PENDING', 'APPROVED')`,
          [handoverUserId, targetUserId]
        );
        handoverMessage = `Đã tự động bàn giao ${rows[0].active_count} công việc đang mở.`;
      } else {
        handoverWarning = `Cảnh báo: Nhân viên này đang phụ trách ${rows[0].active_count} vị trí tuyển dụng đang mở. Vui lòng tiến hành bàn giao!`;
      }
    }
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  const updatedUser = await getUserById(targetUserId);
  return { ...updatedUser, handoverWarning, handoverMessage };
}

// ─────────────────────────────────────────────
//  PART 3: UNLOCK USER (S1-10)
// ─────────────────────────────────────────────

/**
 * Unlock a locked user account.
 * Resets status to ACTIVE, clears locked_until, and resets failed_login_attempts.
 *
 * @param {number} targetUserId
 * @param {number} performedByUserId
 * @param {string} ipAddress
 */
async function unlockUser(targetUserId, performedByUserId, ipAddress) {
  // Step 1: Verify user exists
  const user = await userRepository.findById(targetUserId);
  if (!user) throw createError('User not found.', 404);

  // Step 2: Only unlock if actually locked or inactive
  if (user.status !== 'LOCKED' && user.status !== 'INACTIVE') {
    throw createError('This account is not currently locked or inactive.', 409);
  }

  // Step 3: Restore account to ACTIVE, clear all lock-related fields
  await pool.execute(
    `UPDATE users
     SET status = 'ACTIVE', locked_until = NULL, failed_login_attempts = 0
     WHERE user_id = ?`,
    [targetUserId]
  );

  // Step 4: Audit log
  await auditRepository.createLog({
    userId:      targetUserId,
    performedBy: performedByUserId,
    action:      'USER_UNLOCKED',
    entityType:  'users',
    entityId:    String(targetUserId),
    description: `Account unlocked by admin. User may log in again.`,
    ipAddress,
  });

  return getUserById(targetUserId);
}

async function updateUserAvatar(userId, avatarUrl) {
  await userRepository.updateAvatarUrl(userId, avatarUrl);
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  lockUser,
  unlockUser,
  updateUserAvatar,
};
