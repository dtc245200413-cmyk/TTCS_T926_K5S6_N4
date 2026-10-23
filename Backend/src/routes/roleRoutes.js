/**
 * roleRoutes.js
 * Routes for /api/roles
 *
 * GET /api/roles — List all system roles (requires ROLE_VIEW permission)
 */

const express = require('express');
const router  = express.Router();

const roleController          = require('../controllers/roleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// GET /api/roles
router.get('/', authenticate, authorize('ROLE_VIEW'), roleController.getAllRoles);

// POST /api/roles
router.post('/', authenticate, authorize('ROLE_VIEW'), roleController.createRole);

// PUT /api/roles/:id
router.put('/:id', authenticate, authorize('ROLE_VIEW'), roleController.updateRole);

// DELETE /api/roles/:id
router.delete('/:id', authenticate, authorize('ROLE_VIEW'), roleController.deleteRole);

module.exports = router;
