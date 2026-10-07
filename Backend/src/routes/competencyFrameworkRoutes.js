const express = require('express');
const router = express.Router();

const competencyFrameworkController =
  require('../controllers/competencyFrameworkController');

const {
  authenticate,
  authorize
} = require('../middleware/authMiddleware');

// XEM
router.get(
  '/',
  authenticate,
  authorize('COMPETENCY_VIEW'),
  competencyFrameworkController.getAllFrameworks
);

router.get(
  '/:id',
  authenticate,
  authorize('COMPETENCY_VIEW'),
  competencyFrameworkController.getFrameworkById
);

// QUẢN LÝ
router.post(
  '/',
  authenticate,
  authorize('COMPETENCY_MANAGE'),
  competencyFrameworkController.createFramework
);

router.put(
  '/:id',
  authenticate,
  authorize('COMPETENCY_MANAGE'),
  competencyFrameworkController.updateFramework
);

router.delete(
  '/:id',
  authenticate,
  authorize('COMPETENCY_MANAGE'),
  competencyFrameworkController.deleteFramework
);

module.exports = router;