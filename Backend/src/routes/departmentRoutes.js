/**
 * departmentRoutes.js
 * Routes for department management.
 */

const express = require('express');

const router = express.Router();

const departmentController =
    require('../controllers/departmentController');

const { authenticate } =
    require('../middleware/authMiddleware');

/**
 * GET /api/departments
 * Get all departments.
 */
router.get(
    '/',
    authenticate,
    departmentController.getAllDepartments
);

/**
 * GET /api/departments/:id
 * Get department by ID.
 */
router.get(
    '/:id',
    authenticate,
    departmentController.getDepartmentById
);

/**
 * POST /api/departments
 * Create department.
 */
router.post(
    '/',
    authenticate,
    departmentController.createDepartment
);

/**
 * PUT /api/departments/:id
 * Update department.
 */
router.put(
    '/:id',
    authenticate,
    departmentController.updateDepartment
);

/**
 * DELETE /api/departments/:id
 * Delete department.
 */
router.delete(
    '/:id',
    authenticate,
    departmentController.deleteDepartment
);

module.exports = router;
