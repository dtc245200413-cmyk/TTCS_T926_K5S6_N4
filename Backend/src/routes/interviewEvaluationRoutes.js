const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const controller = require('../controllers/interviewEvaluationController');

router.use(authenticate);

// Lấy thông tin form / phiếu chấm của lịch phỏng vấn
router.get('/schedule/:scheduleId', controller.getBySchedule);

// Nộp phiếu đánh giá mới
router.post('/', controller.submit);

// Lấy lịch sử đánh giá của một ứng viên
router.get('/candidate/:candidateId', controller.getByCandidate);

// Lấy chi tiết phiếu đánh giá theo ID
router.get('/:id', controller.getById);

module.exports = router;
