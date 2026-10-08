/**
 * jobPositionRoutes.js
 */
const express = require('express');
const router = express.Router();

const jobPositionController = require('../controllers/jobPositionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, jobPositionController.getAllPositions);
router.get('/:id', authenticate, jobPositionController.getPositionById);
router.post('/', authenticate, authorize('USER_CREATE'), jobPositionController.createPosition);
router.put('/:id', authenticate, authorize('USER_UPDATE'), jobPositionController.updatePosition);

module.exports = router;
