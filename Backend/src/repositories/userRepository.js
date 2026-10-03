/**
 * userRepository.js
 * All database queries related to the 'users' table.
 * UPDATED in Part 2: added user management queries.
 */

const { pool } = require('../config/database');

// ─────────────────────────────────────────────
//  PART 1 FUNCTIONS (unchanged)
// ─────────────────────────────────────────────

/**
 * Find a user by company email (includes password_hash for login).
 */
async function findByEmail(email) {
  const sql = `
    SELECT
      u.user_id, u.department_id, u.employee_code, u.full_name,
      u.company_email, u.phone_number, u.job_title,
      u.password_hash, u.status, u.failed_login_attempts,
      u.locked_until, u.last_login_at, u.password_changed_at,
      u.created_at, u.updated_at,
      d.department_name, d.department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.department_id
    WHERE u.company_email = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [email]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Find a user by user_id (does NOT include password_hash).
 * Safe to use for GET /me and user management endpoints.
 */
async function findById(userId) {
  const sql = `
    SELECT
      u.user_id, u.department_id, u.employee_code, u.full_name,
      u.company_email, u.phone_number, u.job_title,
      u.status, u.failed_login_attempts, u.locked_until,
      u.last_login_at, u.password_changed_at,
      u.created_at, u.updated_at,
      d.department_name, d.department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.department_id
    WHERE u.user_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Find a user by user_id WITH password_hash included.
 * Used ONLY for internal password verification (change-password flow).
 * NEVER return this data to the client.
 */
async function findByIdWithHash(userId) {
  const sql = `
    SELECT user_id, password_hash, status
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all roles and permissions for a user.
 */
async function getRolesAndPermissions(userId) {
  const sql = `
    SELECT DISTINCT
      r.role_id, r.role_code, r.role_name,
      p.permission_id, p.permission_code, p.permission_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.role_id
    LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE ur.user_id = ?
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

/** Update last_login_at and reset failed_login_attempts. */
async function updateLoginSuccess(userId) {
  await pool.execute(
    `UPDATE users SET last_login_at = NOW(), failed_login_attempts = 0 WHERE user_id = ?`,
    [userId]
  );
}

/** Increment failed_login_attempts by 1. */
async function incrementFailedAttempts(userId) {
  await pool.execute(
    `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE user_id = ?`,
    [userId]
  );
}

/** Lock account temporarily: set locked_until = 30 seconds and reset failed attempts. */
async function lockAccount(userId) {
  await pool.execute(
    `UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL 30 SECOND), failed_login_attempts = 0 WHERE user_id = ?`,
    [userId]
  );
}

// ─────────────────────────────────────────────
//  PART 2 ADDITIONS
// ─────────────────────────────────────────────

/**
 * Get all users with optional filtering and simple pagination.
 * Supports: search (name/email/code), status, departmentId.
 *
 * @param {object} filters - { search, status, departmentId, page, limit }
 * @returns {Array}
 */
async function getAll({ search = '', status = '', departmentId = '', page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(u.full_name LIKE ? OR u.company_email LIKE ? OR u.employee_code LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  if (departmentId) {
    conditions.push('u.department_id = ?');
    params.push(parseInt(departmentId, 10));
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const pageNum  = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset   = (pageNum - 1) * limitNum;

  // NOTE: password_hash is deliberately excluded from SELECT
  const sql = `
    SELECT
      u.user_id, u.employee_code, u.full_name, u.company_email,
      u.phone_number, u.job_title, u.status,
      u.failed_login_attempts, u.last_login_at,
      u.password_changed_at, u.created_at, u.updated_at,
      d.department_id, d.department_name, d.department_code
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.department_id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limitNum, offset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Count total users matching the same filters.
 * Used to return total count alongside paginated results.
 */
async function countAll({ search = '', status = '', departmentId = '' }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(u.full_name LIKE ? OR u.company_email LIKE ? OR u.employee_code LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  if (departmentId) {
    conditions.push('u.department_id = ?');
    params.push(parseInt(departmentId, 10));
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
  const [rows] = await pool.execute(sql, params);
  return rows[0].total;
}

/**
 * Insert a new user into the database.
 *
 * @param {object} data
 * @returns {number} user_id of the created user
 */
async function create({ departmentId, employeeCode, fullName, companyEmail, phoneNumber, jobTitle, passwordHash }) {
  const sql = `
    INSERT INTO users
      (department_id, employee_code, full_name, company_email,
       phone_number, job_title, password_hash, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `;
  const [result] = await pool.execute(sql, [
    departmentId || null,
    employeeCode,
    fullName,
    companyEmail,
    phoneNumber || null,
    jobTitle    || null,
    passwordHash,
  ]);
  return result.insertId;
}

/**
 * Update allowed user fields.
 * Only fields present in the 'fields' object are updated.
 *
 * Allowed fields: full_name, phone_number, job_title, department_id
 * (status/password are updated by dedicated functions)
 *
 * @param {number} userId
 * @param {object} fields - only whitelisted keys are applied
 * @returns {boolean} true if a row was changed
 */
async function update(userId, fields) {
  // Whitelist of columns that are allowed to be updated by this function
  const ALLOWED = ['full_name', 'phone_number', 'job_title', 'department_id'];

  const setClauses = [];
  const params = [];

  for (const key of ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      // Allow explicit null for department_id (remove from department)
      params.push(fields[key] === undefined ? null : fields[key]);
    }
  }

  if (setClauses.length === 0) return false;

  params.push(userId);
  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = ?`;
  const [result] = await pool.execute(sql, params);
  return result.affectedRows > 0;
}

/**
 * Update the user's password_hash and password_changed_at.
 * Called by reset-password and change-password flows.
 * Accepts an optional transaction connection.
 *
 * @param {number} userId
 * @param {string} passwordHash  - bcrypt hash of the new password
 * @param {object} conn          - Optional: transaction connection
 */
async function updatePassword(userId, passwordHash, conn = null) {
  const db = conn || pool;
  const sql = `
    UPDATE users
    SET password_hash = ?, password_changed_at = NOW()
    WHERE user_id = ?
  `;
  await db.execute(sql, [passwordHash, userId]);
}

/**
 * Check if a company email is already used by ANOTHER user.
 *
 * @param {string} email
 * @param {number} excludeUserId - Exclude this user (for edit checks)
 * @returns {boolean}
 */
async function emailExistsForOtherUser(email, excludeUserId = null) {
  let sql    = 'SELECT 1 FROM users WHERE company_email = ?';
  const params = [email];

  if (excludeUserId) {
    sql += ' AND user_id != ?';
    params.push(excludeUserId);
  }

  sql += ' LIMIT 1';
  const [rows] = await pool.execute(sql, params);
  return rows.length > 0;
}

/**
 * Check if an employee_code is already used (optionally excluding one user).
 *
 * @param {string} code
 * @param {number} excludeUserId
 * @returns {boolean}
 */
async function employeeCodeExists(code, excludeUserId = null) {
  let sql    = 'SELECT 1 FROM users WHERE employee_code = ?';
  const params = [code];

  if (excludeUserId) {
    sql += ' AND user_id != ?';
    params.push(excludeUserId);
  }

  sql += ' LIMIT 1';
  const [rows] = await pool.execute(sql, params);
  return rows.length > 0;
}

module.exports = {
  // Part 1
  findByEmail,
  findById,
  findByIdWithHash,
  getRolesAndPermissions,
  updateLoginSuccess,
  incrementFailedAttempts,
  lockAccount,
  // Part 2
  getAll,
  countAll,
  create,
  update,
  updatePassword,
  emailExistsForOtherUser,
  employeeCodeExists,
};
