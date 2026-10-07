/**
 * positionRoutes.js
 * Endpoints for /api/positions
 */

const express = require('express');
const router = express.Router();
const positionController = require('../controllers/positionController');
const { authenticate } = require('../middleware/authMiddleware');

// Get all positions (Dải lương tự động che đối với người không phải HR Manager)
router.get('/', authenticate, positionController.getAllPositions);

// Get single position details
router.get('/:id', authenticate, positionController.getPositionById);

// Create position & salary range
router.post('/', authenticate, positionController.createPosition);

// Update position & salary range
router.put('/:id', authenticate, positionController.updatePosition);

// Delete position
router.delete('/:id', authenticate, positionController.deletePosition);

// Check / validate proposed offer salary against range
router.post('/:id/validate-offer', authenticate, positionController.validateOffer);

module.exports = router;
