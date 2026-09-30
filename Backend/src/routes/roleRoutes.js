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
// Return all system roles. Requires authentication + ROLE_VIEW permission.
router.get('/', authenticate, authorize('ROLE_VIEW'), roleController.getAllRoles);

module.exports = router;
