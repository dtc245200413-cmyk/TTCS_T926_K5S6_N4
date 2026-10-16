const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

router.use(authenticate);

// Recruiters and HR can access
router.get('/duplicates', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.findDuplicates);
router.get('/merges', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.getActiveMerges);
router.post('/merge', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.mergeCandidates);
router.post('/merges/:mergeId/undo', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.undoMerge);
router.get('/:id/resume', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.downloadResume);
router.get('/', candidateController.getAllCandidates);
router.post('/', candidateController.createCandidate);
router.get('/:id/history', candidateController.getStageHistory);
router.put('/:id/status', candidateController.updateStatus);

module.exports = router;
