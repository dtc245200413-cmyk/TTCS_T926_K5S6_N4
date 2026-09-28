/**
 * userService.js
 * Business logic for user management (S1-08).
 * Handles: list users, get user by ID, create user, edit user.
 */

const bcrypt          = require('bcrypt');
const userRepository  = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

const BCRYPT_ROUNDS = 12;

/**
 * Helper: create an Error with an HTTP status code
 */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Format a user row (or rows) for API response.
 * Ensures password_hash is never included.
 */
function formatUserRow(row) {
  return {
    user_id:             row.user_id,
    employee_code:       row.employee_code,
    full_name:           row.full_name,
    company_email:       row.company_email,
    phone_number:        row.phone_number,
    job_title:           row.job_title,
    status:              row.status,
    failed_login_attempts: row.failed_login_attempts,
    last_login_at:       row.last_login_at,
    password_changed_at: row.password_changed_at,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
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
//  GET ALL USERS (with filters + pagination)
// ─────────────────────────────────────────────

/**
 * Retrieve a paginated list of users with optional filters.
 *
 * @param {object} query - req.query: { search, status, departmentId, page, limit }
 * @returns {object} { users, total, page, limit }
 */
async function getAllUsers(query) {
  const { search = '', status = '', departmentId = '', page = 1, limit = 20 } = query;

  // Validate status if provided
  const allowedStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
  if (status && !allowedStatuses.includes(status.toUpperCase())) {
    throw createError(`Invalid status. Must be one of: ${allowedStatuses.join(', ')}.`, 400);
  }

  const filters = {
    search,
    status:       status ? status.toUpperCase() : '',
    departmentId,
    page:         parseInt(page, 10)  || 1,
    limit:        parseInt(limit, 10) || 20,
  };

  const [users, total] = await Promise.all([
    userRepository.getAll(filters),
    userRepository.countAll(filters),
  ]);

  return {
    users: users.map(formatUserRow),
    total,
    page:  filters.page,
    limit: filters.limit,
  };
}

// ─────────────────────────────────────────────
//  GET USER BY ID
// ─────────────────────────────────────────────

/**
 * Get a single user's full profile by user_id, including their roles.
 *
 * @param {number} userId
 */
async function getUserById(userId) {
  const user = await userRepository.findById(userId);
  if (!user) throw createError('User not found.', 404);

  const rolesAndPermissions = await userRepository.getRolesAndPermissions(userId);

  // Build unique roles list
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
//  CREATE USER
// ─────────────────────────────────────────────

/**
 * Create a new internal employee account.
 *
 * @param {object} data             - Request body
 * @param {number} performedByUserId - Admin who is creating the account
 * @param {string} ipAddress
 */
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

  // ── Validation ──────────────────────────────
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

  // ── Uniqueness checks ────────────────────────
  const emailTaken = await userRepository.emailExistsForOtherUser(company_email);
  if (emailTaken) {
    throw createError('This company email is already in use.', 409);
  }

  const codeTaken = await userRepository.employeeCodeExists(String(employee_code).trim());
  if (codeTaken) {
    throw createError('This employee code is already in use.', 409);
  }

  // ── Hash password ────────────────────────────
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Insert user ──────────────────────────────
  const newUserId = await userRepository.create({
    departmentId: department_id || null,
    employeeCode: String(employee_code).trim(),
    fullName:     String(full_name).trim(),
    companyEmail: String(company_email).trim().toLowerCase(),
    phoneNumber:  phone_number  || null,
    jobTitle:     job_title     || null,
    passwordHash,
  });

  // ── Audit log ────────────────────────────────
  await auditRepository.createLog({
    userId:      newUserId,
    performedBy: performedByUserId,
    action:      'USER_CREATED',
    entityType:  'users',
    entityId:    String(newUserId),
    description: `New account created for ${full_name} (${company_email}).`,
    ipAddress,
  });

  // Return the newly created user (without password_hash)
  return getUserById(newUserId);
}

// ─────────────────────────────────────────────
//  UPDATE USER
// ─────────────────────────────────────────────

/**
 * Update an existing user's basic information.
 *
 * Allowed fields: full_name, phone_number, job_title, department_id
 * Not allowed here: password_hash, status, employee_code, company_email (if it would duplicate)
 *
 * @param {number} userId
 * @param {object} data             - Request body
 * @param {number} performedByUserId - Who is making the change
 * @param {string} ipAddress
 */
async function updateUser(userId, data, performedByUserId, ipAddress) {
  // Verify user exists
  const existing = await userRepository.findById(userId);
  if (!existing) throw createError('User not found.', 404);

  const { full_name, phone_number, job_title, department_id } = data;

  // Build the fields object with only what was actually provided
  const fields = {};

  if (full_name !== undefined) {
    if (String(full_name).trim() === '') throw createError('full_name cannot be empty.', 400);
    fields.full_name = String(full_name).trim();
  }

  if (phone_number !== undefined) fields.phone_number = phone_number || null;
  if (job_title    !== undefined) fields.job_title    = job_title    || null;
  if (department_id !== undefined) {
    // Allow null (remove from department)
    fields.department_id = department_id === null ? null : parseInt(department_id, 10);
  }

  if (Object.keys(fields).length === 0) {
    throw createError('No valid fields provided to update.', 400);
  }

  await userRepository.update(userId, fields);

  // Audit log
  await auditRepository.createLog({
    userId,
    performedBy: performedByUserId,
    action:      'USER_UPDATED',
    entityType:  'users',
    entityId:    String(userId),
    description: `User profile updated. Fields changed: ${Object.keys(fields).join(', ')}.`,
    ipAddress,
  });

  // Return updated user
  return getUserById(userId);
}

module.exports = { getAllUsers, getUserById, createUser, updateUser };
