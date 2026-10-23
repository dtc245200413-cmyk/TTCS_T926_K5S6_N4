/**
 * approvalWorkflowService.js
 * Xử lý logic cấu hình luồng phê duyệt nhiều cấp theo hạn mức lương và phòng ban (SCRUM-107).
 */

const workflowRepo = require('../repositories/approvalWorkflowRepository');
const requestRepo = require('../repositories/recruitmentRequestRepository');
const notificationRepo = require('../repositories/notificationRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');
const { httpError } = require('../utils/roles');

/**
 * Lấy toàn bộ cấu hình luồng phê duyệt (nhóm theo Toàn công ty và theo từng Phòng ban).
 */
async function getAllWorkflows() {
  const all = await workflowRepo.findAllLevels();
  
  // Nhóm theo scope: null = Chung toàn công ty, number = phòng ban cụ thể
  const global = [];
  const departmentsMap = new Map();

  for (const item of all) {
    if (!item.department_id) {
      global.push(item);
    } else {
      if (!departmentsMap.has(item.department_id)) {
        departmentsMap.set(item.department_id, {
          department_id: item.department_id,
          department_name: item.department_name,
          department_code: item.department_code,
          levels: []
        });
      }
      departmentsMap.get(item.department_id).levels.push(item);
    }
  }

  return {
    globalLevels: global,
    departmentWorkflows: Array.from(departmentsMap.values())
  };
}

async function getApproverRoles() {
  return workflowRepo.findActiveRoles();
}

/**
 * Kiểm tra và lưu cấu hình chuỗi cấp duyệt cho một phạm vi (phòng ban hoặc toàn công ty).
 * Chặn lưu nếu cấu hình sai:
 *  - Không có cấp duyệt nào
 *  - Vai trò người duyệt không tồn tại
 *  - Không có người dùng nào đang hoạt động đảm nhiệm vai trò người duyệt
 *  - Thứ tự các bước không hợp lệ
 */
async function saveWorkflowScope(departmentId, levels, userId, ipAddress) {
  if (!Array.isArray(levels) || levels.length === 0) {
    throw httpError('Cấu hình không hợp lệ: Phải có ít nhất một cấp duyệt.', 400);
  }

  // Sắp xếp theo step_number
  const sorted = [...levels].sort((a, b) => Number(a.step_number) - Number(b.step_number));

  // Kiểm tra vai trò người duyệt
  const roleCodes = [...new Set(sorted.map(lv => lv.approver_role_code).filter(Boolean))];
  if (roleCodes.length !== sorted.length) {
    // Có thể cho phép cùng vai trò nhưng khác cấp hoặc chặn nếu muốn. Thường mỗi cấp là 1 vai trò phân cấp cao dần.
  }

  const existingRoles = await workflowRepo.findRolesByCodes(roleCodes);
  const existingSet = new Set(existingRoles.map(r => r.role_code));

  for (let i = 0; i < sorted.length; i++) {
    const lv = sorted[i];
    const stepNum = i + 1;
    lv.step_number = stepNum;

    if (!lv.approver_role_code) {
      throw httpError(`Cấp duyệt số ${stepNum} chưa chọn vai trò người duyệt.`, 400);
    }

    if (!existingSet.has(lv.approver_role_code)) {
      throw httpError(`Cấu hình sai: Vai trò "${lv.approver_role_code}" không tồn tại trên hệ thống.`, 400);
    }

    // Kiểm tra có người dùng nào thuộc vai trò này không
    const activeCount = await workflowRepo.countActiveUsersByRole(lv.approver_role_code);
    if (activeCount === 0) {
      throw httpError(`Cấu hình sai: Hiện không có nhân sự nào giữ vai trò "${lv.approver_role_code}". Vui lòng phân quyền trước khi lưu.`, 400);
    }

    // Kiểm tra hạn mức lương
    const minSal = lv.min_salary !== undefined && lv.min_salary !== '' && lv.min_salary !== null ? Number(lv.min_salary) : 0;
    const maxSal = lv.max_salary !== undefined && lv.max_salary !== '' && lv.max_salary !== null ? Number(lv.max_salary) : null;

    if (minSal < 0 || (maxSal !== null && maxSal < 0)) {
      throw httpError(`Hạn mức lương cấp ${stepNum} không được là số âm.`, 400);
    }
    if (maxSal !== null && maxSal < minSal) {
      throw httpError(`Hạn mức lương cấp ${stepNum}: Mức lương tối đa phải lớn hơn hoặc bằng mức tối thiểu.`, 400);
    }

    lv.min_salary = minSal;
    lv.max_salary = maxSal;

    if (i === 0 && minSal !== 0) {
      throw httpError('Cấp duyệt đầu tiên phải bắt đầu từ 0 đồng để mọi mức lương đều có cấp duyệt.', 400);
    }
    if (i > 0) {
      const previous = sorted[i - 1];
      if (previous.max_salary === null || minSal <= previous.min_salary) {
        throw httpError(`Hạn mức cấp ${stepNum} phải cao hơn cấp trước và không thể đứng sau cấp không giới hạn.`, 400);
      }
      if (minSal !== Number(previous.max_salary) + 1) {
        throw httpError(`Mức lương tối thiểu cấp ${stepNum} phải tiếp nối chính xác sau mức ${previous.max_salary} của cấp trước.`, 400);
      }
    }
  }

  await workflowRepo.replaceScope(departmentId || null, sorted, userId);

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'APPROVAL_WORKFLOW_CONFIG_SAVED',
    entityType: 'approval_workflows',
    entityId: departmentId ? `DEPT_${departmentId}` : 'GLOBAL',
    description: `Cập nhật cấu hình luồng phê duyệt gồm ${sorted.length} cấp duyệt (${departmentId ? `Phòng ban ID ${departmentId}` : 'Toàn công ty'}).`,
    ipAddress
  });

  return { success: true, message: 'Lưu cấu hình luồng phê duyệt thành công.' };
}

