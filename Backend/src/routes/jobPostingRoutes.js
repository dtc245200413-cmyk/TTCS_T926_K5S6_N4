const express = require('express');
const router = express.Router();
const controller = require('../controllers/jobPostingController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

router.use(authenticate);
router.use(requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'));
router.get('/eligible-requests', controller.getEligibleRequests);
router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.updateDraft);
router.get('/:id/preview', controller.getPreview);
router.post('/:id/submit', controller.submit);
router.patch('/:id/review', requireRoles('ADMIN', 'HR_MANAGER'), controller.review);
router.post('/:id/publish', requireRoles('ADMIN', 'HR_MANAGER'), controller.publish);
router.patch('/:id/hide', requireRoles('ADMIN', 'RECRUITER'), authorize('JOB_POSTING_CLOSE'), controller.hide);
router.patch('/:id/unhide', requireRoles('ADMIN', 'RECRUITER'), authorize('JOB_POSTING_CLOSE'), controller.unhide);
router.patch('/:id/close', requireRoles('ADMIN', 'RECRUITER'), authorize('JOB_POSTING_CLOSE'), controller.close);

module.exports = router;
