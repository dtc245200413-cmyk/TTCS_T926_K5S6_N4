const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Recruiters and HR can access
router.get('/', candidateController.getAllCandidates);
router.post('/', candidateController.createCandidate);
router.put('/:id/status', candidateController.updateStatus);

module.exports = router;
