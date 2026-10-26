/**
 * recruitmentRequestService.js
 */

const requestRepo = require('../repositories/recruitmentRequestRepository');
const jobPositionRepo = require('../repositories/jobPositionRepository');
const auditRepo = require('../repositories/auditRepository');
const workflowService = require('./approvalWorkflowService');
const notificationRepo = require('../repositories/notificationRepository');

async function createRequest(data, userId, ipAddress) {
  const { department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, salary_explanation, status } = data;

  if (status === 'PENDING') {
    if (!department_id || !position_id || !headcount || !reason || !needed_by_date) {
      const error = new Error('Vui lòng nhập đầy đủ các trường bắt buộc.');
      error.statusCode = 400;
      throw error;
    }
    if (!job_description || !candidate_requirements) {
      const error = new Error('Vui lòng nhập Mô tả công việc và Yêu cầu ứng viên khi gửi yêu cầu.');
      error.statusCode = 400;
      throw error;
    }

    // SCRUM-107: Kiểm tra trước chuỗi cấp duyệt.
    // Nếu cấu hình sai (không có cấp duyệt nào khớp) -> Chặn lưu / Chặn gửi
    await workflowService.resolveApprovalChain(department_id, proposed_salary_max, proposed_salary_min);
  }

  // Validate date is not in the past if provided
  if (needed_by_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const neededDate = new Date(needed_by_date);
    if (neededDate < today) {
      const error = new Error('Ngày cần người không được ở quá khứ.');
      error.statusCode = 400;
      throw error;
    }
  }

  let isOutsideStandard = false;
  let position = null;
  // Check salary vs standard range if position is provided
  if (position_id) {
    position = await jobPositionRepo.findById(position_id);
    if (!position) {
      const error = new Error('Chức danh không hợp lệ.');
      error.statusCode = 400;
      throw error;
    }

    isOutsideStandard = 
      (proposed_salary_min && position.min_salary && proposed_salary_min < position.min_salary) ||
      (proposed_salary_max && position.max_salary && proposed_salary_max > position.max_salary) ||
      (proposed_salary_min && position.max_salary && proposed_salary_min > position.max_salary);
  }

  if (status === 'PENDING' && isOutsideStandard && !salary_explanation) {
    const error = new Error('Dải lương đề xuất nằm ngoài chuẩn của chức danh. Vui lòng nhập giải trình.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await requestRepo.create({
    department_id: department_id || null, 
    position_id: position_id || null, 
    headcount: headcount || null, 
    reason: reason || null, 
    proposed_salary_min, 
    proposed_salary_max, 
    needed_by_date: needed_by_date || null, 
    job_description, 
    candidate_requirements, 
    salary_explanation, 
    status, 
    created_by: userId,
    work_location_code: data.work_location_code || null,
    work_type_code: data.work_type_code || null
  });

  if (data.work_location_code) {
    const { pool } = require('../config/database');
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'WORK_LOCATION' AND code = ?", [data.work_location_code]);
  }
  if (data.work_type_code) {
    const { pool } = require('../config/database');
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'WORK_TYPE' AND code = ?", [data.work_type_code]);
  }

  // SCRUM-107: Nếu gửi yêu cầu (PENDING) -> Snapshot chuỗi cấp duyệt để đảm bảo luồng đang chạy không bị ảnh hưởng khi cấu hình thay đổi sau này
  if (status === 'PENDING') {
    const steps = await workflowService.snapshotApprovalStepsForRequest(
      insertId,
      department_id,
      proposed_salary_max,
      proposed_salary_min
    );

    // Gửi thông báo đến cấp duyệt đầu tiên
    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      const approverIds = await notificationRepo.findActiveUserIdsByRoles([firstStep.approver_role_code]);
      await notificationRepo.createForUsers(approverIds, {
        title: `Yêu cầu tuyển dụng mới #${insertId} cần phê duyệt`,
        message: `Yêu cầu tuyển dụng "${position ? position.position_name : 'Vị trí mới'}" đang chờ bạn phê duyệt ở bước "${firstStep.step_name || 'Cấp duyệt 1'}".`,
        type: 'REQUEST_PENDING_APPROVAL',
        link: `/recruitment-requests/${insertId}`
      });
    }
  }

  const newRequest = await requestRepo.findById(insertId);

  // Audit
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'RECRUITMENT_REQUEST_CREATED',
    entityType: 'recruitment_requests',
    entityId: String(insertId),
    description: `Created recruitment request for position ${position ? position.position_name : 'N/A'} (status: ${status})`,
    ipAddress
  });

  return newRequest;
}

