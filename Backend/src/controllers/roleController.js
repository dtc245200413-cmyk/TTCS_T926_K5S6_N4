/**
 * roleController.js
 * HTTP handler for role-level endpoints.
 *
 * Routes handled here:
 *   GET /api/roles   — List all system roles
 */

const roleService            = require('../services/roleService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * GET /api/roles
 * Returns all roles defined in the system.
 * Requires ROLE_VIEW permission.
 */
const getAllRoles = async (req, res, next) => {
  try {
    const roles = await roleService.getAllRoles();
    return sendSuccess(res, 'Roles retrieved successfully.', roles);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRoles };
