const candidateRepo = require('../repositories/candidateRepository');
const candidateRatingRepo = require('../repositories/candidateRatingRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');

async function createCandidate(data, userId, ipAddress) {
  const { full_name, email, phone, source_code, recruitment_request_id } = data;

  if (!full_name || !email) {
    const error = new Error('Tên và email là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await candidateRepo.create({
    full_name,
    email,
    phone,
    status: 'NEW',
    source_code,
    recruitment_request_id,
    created_by: userId
  });

  // Reference Locking logic for Candidate Source
  if (source_code) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'CANDIDATE_SOURCE' AND code = ?", [source_code]);
  }

  const newCandidate = await candidateRepo.findById(insertId);

  // Audit
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_CREATED',
    entityType: 'candidates',
    entityId: String(insertId),
    description: `Created candidate ${full_name}`,
    ipAddress
  });

  return newCandidate;
}

async function getAllCandidates(user) {
  return await candidateRepo.getAll(user);
}

async function updateCandidateStatus(id, status, rejectionReasonCode, userId, ipAddress) {
  const candidate = await candidateRepo.findById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  if (status === 'REJECTED' && !rejectionReasonCode) {
    const error = new Error('Bắt buộc phải chọn lý do loại hồ sơ.');
    error.statusCode = 400;
    throw error;
  }

  await candidateRepo.updateStatus(id, status, rejectionReasonCode);

  // Reference Locking logic for Rejection Reason
  if (status === 'REJECTED' && rejectionReasonCode) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'REJECTION_REASON' AND code = ?", [rejectionReasonCode]);
  }

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_STATUS_UPDATED',
    entityType: 'candidates',
    entityId: String(id),
    description: `Updated candidate status to ${status}`,
    ipAddress
  });

  return await candidateRepo.findById(id);
}

const ratingWriterRoles = ['RECRUITER', 'HR_MANAGER', 'ADMIN'];
const ratingReaderRoles = [...ratingWriterRoles, 'HIRING_MANAGER'];

function ratingError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireRatingRole(user, allowedRoles) {
  if (!user || !user.user_id) {
    throw ratingError('Bạn chưa đăng nhập.', 401);
  }
  if (!user.roles?.some(role => allowedRoles.includes(role.role_code))) {
    throw ratingError('Bạn không có quyền truy cập đánh giá ứng viên.', 403);
  }
}

function parseCandidateId(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    throw ratingError('ID ứng viên không hợp lệ.', 400);
  }
  return Number(id);
}

async function requireRatingCandidate(candidateId) {
  const candidate = await candidateRatingRepo.findCandidateById(candidateId);
  if (!candidate) {
    throw ratingError('Không tìm thấy ứng viên.', 404);
  }
  return candidate;
}

async function saveMyRating(id, data, user) {
  requireRatingRole(user, ratingWriterRoles);
  const candidateId = parseCandidateId(id);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw ratingError('Dữ liệu đánh giá không hợp lệ.', 400);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'reviewer_id')) {
    throw ratingError('Không được gửi reviewer_id. Người đánh giá được xác định từ phiên đăng nhập.', 400);
  }
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    throw ratingError('Điểm đánh giá phải là số nguyên từ 1 đến 5.', 400);
  }
  if (data.comment != null && typeof data.comment !== 'string') {
    throw ratingError('Nhận xét phải là chuỗi.', 400);
  }
  const comment = data.comment?.trim() || null;
  if (comment && Array.from(comment).length > 2000) {
    throw ratingError('Nhận xét không được vượt quá 2000 ký tự.', 400);
  }

  const candidate = await requireRatingCandidate(candidateId);
  if (candidate.status === 'REJECTED') {
    throw ratingError('Không thể đánh giá hồ sơ đã bị đánh trượt.', 409);
  }
  await candidateRatingRepo.upsertRating(candidateId, user.user_id, data.rating, comment);
  const [myRating, summary] = await Promise.all([
    candidateRatingRepo.getRatingByReviewer(candidateId, user.user_id),
    candidateRatingRepo.getSummary(candidateId)
  ]);
  return { ...summary, my_rating: myRating };
}

async function getCandidateRatings(id, user) {
  requireRatingRole(user, ratingReaderRoles);
  const candidateId = parseCandidateId(id);
  await requireRatingCandidate(candidateId);
  const [ratings, myRating, summary] = await Promise.all([
    candidateRatingRepo.getRatingsByCandidate(candidateId),
    candidateRatingRepo.getRatingByReviewer(candidateId, user.user_id),
    candidateRatingRepo.getSummary(candidateId)
  ]);
  return { ...summary, my_rating: myRating, ratings };
}

module.exports = {
  createCandidate,
  getAllCandidates,
  updateCandidateStatus,
  saveMyRating,
  getCandidateRatings
};