async function getMyRequests(userId, roles = []) {
  const isAdminOrHR = roles.some(role => 
    role.role_code === 'ADMIN' || 
    role.role_code === 'HR_MANAGER' || 
    role.role_code === 'RECRUITER'
  );
  
  if (isAdminOrHR) {
    return await requestRepo.getAllSystemWide();
  }
  return await requestRepo.getAll(userId);
}

async function getAllForApproval(user) {
  const requests = await requestRepo.getAllForApproval();
  if (!requests.length) return [];

  // Lấy các bước duyệt đang PENDING
  const requestIds = requests.map(r => r.id);
  const workflowRepo = require('../repositories/approvalWorkflowRepository');
  const pendingSteps = await workflowRepo.findPendingStepsForRequests(requestIds);
  const stepMap = new Map();
  for (const s of pendingSteps) {
    stepMap.set(s.recruitment_request_id, s);
  }

  // Gắn thông tin bước duyệt vào từng yêu cầu
  const userRoles = (user?.roles || []).map(r => r.role_code);

  return requests.map(r => {
    const currentStep = stepMap.get(r.id);
    const canApprove = Boolean(currentStep && userRoles.includes(currentStep.approver_role_code));
    return {
      ...r,
      current_step: currentStep ? {
        step_number: currentStep.step_number,
        step_name: currentStep.step_name,
        approver_role_code: currentStep.approver_role_code,
        approver_role_name: currentStep.approver_role_name,
        is_escalated: Boolean(currentStep.is_escalated),
        total_steps: currentStep.total_steps
      } : null,
      can_approve: Boolean(canApprove)
    };
  });
}

async function updateRequestStatus(id, status, rejectionReason, userId, ipAddress, user) {
  const request = await requestRepo.findById(id);
  if (!request) {
    const error = new Error('Yêu cầu không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  if (request.status !== 'PENDING') {
    const error = new Error('Chỉ có thể duyệt/từ chối các yêu cầu đang ở trạng thái CHỜ DUYỆT.');
    error.statusCode = 400;
    throw error;
  }

  // Nếu yêu cầu đã có chuỗi duyệt đa cấp snapshot, delegate sang workflowService
  const steps = await workflowService.getApprovalHistoryForRequest(id);
  if (steps && steps.length > 0) {
    return await workflowService.processStepApproval(
      id,
      status,
      rejectionReason,
      user || { user_id: userId, roles: [{ role_code: 'APPROVER' }] },
      ipAddress
    );
  }
  
  // Fallback cho yêu cầu cũ chưa có snapshot
  await requestRepo.updateStatus(id, status, rejectionReason);

  await auditRepo.createLog({
    userId: request.created_by,
    performedBy: userId,
    action: `RECRUITMENT_REQUEST_${status}`,
    entityType: 'recruitment_requests',
    entityId: String(id),
    description: `Updated recruitment request status to ${status}${rejectionReason ? ` - Lý do: ${rejectionReason}` : ''}`,
    ipAddress
  });

  return await requestRepo.findById(id);
}

async function updateRequest(id, data, userId, ipAddress) {
  const existing = await requestRepo.findById(id);
  if (!existing) {
    const error = new Error('Yêu cầu không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  // Chỉ người tạo mới được sửa hoặc quyền admin
  if (existing.created_by !== userId) {
    const error = new Error('Bạn không có quyền chỉnh sửa yêu cầu này.');
    error.statusCode = 403;
    throw error;
  }

  // Chỉ cho phép sửa khi trạng thái là DRAFT hoặc NEEDS_REVISION
  if (!['DRAFT', 'NEEDS_REVISION'].includes(existing.status)) {
    const error = new Error('Chỉ có thể chỉnh sửa yêu cầu ở trạng thái Lưu nháp hoặc Cần bổ sung.');
    error.statusCode = 400;
    throw error;
  }

  const {
    department_id,
    position_id,
    headcount,
    reason,
    proposed_salary_min,
    proposed_salary_max,
    needed_by_date,
    job_description,
    candidate_requirements,
    salary_explanation,
    status
  } = data;

  const targetStatus = status || existing.status;

  if (targetStatus === 'PENDING') {
    if (!department_id || !position_id || !headcount || !reason || !needed_by_date) {
      const error = new Error('Vui lòng nhập đầy đủ các trường bắt buộc.');
      error.statusCode = 400;
      throw error;
    }
    if (!job_description || !candidate_requirements) {
      const error = new Error('Vui lòng nhập Mô tả công việc và Yêu cầu ứng viên khi gửi yêu cầu.');
      error.statusCode = 400;
      throw error;
    }

    await workflowService.resolveApprovalChain(department_id, proposed_salary_max, proposed_salary_min);
  }

  if (needed_by_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const neededDate = new Date(needed_by_date);
    if (neededDate < today) {
      const error = new Error('Ngày cần người không được ở quá khứ.');
      error.statusCode = 400;
      throw error;
    }
  }

  let isOutsideStandard = false;
  let position = null;
  if (position_id) {
    position = await jobPositionRepo.findById(position_id);
    if (!position) {
      const error = new Error('Chức danh không hợp lệ.');
      error.statusCode = 400;
      throw error;
    }

    isOutsideStandard = 
      (proposed_salary_min && position.min_salary && proposed_salary_min < position.min_salary) ||
      (proposed_salary_max && position.max_salary && proposed_salary_max > position.max_salary) ||
      (proposed_salary_min && position.max_salary && proposed_salary_min > position.max_salary);
  }

  if (targetStatus === 'PENDING' && isOutsideStandard && !salary_explanation) {
    const error = new Error('Dải lương đề xuất nằm ngoài chuẩn của chức danh. Vui lòng nhập giải trình.');
    error.statusCode = 400;
    throw error;
  }

  // Cập nhật thông tin yêu cầu
  await requestRepo.update(id, {
    department_id: department_id || null,
    position_id: position_id || null,
    headcount: headcount || null,
    reason: reason || null,
    proposed_salary_min,
    proposed_salary_max,
    needed_by_date: needed_by_date || null,
    job_description,
    candidate_requirements,
    salary_explanation,
    status: targetStatus,
    work_location_code: data.work_location_code || null,
    work_type_code: data.work_type_code || null
  });

  const { pool } = require('../config/database');
  if (data.work_location_code) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'WORK_LOCATION' AND code = ?", [data.work_location_code]);
  }
  if (data.work_type_code) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'WORK_TYPE' AND code = ?", [data.work_type_code]);
  }

  // Nếu gửi duyệt lại (chuyển sang PENDING) -> Xóa các bước duyệt cũ và snapshot lại chuỗi duyệt
  if (targetStatus === 'PENDING') {
    await pool.query("DELETE FROM recruitment_request_approval_steps WHERE recruitment_request_id = ?", [id]);
    const steps = await workflowService.snapshotApprovalStepsForRequest(
      id,
      department_id,
      proposed_salary_max,
      proposed_salary_min
    );

    if (steps && steps.length > 0) {
      const firstStep = steps[0];
      const approverIds = await notificationRepo.findActiveUserIdsByRoles([firstStep.approver_role_code]);
      await notificationRepo.createForUsers(approverIds, {
        title: `Yêu cầu tuyển dụng #${id} đã được cập nhật và gửi duyệt lại`,
        message: `Yêu cầu tuyển dụng "${position ? position.position_name : 'Vị trí'}" đã được chỉnh sửa bổ sung và gửi duyệt lại.`,
        type: 'REQUEST_PENDING_APPROVAL',
        link: `/recruitment-requests/${id}`
      });
    }
  }

  const updatedRequest = await requestRepo.findById(id);

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: targetStatus === 'PENDING' ? 'RECRUITMENT_REQUEST_RESUBMITTED' : 'RECRUITMENT_REQUEST_UPDATED',
    entityType: 'recruitment_requests',
    entityId: String(id),
    description: `Cập nhật yêu cầu tuyển dụng #${id} (trạng thái: ${targetStatus})`,
    ipAddress
  });

  return updatedRequest;
}

