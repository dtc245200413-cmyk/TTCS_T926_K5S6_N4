/**
 * competencyFrameworkRoutes.js
 */

const express = require('express');
const router = express.Router();

const competencyFrameworkController = require('../controllers/competencyFrameworkController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, competencyFrameworkController.getAllFrameworks);
router.get('/:id', authenticate, competencyFrameworkController.getFrameworkById);
router.post('/', authenticate, authorize('USER_CREATE'), competencyFrameworkController.createFramework);
router.put('/:id', authenticate, authorize('USER_UPDATE'), competencyFrameworkController.updateFramework);
router.delete('/:id', authenticate, authorize('USER_UPDATE'), competencyFrameworkController.deleteFramework);

module.exports = router;
