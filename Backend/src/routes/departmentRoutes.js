/**
 * departmentRoutes.js
 * API routes for department management.
 */

const express = require('express');
const router = express.Router();

const departmentController =
  require('../controllers/departmentController');

const {
  authenticate,
  authorize,
} = require('../middleware/authMiddleware');

router.get(
  '/',
  authenticate,
  authorize('DEPARTMENT_VIEW'),
  departmentController.getAllDepartments
);

router.get(
  '/:id',
  authenticate,
  authorize('DEPARTMENT_VIEW'),
  departmentController.getDepartmentById
);

router.post(
  '/',
  authenticate,
  authorize('DEPARTMENT_CREATE'),
  departmentController.createDepartment
);

router.put(
  '/:id',
  authenticate,
  authorize('DEPARTMENT_UPDATE'),
  departmentController.updateDepartment
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorize('DEPARTMENT_UPDATE'),
  departmentController.deactivateDepartment
);

router.patch(
  '/:id/activate',
  authenticate,
  authorize('DEPARTMENT_UPDATE'),
  departmentController.activateDepartment
);

router.delete(
  '/:id',
  authenticate,
  authorize('DEPARTMENT_DELETE'),
  departmentController.deleteDepartment
);

module.exports = router;