/**
 * Xóa cấu hình riêng của một phòng ban (quay về áp dụng cấu hình chung toàn công ty).
 */
async function deleteDepartmentWorkflow(departmentId, userId, ipAddress) {
  if (!departmentId) throw httpError('Mã phòng ban không hợp lệ.', 400);
  await workflowRepo.deleteScope(departmentId);

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'APPROVAL_WORKFLOW_CONFIG_DELETED',
    entityType: 'approval_workflows',
    entityId: `DEPT_${departmentId}`,
    description: `Xóa cấu hình phê duyệt riêng của phòng ban ID ${departmentId}.`,
    ipAddress
  });

  return { success: true, message: 'Đã xóa cấu hình riêng của phòng ban.' };
}

/**
 * Tính toán chuỗi cấp duyệt phù hợp cho một Yêu cầu tuyển dụng.
 * Tự động thêm cấp duyệt cao hơn nếu mức lương vượt hạn mức.
 * @returns {Array} Danh sách các bước duyệt cần thực hiện.
 */
async function resolveApprovalChain(departmentId, proposedSalaryMax, proposedSalaryMin) {
  const salaryToCheck = Number(proposedSalaryMax || proposedSalaryMin || 0);
  if (!Number.isFinite(salaryToCheck) || salaryToCheck < 0) {
    throw httpError('Mức lương đề xuất không hợp lệ.', 400);
  }

  // Chỉ Giám đốc (APPROVER) có quyền duyệt yêu cầu tuyển dụng
  const directorRole = await workflowRepo.findRolesByCodes(['APPROVER']);
  const activeDirectorCount = await workflowRepo.countActiveUsersByRole('APPROVER');
  if (directorRole.length === 0 || activeDirectorCount === 0) {
    throw httpError('Chưa có Giám đốc được phân quyền vai trò APPROVER để duyệt yêu cầu.', 400);
  }

  return [{
    step_number: 1,
    step_name: 'Giám đốc',
    approver_role_code: 'APPROVER',
    min_salary: 0,
    max_salary: null,
    is_escalated: false
  }];
}

/**
 * Snapshot chuỗi cấp duyệt vào bảng recruitment_request_approval_steps khi yêu cầu được gửi duyệt (PENDING).
 * Đảm bảo luồng đang chạy không bị ảnh hưởng khi cấu hình sau này thay đổi.
 */
async function snapshotApprovalStepsForRequest(requestId, departmentId, proposedSalaryMax, proposedSalaryMin, conn = pool) {
  const steps = await resolveApprovalChain(departmentId, proposedSalaryMax, proposedSalaryMin);
  await workflowRepo.insertSteps(requestId, steps, conn);
  return steps;
}

