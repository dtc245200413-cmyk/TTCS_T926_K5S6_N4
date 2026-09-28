/**
 * userController.js
 * HTTP handlers for user management endpoints.
 *
 * Routes:
 *   GET    /api/users          - List users (with search/filter)
 *   GET    /api/users/:id      - Get a single user
 *   POST   /api/users          - Create a new user
 *   PUT    /api/users/:id      - Update a user
 */

const userService            = require('../services/userService');
const { sendSuccess, sendError } = require('../utils/response');

/** Get client IP from request */
function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

// ─────────────────────────────────────────────
//  GET /api/users
// ─────────────────────────────────────────────
/**
 * Return a paginated list of users.
 *
 * Query params (all optional):
 *   search       - search by name, email, or employee_code
 *   status       - filter by ACTIVE | INACTIVE | LOCKED
 *   departmentId - filter by department_id
 *   page         - page number (default 1)
 *   limit        - items per page (default 20, max 100)
 *
 * Requires: USER_VIEW permission
 */
const getAllUsers = async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);

    return sendSuccess(res, 'Users retrieved successfully.', result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  GET /api/users/:id
// ─────────────────────────────────────────────
/**
 * Return a single user's full profile including their roles.
 *
 * Requires: USER_VIEW permission
 */
const getUserById = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return sendError(res, 'User ID must be a valid number.', 400);
    }

    const user = await userService.getUserById(userId);

    return sendSuccess(res, 'User retrieved successfully.', user);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/users
// ─────────────────────────────────────────────
/**
 * Create a new internal employee account.
 *
 * Required body fields:
 *   employee_code  - unique HR code (e.g. "EMP007")
 *   full_name      - full name of the employee
 *   company_email  - unique company email
 *   password       - initial password (will be hashed)
 *
 * Optional body fields:
 *   phone_number
 *   job_title
 *   department_id
 *
 * Requires: USER_CREATE permission
 */
const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(
      req.body,
      req.user.user_id,   // who is creating (from authenticate middleware)
      getIp(req)
    );

    return sendSuccess(res, 'User account created successfully.', newUser, 201);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  PUT /api/users/:id
// ─────────────────────────────────────────────
/**
 * Update an existing user's information.
 *
 * Updatable fields: full_name, phone_number, job_title, department_id
 * NOT updatable here: password, status, employee_code, company_email
 *
 * Requires: USER_UPDATE permission
 */
const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return sendError(res, 'User ID must be a valid number.', 400);
    }

    const updatedUser = await userService.updateUser(
      userId,
      req.body,
      req.user.user_id,  // who is editing
      getIp(req)
    );

    return sendSuccess(res, 'User updated successfully.', updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser };
