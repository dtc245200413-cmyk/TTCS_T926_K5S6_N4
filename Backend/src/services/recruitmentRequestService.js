/**
 * recruitmentRequestService.js
 */

const requestRepo = require('../repositories/recruitmentRequestRepository');
const jobPositionRepo = require('../repositories/jobPositionRepository');
const auditRepo = require('../repositories/auditRepository');
const approvalRepo = require('../repositories/recruitmentRequestApprovalRepository');
const budgetService = require('./departmentBudgetService');
const { pool } = require('../config/database');
const { randomUUID } = require('crypto');
const { businessError, positiveInteger, calculateRequestBudget, moneyToCents, formatMoney, requireHrPermission } = require('../utils/recruitmentBudget');

async function createRequest(data, userId, ipAddress) {
  const { department_id, position_id, headcount, reason, proposed_min_salary, proposed_max_salary, date_needed, job_description, requirements, status = 'DRAFT' } = data;
  if (!['DRAFT', 'PENDING'].includes(status)) {
    throw businessError('Chỉ được tạo yêu cầu ở trạng thái DRAFT hoặc PENDING.', 400, 'INVALID_REQUEST_STATUS');
  }
  const budgetFields = calculateRequestBudget(data, status === 'PENDING');
  // These columns are NOT NULL in the existing job_requisitions schema, including drafts.
  positiveInteger(department_id, 'Phòng ban');
  positiveInteger(position_id, 'Chức danh');
  positiveInteger(headcount, 'Headcount');

  if (status === 'PENDING') {
    if (!department_id || !position_id || !headcount || !reason || !date_needed) {
      const error = new Error('Vui lòng nhập đầy đủ các trường bắt buộc.');
      error.statusCode = 400;
      throw error;
    }
    if (!job_description || !requirements) {
      const error = new Error('Vui lòng nhập Mô tả công việc và Yêu cầu ứng viên khi gửi yêu cầu.');
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate date is not in the past if provided
  if (date_needed) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const neededDate = new Date(date_needed);
    if (neededDate < today) {
      const error = new Error('Ngày cần người không được ở quá khứ.');
      error.statusCode = 400;
      throw error;
    }
  }

  let position = null;
  // Validate the selected position without referencing absent requisition columns.
  if (position_id) {
    position = await jobPositionRepo.findById(position_id);
    if (!position) {
      const error = new Error('Chức danh không hợp lệ.');
      error.statusCode = 400;
      throw error;
    }

  }

  const insertId = await requestRepo.create({
    requisition_code: `REQ-${randomUUID()}`,
    department_id: department_id || null, 
    position_id: position_id || null, 
    headcount: headcount || null, 
    reason: reason || null, 
    proposed_min_salary,
    proposed_max_salary,
    date_needed: date_needed || null,
    job_description, 
    requirements,
    status, 
    created_by: userId,
    ...budgetFields
  });

  const newRequest = await requestRepo.findById(insertId);

  // Audit
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'RECRUITMENT_REQUEST_CREATED',
    entityType: 'job_requisitions',
    entityId: String(insertId),
    description: `Created recruitment request for position ${position ? position.position_name : 'N/A'}`,
    ipAddress
  });

  return newRequest;
}

async function getMyRequests(userId, permissions = []) {
  if (permissions.includes('RECRUITMENT_REQUEST_VIEW_ALL')) {
    return await requestRepo.getAllSystemWide();
  }
  return await requestRepo.getAll(userId);
}

async function getAllForApproval() {
  return await requestRepo.getAllForApproval();
}

async function updateRequestStatus(id, data, user, ipAddress) {
  id = positiveInteger(id, 'Mã yêu cầu');
  const { status } = data;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw businessError('Chỉ được phê duyệt hoặc từ chối.', 400, 'INVALID_REQUEST_STATUS');
  }
  requireHrPermission(user, status === 'APPROVED' ? 'RECRUITMENT_REQUEST_APPROVE' : 'RECRUITMENT_REQUEST_REJECT');
  const rejectionReason = typeof data.rejection_reason === 'string' ? data.rejection_reason.trim() : '';
  const overrideReason = typeof data.override_reason === 'string' ? data.override_reason.trim() : '';
  if (status === 'REJECTED' && !rejectionReason) throw businessError('Vui lòng cung cấp lý do từ chối.');
  if (data.is_override !== undefined && typeof data.is_override !== 'boolean') {
    throw businessError('is_override phải là boolean.');
  }
  const override = data.is_override === true;
  if (override) {
    if (status !== 'APPROVED') throw businessError('Override chỉ áp dụng khi phê duyệt.');
    requireHrPermission(user, 'RECRUITMENT_REQUEST_OVERRIDE');
    if (!overrideReason) throw businessError('Override bắt buộc có lý do.', 400, 'OVERRIDE_REASON_REQUIRED');
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const request = await requestRepo.findByIdForUpdate(id, connection);
    if (!request) throw businessError('Yêu cầu không tồn tại.', 404, 'REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw businessError('Chỉ có thể duyệt/từ chối yêu cầu đang PENDING.', 409, 'REQUEST_NOT_PENDING');
    }
    let budgetFields = { budget_year: request.budget_year ?? null, estimated_salary_cost: request.estimated_salary_cost ?? null };
    let exceededHeadcount = 0;
    let exceededSalary = 0n;
    if (status === 'APPROVED') {
      budgetFields = calculateRequestBudget(request, true);
      // Lock the department/year budget before reading APPROVED commitments.
      // READ COMMITTED ensures a waiter sees the previous approver's commit.
      const availability = await budgetService.getAvailability(request.department_id, budgetFields.budget_year, connection, true);
      exceededHeadcount = Math.max(0, availability.used_headcount + Number(request.headcount) - availability.total_headcount);
      const salaryDifference = moneyToCents(availability.used_salary_budget) + moneyToCents(budgetFields.estimated_salary_cost) - moneyToCents(availability.total_salary_budget);
      exceededSalary = salaryDifference > 0n ? salaryDifference : 0n;
      if ((exceededHeadcount > 0 || exceededSalary > 0n) && !override) {
        throw businessError('Yêu cầu vượt chỉ tiêu. HR_MANAGER phải xác nhận override và nhập lý do.', 409, 'BUDGET_EXCEEDED', {
          ...availability, exceeded_headcount: exceededHeadcount, exceeded_salary_budget: formatMoney(exceededSalary)
        });
      }
    }
    const changed = await requestRepo.updateStatus(id, {
      status,
      decided_by: user.user_id, ...budgetFields
    }, connection);
    if (changed !== 1) throw businessError('Yêu cầu không còn PENDING.', 409, 'REQUEST_NOT_PENDING');
    await approvalRepo.create({
      requisition_id: id, user_id: user.user_id, status,
      comments: status === 'REJECTED' ? rejectionReason : (override ? overrideReason : null),
      is_override: override, override_reason: override ? overrideReason : null,
      exceeded_headcount: exceededHeadcount, exceeded_salary_budget: formatMoney(exceededSalary)
    }, connection);
    await auditRepo.createLog({
      userId: request.created_by, performedBy: user.user_id, action: `RECRUITMENT_REQUEST_${status}`,
      entityType: 'job_requisitions', entityId: String(id),
      description: JSON.stringify({ status, is_override: override, override_reason: override ? overrideReason : null,
        rejection_reason: status === 'REJECTED' ? rejectionReason : null,
        exceeded_headcount: exceededHeadcount, exceeded_salary_budget: formatMoney(exceededSalary) }), ipAddress
    }, connection);
    const result = await requestRepo.findById(id, connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getAllForApproval,
  updateRequestStatus
};
