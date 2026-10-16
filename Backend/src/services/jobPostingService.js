const repository = require('../repositories/jobPostingRepository');
const auditRepository = require('../repositories/auditRepository');
const candidateService = require('./candidateService');
const candidateMergeRepository = require('../repositories/candidateMergeRepository');
const candidatePortalRepository = require('../repositories/candidatePortalRepository');
const { pool } = require('../config/database');
const { httpError } = require('../utils/roles');

function ensureDateIsValid(value) {
  if (!value) return;
  const dateValue = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date < new Date(new Date().setHours(0, 0, 0, 0))) {
    throw httpError('Hạn tuyển dụng phải là ngày hiện tại hoặc trong tương lai.', 400);
  }
}

async function getEligibleRequests() {
  return repository.findEligibleRequests();
}

async function getAll(status) {
  return repository.findAll(status);
}

async function create(data, userId, ipAddress) {
  const requestId = Number(data.recruitment_request_id);
  if (!requestId) throw httpError('Vui lòng chọn yêu cầu tuyển dụng đã được duyệt.', 400);
  const request = await repository.findApprovedRequest(requestId);
  if (!request) throw httpError('Chỉ có thể tạo tin từ yêu cầu tuyển dụng đã được duyệt.', 400);
  if (await repository.hasActivePostingForRequest(requestId)) {
    throw httpError('Yêu cầu này đã có tin đang chờ duyệt, đã duyệt hoặc đang tuyển.', 409);
  }

  const deadlineValue = data.deadline || request.needed_by_date;
  const deadline = deadlineValue instanceof Date
    ? deadlineValue.toISOString().slice(0, 10)
    : deadlineValue;
  ensureDateIsValid(deadline);
  const salary = data.salary_display || (
    request.proposed_salary_min || request.proposed_salary_max
      ? `${Number(request.proposed_salary_min || 0).toLocaleString('vi-VN')} - ${Number(request.proposed_salary_max || 0).toLocaleString('vi-VN')} VNĐ/tháng`
      : 'Thỏa thuận'
  );
  const postingId = await repository.create({
    recruitment_request_id: requestId,
    title: (data.title || request.position_name || '').trim(),
    description: data.description || request.job_description || '',
    requirements: data.requirements || request.candidate_requirements || '',
    benefits: data.benefits || '',
    work_location: data.work_location || request.location_name || request.work_location_code || '',
    job_type: data.job_type || request.work_type_name || request.work_type_code || '',
    salary_display: salary,
    deadline,
    created_by: userId
  });
  const posting = await repository.findById(postingId);
  await auditRepository.createLog({
    userId,
    performedBy: userId,
    action: 'JOB_POSTING_CREATED',
    entityType: 'job_postings',
    entityId: String(postingId),
    description: `Tạo bản nháp tin tuyển dụng: ${posting.title}`,
    ipAddress
  });
  return posting;
}

async function getPreview(id) {
  const posting = await repository.findById(id);
  if (!posting) throw httpError('Không tìm thấy tin tuyển dụng.', 404);
  return posting;
}

async function submit(id, userId, ipAddress) {
  const posting = await repository.findById(id);
  if (!posting) throw httpError('Không tìm thấy tin tuyển dụng.', 404);
  if (!['DRAFT', 'REJECTED'].includes(posting.status)) {
    throw httpError('Chỉ có thể gửi duyệt bản nháp hoặc tin bị từ chối.', 400);
  }
  ensureDateIsValid(posting.deadline);
  if (!posting.title?.trim() || !posting.description?.trim()) {
    throw httpError('Tin cần có tiêu đề và mô tả trước khi gửi duyệt.', 400);
  }
  await repository.submit(id, userId);
  await auditRepository.createLog({
    userId,
    performedBy: userId,
    action: 'JOB_POSTING_SUBMITTED',
    entityType: 'job_postings',
    entityId: String(id),
    description: `Gửi duyệt tin tuyển dụng: ${posting.title}`,
    ipAddress
  });
  return repository.findById(id);
}

