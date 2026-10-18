/**
 * roleService.js
 * Business logic for role management (S1-05, S1-09).
 *
 * Handles:
 *   - Listing all system roles
 *   - Getting a user's assigned roles
 *   - Assigning a role to a user  (with duplicate prevention + audit)
 *   - Revoking a role from a user (with audit)
 */

const roleRepository  = require('../repositories/roleRepository');
const userRepository  = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');

/** Create an Error with an attached HTTP status code */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─────────────────────────────────────────────
//  GET ALL ROLES
// ─────────────────────────────────────────────

/**
 * Return all roles in the system.
 * Used to populate role selection dropdowns in the frontend.
 */
async function getAllRoles() {
  return roleRepository.getAllRoles();
}

// ─────────────────────────────────────────────
//  GET USER ROLES
// ─────────────────────────────────────────────

/**
 * Return the list of roles assigned to a specific user.
 * Includes assigned_by and assigned_at information.
 *
 * @param {number} targetUserId - The user whose roles to retrieve
 */
async function getUserRoles(targetUserId) {
  // Verify the target user exists
  const user = await userRepository.findById(targetUserId);
  if (!user) throw createError('User not found.', 404);

  return roleRepository.getUserRoles(targetUserId);
}

// ─────────────────────────────────────────────
//  ASSIGN ROLE
// ─────────────────────────────────────────────

/**
 * Assign a role to a user.
 *
 * Checks:
 *   1. Target user must exist.
 *   2. Role must exist.
 *   3. Role must not already be assigned (prevent duplicates).
 *
 * Records assigned_by (who did it) and writes an audit log.
 *
 * @param {number} targetUserId      - User receiving the role
 * @param {number} roleId            - Role to assign
 * @param {number} performedByUserId - Admin performing the action
 * @param {string} ipAddress
 * @returns {Array} Updated list of roles for the target user
 */
async function assignRole(targetUserId, roleId, performedByUserId, ipAddress) {
  // Step 1: Verify target user exists
  const user = await userRepository.findById(targetUserId);
  if (!user) throw createError('User not found.', 404);

  // Step 2: Verify the role exists
  const role = await roleRepository.findById(roleId);
  if (!role) throw createError('Role not found.', 404);

  // Step 3: Prevent duplicate assignment
  const alreadyAssigned = await roleRepository.userHasRole(targetUserId, roleId);
  if (alreadyAssigned) {
    throw createError(
      `User '${user.full_name}' already has the role '${role.role_code}'.`,
      409
    );
  }

  // Step 4: Insert the role assignment
  await roleRepository.assignRole(targetUserId, roleId, performedByUserId);

  // Step 5: Write audit log
  await auditRepository.createLog({
    userId:      targetUserId,
    performedBy: performedByUserId,
    action:      'ROLE_ASSIGNED',
    entityType:  'user_roles',
    entityId:    `${targetUserId}-${roleId}`,
    description: `Role '${role.role_code}' assigned to user '${user.full_name}' (${user.company_email}).`,
    ipAddress,
  });

  // Return the full updated role list for the user
  return roleRepository.getUserRoles(targetUserId);
}

// ─────────────────────────────────────────────
//  REVOKE ROLE
// ─────────────────────────────────────────────

/**
 * Remove (revoke) a role from a user.
 *
 * Checks:
 *   1. Target user must exist.
 *   2. Role must exist.
 *   3. The role must currently be assigned to the user.
 *
 * Writes an audit log. Future authorization checks will no longer
 * find this role, so access changes take effect on the next request.
 *
 * @param {number} targetUserId
 * @param {number} roleId
 * @param {number} performedByUserId
 * @param {string} ipAddress
 * @returns {Array} Remaining roles for the target user
 */
async function revokeRole(targetUserId, roleId, performedByUserId, ipAddress) {
  // Step 1: Verify target user exists
  const user = await userRepository.findById(targetUserId);
  if (!user) throw createError('User not found.', 404);

  // Step 2: Verify the role exists
  const role = await roleRepository.findById(roleId);
  if (!role) throw createError('Role not found.', 404);

  // Step 3: Verify the assignment exists
  const hasRole = await roleRepository.userHasRole(targetUserId, roleId);
  if (!hasRole) {
    throw createError(
      `User '${user.full_name}' does not have the role '${role.role_code}'.`,
      404
    );
  }

  // Step 4: Remove the assignment
  await roleRepository.revokeRole(targetUserId, roleId);

  // Step 5: Write audit log
  await auditRepository.createLog({
    userId:      targetUserId,
    performedBy: performedByUserId,
    action:      'ROLE_REVOKED',
    entityType:  'user_roles',
    entityId:    `${targetUserId}-${roleId}`,
    description: `Role '${role.role_code}' revoked from user '${user.full_name}' (${user.company_email}).`,
    ipAddress,
  });

  // Return remaining roles
  return roleRepository.getUserRoles(targetUserId);
}

module.exports = { getAllRoles, getUserRoles, assignRole, revokeRole };
