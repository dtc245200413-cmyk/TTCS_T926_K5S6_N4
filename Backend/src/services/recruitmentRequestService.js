/**
 * recruitmentRequestService.js
 */

const requestRepo = require('../repositories/recruitmentRequestRepository');
const jobPositionRepo = require('../repositories/jobPositionRepository');
const auditRepo = require('../repositories/auditRepository');

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

  const newRequest = await requestRepo.findById(insertId);

  // Audit
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'RECRUITMENT_REQUEST_CREATED',
    entityType: 'recruitment_requests',
    entityId: String(insertId),
    description: `Created recruitment request for position ${position ? position.position_name : 'N/A'}`,
    ipAddress
  });

  return newRequest;
}

async function getMyRequests(userId) {
  return await requestRepo.getAll(userId);
}

async function getAllForApproval() {
  return await requestRepo.getAllForApproval();
}

async function updateRequestStatus(id, status, rejectionReason, userId, ipAddress) {
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
  
  await requestRepo.updateStatus(id, status, rejectionReason);

  // Audit
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

module.exports = {
  createRequest,
  getMyRequests,
  getAllForApproval,
  updateRequestStatus
};