async function updateDraft(id, data, userId, ipAddress) {
  const posting = await repository.findById(id);
  if (!posting) throw httpError('Không tìm thấy tin tuyển dụng.', 404);
  if (!['DRAFT', 'REJECTED'].includes(posting.status)) {
    throw httpError('Chỉ có thể chỉnh sửa bản nháp hoặc tin bị từ chối.', 400);
  }
  const deadlineValue = data.deadline || posting.deadline;
  ensureDateIsValid(deadlineValue);
  const title = String(data.title ?? posting.title).trim();
  const description = String(data.description ?? posting.description).trim();
  if (!title || !description) throw httpError('Tin cần có tiêu đề và mô tả.', 400);
  const deadline = deadlineValue instanceof Date ? deadlineValue.toISOString().slice(0, 10) : deadlineValue;
  await repository.updateDraft(id, {
    title,
    description,
    requirements: data.requirements ?? posting.requirements,
    benefits: data.benefits ?? posting.benefits,
    deadline
  });
  await auditRepository.createLog({
    userId,
    performedBy: userId,
    action: 'JOB_POSTING_UPDATED',
    entityType: 'job_postings',
    entityId: String(id),
    description: `Cập nhật nội dung tin tuyển dụng: ${title}`,
    ipAddress
  });
  return repository.findById(id);
}

async function review(id, approved, note, userId, ipAddress) {
  const posting = await repository.findById(id);
  if (!posting) throw httpError('Không tìm thấy tin tuyển dụng.', 404);
  if (posting.status !== 'PENDING_REVIEW') throw httpError('Tin này không ở trạng thái chờ duyệt.', 400);
  if (!approved && !note?.trim()) throw httpError('Vui lòng nhập lý do từ chối tin.', 400);
  await repository.review(id, {
    status: approved ? 'APPROVED' : 'REJECTED',
    note: note?.trim() || null,
    userId
  });
  await auditRepository.createLog({
    userId,
    performedBy: userId,
    action: approved ? 'JOB_POSTING_APPROVED' : 'JOB_POSTING_REJECTED',
    entityType: 'job_postings',
    entityId: String(id),
    description: `${approved ? 'Duyệt' : 'Từ chối'} tin tuyển dụng: ${posting.title}${note ? ` - ${note}` : ''}`,
    ipAddress
  });
  return repository.findById(id);
}

async function publish(id, userId, ipAddress) {
  const posting = await repository.findById(id);
  if (!posting) throw httpError('Không tìm thấy tin tuyển dụng.', 404);
  if (!['APPROVED', 'PENDING_REVIEW'].includes(posting.status)) {
    throw httpError('Tin phải được duyệt hoặc đang chờ duyệt trước khi xuất bản.', 400);
  }
  ensureDateIsValid(posting.deadline);
  if (posting.status === 'PENDING_REVIEW') {
    await repository.review(id, {
      status: 'APPROVED',
      note: null,
      userId
    });
  }
  await repository.publish(id, userId);
  await auditRepository.createLog({
    userId,
    performedBy: userId,
    action: 'JOB_POSTING_PUBLISHED',
    entityType: 'job_postings',
    entityId: String(id),
    description: `Xuất bản tin tuyển dụng: ${posting.title}`,
    ipAddress
  });
  return repository.findById(id);
}

async function getPublicJobs(filters) {
  return repository.findPublic(filters);
}

async function getPublicJob(id) {
  const posting = await repository.findPublicById(id);
  if (!posting) throw httpError('Tin tuyển dụng không tồn tại hoặc đã hết hạn.', 404);
  return posting;
}

