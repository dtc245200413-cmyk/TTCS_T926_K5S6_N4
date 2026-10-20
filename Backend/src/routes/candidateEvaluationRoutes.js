const express = require('express');
const router = express.Router();
const controller = require('../controllers/candidateEvaluationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

router.use(authenticate);

// Lấy danh sách ứng viên đánh giá (Hiring Manager chỉ thấy bộ phận mình quản lý)
router.get('/', requireRoles('HIRING_MANAGER', 'HR_MANAGER', 'ADMIN', 'RECRUITER'), controller.getCandidates);

// Khởi tạo dữ liệu mẫu nếu cần
router.post('/seed-sample', controller.seedSampleData);

// Chi tiết điểm từng vòng, từng phiếu, quy tắc tổng hợp và cảnh báo thiếu phiếu
router.get('/:id', requireRoles('HIRING_MANAGER', 'HR_MANAGER', 'ADMIN', 'RECRUITER'), controller.getCandidateDetail);

// Trưởng bộ phận chọn Đạt/Không đạt, nhập nhận xét và xác nhận quyết định
router.post('/:id/decision', requireRoles('HIRING_MANAGER', 'HR_MANAGER', 'ADMIN'), controller.recordDecision);

// Nhập phiếu đánh giá phỏng vấn của phỏng vấn viên / Trưởng bộ phận / HR
router.post('/:id/evaluations', requireRoles('HIRING_MANAGER', 'HR_MANAGER', 'ADMIN', 'RECRUITER', 'INTERVIEWER'), controller.addEvaluation);

// Tạo Thư mời nhận việc (Chỉ ứng viên Đạt mới đủ điều kiện tạo Offer)
router.post('/:id/offer', requireRoles('HIRING_MANAGER', 'HR_MANAGER', 'ADMIN', 'RECRUITER'), controller.createOffer);

module.exports = router;