async function assignRecruiter(id, data, userId, ipAddress) {
  const existing = await requestRepo.findById(id);
  if (!existing) {
    const error = new Error('Yêu cầu không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const { recruiter_id, assistant_recruiter_id, assignment_note } = data;
  if (!recruiter_id) {
    const error = new Error('Vui lòng chọn Recruiter chính.');
    error.statusCode = 400;
    throw error;
  }

  const nextStatus = existing.status === 'DRAFT' ? 'IN_PROGRESS' : existing.status;
  await requestRepo.assignRecruiter(id, {
    recruiter_id,
    assistant_recruiter_id,
    assignment_note,
    status: nextStatus
  });

  const updated = await requestRepo.findById(id);

  let desc = `Phân công recruiter ${updated.recruiter_name || ''} làm recruiter chính`;
  if (updated.assistant_recruiter_name) {
    desc += `, ${updated.assistant_recruiter_name} làm recruiter hỗ trợ`;
  }
  if (assignment_note) {
    desc += ` (Ghi chú: ${assignment_note})`;
  }

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'Phân công recruiter',
    entityType: 'recruitment_requests',
    entityId: String(id),
    description: desc,
    ipAddress
  });

  return updated;
}

async function updateStatusAction(id, data, userId, ipAddress) {
  const existing = await requestRepo.findById(id);
  if (!existing) {
    const error = new Error('Yêu cầu không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const { status, reason, notify_recruiter } = data;
  if (!['PAUSED', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'].includes(status)) {
    const error = new Error('Trạng thái thao tác không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  if (['PAUSED', 'CLOSED', 'CANCELLED'].includes(status) && (!reason || !reason.trim())) {
    const error = new Error('Vui lòng nhập lý do thực hiện thao tác.');
    error.statusCode = 400;
    throw error;
  }

  await requestRepo.updateStatusAction(id, {
    status,
    reason: reason ? reason.trim() : null
  });

  const actionNameMap = {
    PAUSED: 'Tạm dừng yêu cầu',
    IN_PROGRESS: 'Tiếp tục yêu cầu',
    CLOSED: 'Đóng yêu cầu',
    CANCELLED: 'Hủy yêu cầu'
  };

  const actionLabel = actionNameMap[status] || status;
  const description = reason ? `Lý do: ${reason.trim()}` : `Chuyển trạng thái yêu cầu sang ${actionLabel}`;

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: actionLabel,
    entityType: 'recruitment_requests',
    entityId: String(id),
    description,
    ipAddress
  });

  return await requestRepo.findById(id);
}

async function getRequestLogs(id) {
  return await requestRepo.getAuditLogsForRequest(id);
}

async function getRecruitersWorkload() {
  return await requestRepo.getRecruitersWithWorkload();
}

module.exports = {
  createRequest,
  updateRequest,
  getMyRequests,
  getAllForApproval,
  updateRequestStatus,
  assignRecruiter,
  updateStatusAction,
  getRequestLogs,
  getRecruitersWorkload
};