async function applyToPublicJob(id, data, resumeUrl, ipAddress) {
  const posting = await getPublicJob(id);
  const fullName = String(data.full_name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').trim();
  if (!fullName || !email) throw httpError('Vui lòng nhập họ tên và email.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError('Email không hợp lệ.', 400);
  if (!resumeUrl) throw httpError('Vui lòng đính kèm CV (PDF hoặc Word, tối đa 10 MB).', 400);

  const matches = await candidateMergeRepository.findPotentialDuplicates({ email });
  const existing = matches.find(candidate => String(candidate.email).trim().toLowerCase() === email);
  if (matches.length > 0 && !existing) {
    throw httpError('Email hoặc số điện thoại đã có trong hệ thống. Vui lòng liên hệ bộ phận tuyển dụng.', 409);
  }
  const candidate = existing || await candidateService.createCandidate({
    full_name: fullName,
    email,
    phone,
    source_code: 'CAREER_SITE',
    recruitment_request_id: posting.recruitment_request_id,
    resume_url: resumeUrl
  }, null, ipAddress);

  const { applicationId, applicationCode } = await candidatePortalRepository.applyToPosting({
    candidateId: candidate.id,
    posting,
    resumeUrl,
    coverLetter: String(data.cover_letter || '').trim(),
    candidateProfile: { full_name: fullName, phone }
  });

  return {
    application_received: true,
    application_id: applicationId,
    application_code: applicationCode,
    job_title: posting.title,
    full_name: fullName,
    email,
    applied_at: new Date()
  };
}

function formatTrackingResult({ application_code, job_title, department_name, applied_at, updated_at, status }) {
  const statusMap = {
    'NEW': {
      status_code: 'NEW',
      status_title: 'Đã tiếp nhận hồ sơ',
      status_badge_color: '#2563eb',
      step_index: 1,
      status_description: 'Hồ sơ của bạn đã được ghi nhận trên hệ thống tuyển dụng. Bộ phận nhân sự sẽ sàng lọc trong thời gian sớm nhất.'
    },
    'SUBMITTED': {
      status_code: 'NEW',
      status_title: 'Đã tiếp nhận hồ sơ',
      status_badge_color: '#2563eb',
      step_index: 1,
      status_description: 'Hồ sơ của bạn đã được ghi nhận trên hệ thống tuyển dụng. Bộ phận nhân sự sẽ sàng lọc trong thời gian sớm nhất.'
    },
    'SCREENING': {
      status_code: 'SCREENING',
      status_title: 'Đang sàng lọc hồ sơ',
      status_badge_color: '#d97706',
      step_index: 2,
      status_description: 'Hồ sơ đang được bộ phận chuyên môn và nhân sự thẩm định mức độ phù hợp với tiêu chuẩn vị trí.'
    },
    'INTERVIEWING': {
      status_code: 'INTERVIEWING',
      status_title: 'Vòng phỏng vấn',
      status_badge_color: '#7c3aed',
      step_index: 3,
      status_description: 'Hồ sơ đã vượt qua vòng sơ loại. Nhà tuyển dụng đang hoặc đã sắp xếp lịch phỏng vấn trao đổi chi tiết với bạn.'
    },
    'OFFERED': {
      status_code: 'OFFERED',
      status_title: 'Đề xuất nhận việc (Offer)',
      status_badge_color: '#4f46e5',
      step_index: 4,
      status_description: 'Chúc mừng bạn! Bạn đã hoàn thành tốt các vòng đánh giá. Đề xuất mời nhận việc đang được chuẩn bị và chuyển tới bạn.'
    },
    'HIRED': {
      status_code: 'HIRED',
      status_title: 'Đã tiếp nhận làm việc',
      status_badge_color: '#16a34a',
      step_index: 5,
      status_description: 'Chúc mừng bạn đã chính thức được tuyển dụng! Đội ngũ nhân sự sẽ hướng dẫn các bước tiếp theo khi nhận việc.'
    },
    'REJECTED': {
      status_code: 'REJECTED',
      status_title: 'Chưa phù hợp đợt tuyển dụng này',
      status_badge_color: '#dc2626',
      step_index: -1,
      status_description: 'Cảm ơn bạn đã quan tâm ứng tuyển. Rất tiếc hiện tại hồ sơ của bạn chưa phù hợp với yêu cầu đợt này. Dữ liệu của bạn được lưu trong hệ thống để ưu tiên xem xét cho các vị trí phù hợp trong tương lai.'
    }
  };

  const statusInfo = statusMap[status] || {
    status_code: status || 'NEW',
    status_title: 'Đang xử lý hồ sơ',
    status_badge_color: '#475569',
    step_index: 2,
    status_description: 'Hồ sơ đang trong quy trình tuyển dụng và đánh giá của công ty.'
  };

  return {
    application_code,
    job_title,
    department_name,
    applied_at,
    updated_at,
    ...statusInfo,
    stages: [
      { step: 1, code: 'NEW', name: 'Tiếp nhận hồ sơ' },
      { step: 2, code: 'SCREENING', name: 'Sàng lọc hồ sơ' },
      { step: 3, code: 'INTERVIEWING', name: 'Phỏng vấn' },
      { step: 4, code: 'OFFERED', name: 'Đề xuất offer' },
      { step: 5, code: 'HIRED', name: 'Nhận việc' }
    ]
  };
}

async function trackApplication(applicationCode, email) {
  const code = String(applicationCode || '').trim();
  const emailNorm = String(email || '').trim().toLowerCase();

  if (!code || !emailNorm) {
    throw httpError('Vui lòng nhập cả mã hồ sơ và email để tra cứu.', 400);
  }

  const [rows] = await pool.execute(`
    SELECT ca.id AS application_id, ca.application_code, ca.status AS app_status, ca.applied_at, ca.updated_at,
           c.id AS candidate_id, c.full_name, c.email, c.status AS candidate_status,
           jp.id AS job_id, jp.title AS job_title,
           d.department_name, pos.position_name,
           loc.name AS location_name
    FROM candidate_applications ca
    JOIN candidates c ON c.id = ca.candidate_id
    LEFT JOIN job_postings jp ON jp.id = ca.job_posting_id
    LEFT JOIN recruitment_requests rr ON rr.id = ca.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    WHERE (UPPER(ca.application_code) = UPPER(?) OR UPPER(c.application_code) = UPPER(?))
      AND LOWER(TRIM(c.email)) = ?
    ORDER BY ca.id DESC
    LIMIT 1
  `, [code, code, emailNorm]);

  if (rows.length === 0) {
    const [candRows] = await pool.execute(`
      SELECT c.id AS candidate_id, c.application_code, c.full_name, c.email, c.status AS candidate_status, c.created_at AS applied_at, c.updated_at,
             d.department_name, pos.position_name
      FROM candidates c
      LEFT JOIN recruitment_requests rr ON rr.id = c.recruitment_request_id
      LEFT JOIN departments d ON d.department_id = rr.department_id
      LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
      WHERE UPPER(c.application_code) = UPPER(?) AND LOWER(TRIM(c.email)) = ?
      LIMIT 1
    `, [code, emailNorm]);

    if (candRows.length === 0) {
      throw httpError('Thông tin mã hồ sơ hoặc email không chính xác. Vui lòng kiểm tra lại.', 404);
    }

    const cand = candRows[0];
    return formatTrackingResult({
      application_code: cand.application_code || code,
      job_title: cand.position_name || 'Vị trí đã ứng tuyển',
      department_name: cand.department_name || 'Bộ phận chuyên môn',
      applied_at: cand.applied_at,
      updated_at: cand.updated_at,
      status: cand.candidate_status
    });
  }

  const app = rows[0];
  const effectiveStatus = app.candidate_status || app.app_status;
  return formatTrackingResult({
    application_code: app.application_code || code,
    job_title: app.job_title || app.position_name || 'Vị trí đã ứng tuyển',
    department_name: app.department_name || 'Bộ phận chuyên môn',
    applied_at: app.applied_at,
    updated_at: app.updated_at,
    status: effectiveStatus
  });
}

module.exports = {
  getEligibleRequests,
  getAll,
  create,
  updateDraft,
  getPreview,
  submit,
  review,
  publish,
  getPublicJobs,
  getPublicJob,
  applyToPublicJob,
  trackApplication
};