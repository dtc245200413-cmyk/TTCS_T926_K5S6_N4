/**
 * userController.js
 * HTTP handlers for user management endpoints.
 */

const userService = require('../services/userService');
const roleService = require('../services/roleService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);
    return sendSuccess(res, 'Users retrieved successfully.', result);
  } catch (error) { next(error); }
};

const getUserById = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return sendError(res, 'User ID must be a valid number.', 400);
    const user = await userService.getUserById(userId);
    return sendSuccess(res, 'User retrieved successfully.', user);
  } catch (error) { next(error); }
};

const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'User account created successfully.', newUser, 201);
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return sendError(res, 'User ID must be a valid number.', 400);
    const updatedUser = await userService.updateUser(userId, req.body, req.user.user_id, getIp(req));
    return sendSuccess(res, 'User updated successfully.', updatedUser);
  } catch (error) { next(error); }
};

// ── PART 3 ENDPOINTS ────────────────────────────────────────

const getUserRoles = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return sendError(res, 'Invalid user ID.', 400);
    const roles = await roleService.getUserRoles(userId);
    return sendSuccess(res, 'User roles retrieved successfully.', roles);
  } catch (error) { next(error); }
};

const assignRole = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { roleId } = req.body;
    if (isNaN(userId) || !roleId) return sendError(res, 'User ID and roleId are required.', 400);
    const roles = await roleService.assignRole(userId, roleId, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Gán vai trò thành công.', roles, 201);
  } catch (error) { next(error); }
};

const revokeRole = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const roleId = parseInt(req.params.roleId, 10);
    if (isNaN(userId) || isNaN(roleId)) return sendError(res, 'Invalid user ID or role ID.', 400);
    const roles = await roleService.revokeRole(userId, roleId, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Thu hồi vai trò thành công.', roles);
  } catch (error) { next(error); }
};

const lockUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { reason, handoverUserId } = req.body;
    if (isNaN(userId)) return sendError(res, 'Invalid user ID.', 400);
    if (!reason || !reason.trim()) return sendError(res, 'Lý do khoá tài khoản là bắt buộc.', 400);
    
    const parsedHandoverId = handoverUserId ? parseInt(handoverUserId, 10) : null;
    const updatedUser = await userService.lockUser(userId, reason, req.user.user_id, getIp(req), parsedHandoverId);
    
    let msg = 'Tài khoản đã bị khoá thành công.';
    if (updatedUser.handoverMessage) {
      msg += ` ${updatedUser.handoverMessage}`;
      delete updatedUser.handoverMessage;
    } else if (updatedUser.handoverWarning) {
      msg += ` ${updatedUser.handoverWarning}`;
      delete updatedUser.handoverWarning;
    }
    
    return sendSuccess(res, msg, updatedUser);
  } catch (error) { next(error); }
};

const unlockUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return sendError(res, 'Invalid user ID.', 400);
    const updatedUser = await userService.unlockUser(userId, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Mở khoá tài khoản thành công.', updatedUser);
  } catch (error) { next(error); }
};

module.exports = {
  getAllUsers, getUserById, createUser, updateUser,
  getUserRoles, assignRole, revokeRole, lockUser, unlockUser
};
