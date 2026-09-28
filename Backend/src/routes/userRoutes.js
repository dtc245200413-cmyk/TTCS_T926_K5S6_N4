/**
 * userRoutes.js
 * API routes for user management under /api/users.
 *
 * All routes require:
 *   1. authenticate  - valid JWT + active session
 *   2. authorize     - specific permission from the permissions table
 */

const express = require('express');
const router  = express.Router();

const userController          = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// GET /api/users
// List all users with optional search/filter. Requires USER_VIEW permission.
router.get(
  '/',
  authenticate,
  authorize('USER_VIEW'),
  userController.getAllUsers
);

// GET /api/users/:id
// Get a specific user by ID. Requires USER_VIEW permission.
router.get(
  '/:id',
  authenticate,
  authorize('USER_VIEW'),
  userController.getUserById
);

// POST /api/users
// Create a new user account. Requires USER_CREATE permission.
router.post(
  '/',
  authenticate,
  authorize('USER_CREATE'),
  userController.createUser
);

// PUT /api/users/:id
// Update an existing user's info. Requires USER_UPDATE permission.
router.put(
  '/:id',
  authenticate,
  authorize('USER_UPDATE'),
  userController.updateUser
);

module.exports = router;
