/**
 * competencyRoutes.js
 * API routes for Competency Criteria management under /api/competencies.
 */

const express = require('express');
const router  = express.Router();

const competencyController = require('../controllers/competencyController');
const { authenticate }     = require('../middleware/authMiddleware');

// Flexible auth: if token is present, verify it; if not, still allow access
const flexibleAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

// GET /api/competencies - Get list of all competencies for select dropdowns
router.get('/', flexibleAuth, competencyController.getAllCompetencies);

// GET /api/competencies/:id - Get specific competency detail
router.get('/:id', flexibleAuth, competencyController.getCompetencyById);

// POST /api/competencies - Add a new competency
router.post('/', flexibleAuth, competencyController.createCompetency);

module.exports = router;
