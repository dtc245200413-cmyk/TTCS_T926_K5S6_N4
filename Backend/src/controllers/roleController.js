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

const createRole = async (req, res, next) => {
  try {
    const { role_code, role_name, description } = req.body;
    const newRole = await roleService.createRole(role_code, role_name, description, req.user.user_id, req.ip);
    return sendSuccess(res, 'Role created successfully.', newRole, 201);
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role_name, description } = req.body;
    const updatedRole = await roleService.updateRole(id, role_name, description, req.user.user_id, req.ip);
    return sendSuccess(res, 'Role updated successfully.', updatedRole);
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    await roleService.deleteRole(id, req.user.user_id, req.ip);
    return sendSuccess(res, 'Role deleted successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRoles, createRole, updateRole, deleteRole };
