const repository = require('../repositories/jobPostingRepository');
const auditRepository = require('../repositories/auditRepository');
const candidateService = require('./candidateService');
const candidateMergeRepository = require('../repositories/candidateMergeRepository');
const candidatePortalRepository = require('../repositories/candidatePortalRepository');
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
  if (!resumeUrl) throw httpError('Vui lòng đính kèm CV.', 400);

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
  const applicationId = await candidatePortalRepository.applyToPosting({
    candidateId: candidate.id,
    posting,
    resumeUrl,
    coverLetter: String(data.cover_letter || '').trim(),
    candidateProfile: { full_name: fullName, phone }
  });
  return { application_received: true, application_id: applicationId, job_title: posting.title };
}

module.exports = { getEligibleRequests, getAll, create, updateDraft, getPreview, submit, review, publish, getPublicJobs, getPublicJob, applyToPublicJob };