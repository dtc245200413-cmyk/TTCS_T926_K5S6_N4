/**
 * recruitmentRequestRoutes.js
 */

const express = require('express');
const router = express.Router();

const requestController = require('../controllers/recruitmentRequestController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.post('/', authenticate, requestController.createRequest);
router.get('/my', authenticate, requestController.getMyRequests);
router.get('/approvals', authenticate, authorize('RECRUITMENT_REQUEST_VIEW_ALL'), requestController.getRequestsForApproval);
router.get('/:id', authenticate, requestController.getRequestById);
router.patch('/:id/status', authenticate, requestController.updateStatus);

module.exports = router;
