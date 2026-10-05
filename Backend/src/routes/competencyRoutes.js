/**
 * competencyRoutes.js
 * Định nghĩa API endpoints cho Khung năng lực & Tiêu chí
 */
const express = require('express');
const router = express.Router();
const competencyController = require('../controllers/competencyController');

router.get('/', competencyController.getAll);
router.get('/:id', competencyController.getById);
router.post('/', competencyController.create);
router.put('/:id', competencyController.update);
router.delete('/:id', competencyController.delete);

module.exports = router;