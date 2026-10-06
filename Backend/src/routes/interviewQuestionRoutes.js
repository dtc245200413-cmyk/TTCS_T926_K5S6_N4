/**
 * interviewQuestionRoutes.js
 */

const express = require('express');
const router = express.Router();

const interviewQuestionController = require('../controllers/interviewQuestionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/criteria-options', authenticate, interviewQuestionController.getCriteriaOptions);
router.get('/', authenticate, interviewQuestionController.getAllQuestions);
router.get('/:id', authenticate, interviewQuestionController.getQuestionById);
router.post('/', authenticate, authorize('USER_CREATE'), interviewQuestionController.createQuestion);
router.put('/:id', authenticate, authorize('USER_UPDATE'), interviewQuestionController.updateQuestion);
router.delete('/:id', authenticate, authorize('USER_UPDATE'), interviewQuestionController.deleteQuestion);

module.exports = router;
