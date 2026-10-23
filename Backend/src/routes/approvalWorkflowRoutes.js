/**
 * approvalWorkflowRoutes.js
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/approvalWorkflowController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

// Tất cả endpoints đều cần đăng nhập
router.use(authenticate);

// Xem trước chuỗi cấp duyệt (dành cho người tạo yêu cầu)
router.post('/preview', controller.previewApprovalChain);

// Lấy lịch sử bước duyệt của 1 yêu cầu cụ thể
router.get('/requests/:requestId/steps', controller.getRequestApprovalSteps);

// Thực hiện phê duyệt / từ chối 1 bước duyệt
router.post('/requests/:requestId/steps/action', controller.handleStepAction);

// Cấu hình luồng duyệt: Chỉ HR_MANAGER hoặc ADMIN được xem và sửa
router.get('/roles', requireRoles('HR_MANAGER', 'ADMIN'), controller.getApproverRoles);
router.get('/', requireRoles('HR_MANAGER', 'ADMIN'), controller.getAllWorkflows);
router.post('/scope', requireRoles('HR_MANAGER', 'ADMIN'), controller.saveWorkflowScope);
router.delete('/scope/:departmentId', requireRoles('HR_MANAGER', 'ADMIN'), controller.deleteDepartmentWorkflow);

module.exports = router;
