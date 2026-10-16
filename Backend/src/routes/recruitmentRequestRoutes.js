/**
 * recruitmentRequestRoutes.js
 */

const express = require('express');
const router = express.Router();

const requestController = require('../controllers/recruitmentRequestController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/', authenticate, requestController.createRequest);
router.get('/my', authenticate, requestController.getMyRequests);
router.get('/approvals', authenticate, requestController.getRequestsForApproval);
router.get('/recruiters-workload', authenticate, requestController.getRecruitersWorkload);
router.get('/:id/logs', authenticate, requestController.getRequestLogs);
router.get('/:id', authenticate, requestController.getRequestById);
router.put('/:id', authenticate, requestController.updateRequest);
router.patch('/:id/status', authenticate, requestController.updateStatus);
router.patch('/:id/assign', authenticate, requestController.assignRecruiter);
router.patch('/:id/status-action', authenticate, requestController.updateStatusAction);

module.exports = router;