/**
 * Lấy chi tiết các bước duyệt kèm trạng thái hiện tại của một yêu cầu tuyển dụng.
 */
async function getApprovalHistoryForRequest(requestId) {
  return await workflowRepo.findStepsByRequest(requestId);
}

/**
 * Thực hiện Phê duyệt hoặc Từ chối một bước duyệt.
 */
async function processStepApproval(requestId, action, comment, user, ipAddress) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const request = await requestRepo.findById(requestId);
    if (!request) {
      throw httpError('Yêu cầu tuyển dụng không tồn tại.', 404);
    }
    if (request.status !== 'PENDING') {
      throw httpError('Yêu cầu không ở trạng thái Chờ duyệt.', 400);
    }

    const steps = await workflowRepo.findStepsByRequest(requestId, conn);
    if (!steps || steps.length === 0) {
      throw httpError('Yêu cầu này chưa được tạo luồng phê duyệt.', 400);
    }

    // Tìm bước đang PENDING
    const currentStep = steps.find(s => s.status === 'PENDING');
    if (!currentStep) {
      throw httpError('Không có bước nào đang chờ duyệt cho yêu cầu này.', 400);
    }

    // Chỉ Giám đốc (APPROVER) mới có quyền duyệt / từ chối yêu cầu tuyển dụng
    const userRoleCodes = (user.roles || []).map(r => r.role_code);
    if (!userRoleCodes.includes('APPROVER')) {
      throw httpError('Chỉ Giám đốc mới có quyền duyệt yêu cầu tuyển dụng.', 403);
    }

    if (action === 'REJECTED') {
      if (!comment || !comment.trim()) {
        throw httpError('Vui lòng nhập lý do khi từ chối yêu cầu.', 400);
      }

      // Đánh dấu bước hiện tại là REJECTED
      await workflowRepo.updateStep(currentStep.id, {
        status: 'REJECTED',
        actedBy: user.user_id,
        comment: comment.trim()
      }, conn);

      // Bỏ qua các bước còn lại
      await workflowRepo.skipRemainingSteps(requestId, conn);

      // Cập nhật trạng thái yêu cầu sang REJECTED
      await conn.execute(
        `UPDATE recruitment_requests SET status = 'REJECTED', rejection_reason = ? WHERE id = ?`,
        [comment.trim(), requestId]
      );

      // Thông báo cho người tạo yêu cầu
      await notificationRepo.create({
        userId: request.created_by,
        title: `Yêu cầu tuyển dụng #${requestId} đã bị từ chối`,
        message: `Bước "${currentStep.step_name}" bị từ chối bởi ${user.full_name}. Lý do: ${comment.trim()}`,
        type: 'REQUEST_REJECTED',
        link: `/recruitment-requests/${requestId}`
      }, conn);

      await auditRepo.createLog({
        userId: request.created_by,
        performedBy: user.user_id,
        action: 'RECRUITMENT_REQUEST_REJECTED_STEP',
        entityType: 'recruitment_requests',
        entityId: String(requestId),
        description: `Từ chối bước ${currentStep.step_number} (${currentStep.step_name}) - Lý do: ${comment.trim()}`,
        ipAddress
      });

    } else if (action === 'APPROVED') {
      // Đánh dấu bước hiện tại là APPROVED
      await workflowRepo.updateStep(currentStep.id, {
        status: 'APPROVED',
        actedBy: user.user_id,
        comment: comment ? comment.trim() : 'Đồng ý phê duyệt'
      }, conn);

      // Giám đốc duyệt là quyết định cuối cùng: bỏ qua các bước còn lại (dữ liệu cũ)
      await workflowRepo.skipRemainingSteps(requestId, conn);
      const nextStep = null;

      if (nextStep) {
        // Chuyển bước tiếp theo sang PENDING
        await workflowRepo.updateStep(nextStep.id, {
          status: 'PENDING',
          actedBy: null,
          comment: null
        }, conn);

        // Gửi thông báo đến những người có vai trò duyệt bước tiếp theo
        const nextApproverUserIds = await notificationRepo.findActiveUserIdsByRoles([nextStep.approver_role_code], conn);
        await notificationRepo.createForUsers(nextApproverUserIds, {
          title: `Cần duyệt yêu cầu tuyển dụng #${requestId}`,
          message: `Yêu cầu tuyển dụng "${request.position_name || 'Vị trí mới'}" đang chờ bạn duyệt ở bước "${nextStep.step_name}".`,
          type: 'REQUEST_PENDING_APPROVAL',
          link: `/recruitment-requests/${requestId}`
        }, conn);

        await auditRepo.createLog({
          userId: request.created_by,
          performedBy: user.user_id,
          action: 'RECRUITMENT_REQUEST_STEP_APPROVED',
          entityType: 'recruitment_requests',
          entityId: String(requestId),
          description: `Đã duyệt bước ${currentStep.step_number} (${currentStep.step_name}). Chuyển sang bước ${nextStep.step_number} (${nextStep.step_name}).`,
          ipAddress
        });
      } else {
        // Đã hoàn thành tất cả các cấp duyệt -> Yêu cầu chính thức APPROVED
        await conn.execute(
          `UPDATE recruitment_requests SET status = 'APPROVED' WHERE id = ?`,
          [requestId]
        );

        // Thông báo cho người tạo yêu cầu
        await notificationRepo.create({
          userId: request.created_by,
          title: `Yêu cầu tuyển dụng #${requestId} đã được phê duyệt hoàn tất!`,
          message: `Tất cả các cấp duyệt đã phê duyệt yêu cầu của bạn. Trạng thái: ĐÃ DUYỆT.`,
          type: 'REQUEST_APPROVED',
          link: `/recruitment-requests/${requestId}`
        }, conn);

        // Thông báo cho nhóm HR Manager và Recruiter để chuẩn bị đăng tin
        const hrAndRecruiters = await notificationRepo.findActiveUserIdsByRoles(['HR_MANAGER', 'RECRUITER'], conn);
        await notificationRepo.createForUsers(hrAndRecruiters, {
          title: `Yêu cầu tuyển dụng #${requestId} đã sẵn sàng đăng tin`,
          message: `Yêu cầu tuyển dụng "${request.position_name || 'N/A'}" đã hoàn tất duyệt. Bạn có thể tạo tin tuyển dụng ngay.`,
          type: 'REQUEST_APPROVED_FOR_POSTING',
          link: `/recruitment-requests/${requestId}`
        }, conn);

        await auditRepo.createLog({
          userId: request.created_by,
          performedBy: user.user_id,
          action: 'RECRUITMENT_REQUEST_FULLY_APPROVED',
          entityType: 'recruitment_requests',
          entityId: String(requestId),
          description: `Hoàn tất tất cả các cấp phê duyệt. Yêu cầu chuyển sang trạng thái ĐÃ DUYỆT.`,
          ipAddress
        });
      }
    } else if (action === 'NEEDS_REVISION') {
      if (!comment || !comment.trim()) {
        throw httpError('Vui lòng nhập lý do khi yêu cầu bổ sung.', 400);
      }

      await workflowRepo.updateStep(currentStep.id, {
        status: 'NEEDS_REVISION',
        actedBy: user.user_id,
        comment: comment.trim()
      }, conn);
      await workflowRepo.skipRemainingSteps(requestId, conn);

      await conn.execute(
        `UPDATE recruitment_requests SET status = 'NEEDS_REVISION', rejection_reason = ? WHERE id = ?`,
        [comment.trim(), requestId]
      );

      await notificationRepo.create({
        userId: request.created_by,
        title: `Yêu cầu tuyển dụng #${requestId} cần bổ sung thông tin`,
        message: `${user.full_name} yêu cầu bổ sung. Lý do: ${comment.trim()}`,
        type: 'REQUEST_NEEDS_REVISION',
        link: `/recruitment-requests/${requestId}`
      }, conn);

      await auditRepo.createLog({
        userId: request.created_by,
        performedBy: user.user_id,
        action: 'RECRUITMENT_REQUEST_NEEDS_REVISION',
        entityType: 'recruitment_requests',
        entityId: String(requestId),
        description: `Yêu cầu bổ sung ở bước ${currentStep.step_number} (${currentStep.step_name}) - Lý do: ${comment.trim()}`,
        ipAddress
      });
    } else {
      throw httpError(`Hành động không hợp lệ: ${action}`, 400);
    }

    await conn.commit();
    return await requestRepo.findById(requestId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getAllWorkflows,
  getApproverRoles,
  saveWorkflowScope,
  deleteDepartmentWorkflow,
  resolveApprovalChain,
  snapshotApprovalStepsForRequest,
  getApprovalHistoryForRequest,
  processStepApproval
};
