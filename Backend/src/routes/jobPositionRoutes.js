/**
 * jobPositionRoutes.js
 */
const express = require('express');
const router = express.Router();
const jobPositionController = require('../controllers/jobPositionController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, jobPositionController.getAllPositions);

module.exports = router;
