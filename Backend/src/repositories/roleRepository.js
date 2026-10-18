/**
 * roleRepository.js
 * All database queries related to 'roles' and 'user_roles' tables.
 *
 * DB tables used:
 *   roles        : role_id, role_code, role_name, description, created_at
 *   user_roles   : user_id, role_id, assigned_by, assigned_at
 *   permissions  : permission_id, permission_code, permission_name
 *   role_permissions : role_id, permission_id
 */

const { pool } = require('../config/database');

/**
 * Get all system roles.
 * @returns {Array}
 */
async function getAllRoles() {
  const sql = `
    SELECT role_id, role_code, role_name, description, created_at
    FROM roles
    ORDER BY role_id ASC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

/**
 * Find a single role by its ID.
 * @param {number} roleId
 * @returns {object|null}
 */
async function findById(roleId) {
  const sql = `
    SELECT role_id, role_code, role_name, description
    FROM roles
    WHERE role_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [roleId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all roles currently assigned to a specific user.
 * Includes who assigned the role and when.
 *
 * @param {number} userId
 * @returns {Array}
 */
async function getUserRoles(userId) {
  const sql = `
    SELECT
      r.role_id,
      r.role_code,
      r.role_name,
      r.description,
      ur.assigned_at,
      ab.user_id    AS assigned_by_id,
      ab.full_name  AS assigned_by_name
    FROM user_roles ur
    JOIN  roles r  ON ur.role_id     = r.role_id
    LEFT JOIN users ab ON ur.assigned_by = ab.user_id
    WHERE ur.user_id = ?
    ORDER BY ur.assigned_at DESC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

/**
 * Check whether a user already has a specific role.
 * Used before inserting to prevent duplicates.
 *
 * @param {number} userId
 * @param {number} roleId
 * @returns {boolean}
 */
async function userHasRole(userId, roleId) {
  const sql = `
    SELECT 1 FROM user_roles
    WHERE user_id = ? AND role_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [userId, roleId]);
  return rows.length > 0;
}

/**
 * Assign a role to a user.
 * Records who assigned it (assigned_by) and the timestamp (auto by DB).
 *
 * @param {number} userId
 * @param {number} roleId
 * @param {number|null} assignedBy - user_id of the admin doing the assignment
 */
async function assignRole(userId, roleId, assignedBy) {
  const sql = `
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (?, ?, ?)
  `;
  await pool.execute(sql, [userId, roleId, assignedBy || null]);
}

/**
 * Remove a role from a user (revoke).
 * Deletes the row from user_roles. Does NOT delete the role itself.
 *
 * @param {number} userId
 * @param {number} roleId
 * @returns {boolean} true if a row was deleted
 */
async function revokeRole(userId, roleId) {
  const sql = `
    DELETE FROM user_roles
    WHERE user_id = ? AND role_id = ?
  `;
  const [result] = await pool.execute(sql, [userId, roleId]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllRoles,
  findById,
  getUserRoles,
  userHasRole,
  assignRole,
  revokeRole,
};
