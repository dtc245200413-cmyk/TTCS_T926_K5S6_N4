/**
 * userRoutes.js
 * API routes for user management under /api/users.
 */

const express = require('express');
const router  = express.Router();

const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('USER_VIEW'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('USER_VIEW'), userController.getUserById);
router.post('/', authenticate, authorize('USER_CREATE'), userController.createUser);
router.put('/:id', authenticate, authorize('USER_UPDATE'), userController.updateUser);

// PART 3: User Roles
router.get('/:id/roles', authenticate, authorize('USER_VIEW'), userController.getUserRoles);
router.post('/:id/roles', authenticate, authorize('ROLE_ASSIGN'), userController.assignRole);
router.delete('/:id/roles/:roleId', authenticate, authorize('ROLE_REVOKE'), userController.revokeRole);

// PART 3: Lock/Unlock
router.patch('/:id/lock', authenticate, authorize('USER_LOCK'), userController.lockUser);
router.patch('/:id/unlock', authenticate, authorize('USER_UNLOCK'), userController.unlockUser);

module.exports = router;
