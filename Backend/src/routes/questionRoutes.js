/**
 * questionRoutes.js
 * API routes for Question Bank management under /api/questions (SCRUM-74).
 */

const express = require('express');
const router  = express.Router();

const questionController = require('../controllers/questionController');
const { authenticate }   = require('../middleware/authMiddleware');

// Get list of competency criteria for dropdown filters and forms
router.get('/criteria', authenticate, questionController.getAllCriteria);

// Get summary statistics of question bank
router.get('/stats', authenticate, questionController.getStats);

// List questions with search, criteria filter, difficulty filter, pagination
router.get('/', authenticate, questionController.getAllQuestions);

// Get single question by ID
router.get('/:id', authenticate, questionController.getQuestionById);

// Create a new question
router.post('/', authenticate, questionController.createQuestion);

// Update an existing question
router.put('/:id', authenticate, questionController.updateQuestion);

// Delete a question
router.delete('/:id', authenticate, questionController.deleteQuestion);

module.exports = router;
