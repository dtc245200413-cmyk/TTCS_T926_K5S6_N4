const candidateRepo = require('../repositories/candidateRepository');
const candidateRatingRepo = require('../repositories/candidateRatingRepository');
const candidateProfileRepo = require('../repositories/candidateProfileRepository');
const candidateMergeRepo = require('../repositories/candidateMergeRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');
const { withCandidateTransaction } = require('../utils/candidateTransaction');

async function createCandidate(data, userId, ipAddress, allowDuplicate = false) {
  const { full_name, email, phone, source_code, recruitment_request_id, cv_file_path, resume_url, cover_letter, tags, parsed_skills } = data;

  if (!full_name || !email) {
    const error = new Error('Tên và email là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  const possibleDuplicates = await candidateMergeRepo.findPotentialDuplicates({ email, phone });
  if (possibleDuplicates.length > 0 && !allowDuplicate) {
    const error = new Error('Tìm thấy hồ sơ có email hoặc số điện thoại trùng. Hãy so sánh trước khi lưu.');
    error.statusCode = 409;
    error.duplicates = possibleDuplicates;
    throw error;
  }

  const insertId = await candidateRepo.create({
    full_name,
    email,
    phone,
    status: 'NEW',
    current_stage: 'NEW',
    source_code,
    recruitment_request_id,
    cv_file_path: cv_file_path || resume_url,
    resume_url: resume_url || cv_file_path,
    cover_letter,
    tags,
    parsed_skills,
    created_by: userId
  });

  // Reference Locking logic for Candidate Source
  if (source_code) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'CANDIDATE_SOURCE' AND code = ?", [source_code]);
  }

  // Add initial activity
  await candidateRepo.addActivity(insertId, userId, 'APPLIED', `Hồ sơ ứng viên được tạo trên hệ thống bởi nhân viên.`);

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
  const newCandidate = await candidateRepo.findById(insertId);
  return { ...newCandidate, possible_duplicates: possibleDuplicates };
}

async function findPotentialDuplicates(filters) {
  return candidateMergeRepo.findPotentialDuplicates(filters);
}

async function mergeCandidates(primaryId, secondaryId, chosenFields, userId, ipAddress) {
  const mergeId = await candidateMergeRepo.mergeCandidates({
    primaryId: Number(primaryId),
    secondaryId: Number(secondaryId),
    chosenFields,
    mergedBy: userId
  });
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATES_MERGED',
    entityType: 'candidate_merges',
    entityId: String(mergeId),
    description: `Gộp hồ sơ ứng viên #${secondaryId} vào hồ sơ #${primaryId}`,
    ipAddress
  });
  return { merge_id: mergeId, primary_id: Number(primaryId), secondary_id: Number(secondaryId) };
}

async function getActiveMerges() {
  return candidateMergeRepo.findActiveMerges();
}

async function undoCandidateMerge(mergeId, userId, ipAddress) {
  const result = await candidateMergeRepo.undoMerge(Number(mergeId), userId);
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_MERGE_UNDONE',
    entityType: 'candidate_merges',
    entityId: String(mergeId),
    description: `Hoàn tác gộp hồ sơ #${result.secondary_id} khỏi hồ sơ #${result.primary_id}`,
    ipAddress
  });
  return result;
}

async function getAllCandidates(user, filters = {}) {
  return await candidateRepo.getAll(user, filters);
}

async function getUnifiedProfile(candidateId, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check per Jira criteria:
  // "Chỉ recruiter phụ trách và hiring manager của vị trí đó mở được"
  const hasAccess = await candidateRepo.checkCandidateAccess(candidate, currentUser);
  if (!hasAccess) {
    const error = new Error('Bạn không có quyền truy cập hồ sơ này. Chỉ Recruiter phụ trách và Hiring Manager của vị trí mới có quyền xem.');
    error.statusCode = 403;
    throw error;
  }

  // Get application history (all previous & current applications for this candidate)
  const applications = await candidateRepo.getApplicationHistory(candidate.email, candidate.phone);

  // Get notes
  const notes = await candidateRepo.getNotes(candidateId);

  // Get activities
  const activities = await candidateRepo.getActivities(candidateId);

  // Get stages
  const stages = await candidateRepo.getPipelineStages();

  const roles = currentUser.roles ? currentUser.roles.map(r => r.role_code) : [];
  const canManage = roles.includes('ADMIN') || 
                    roles.includes('HR_MANAGER') || 
                    roles.includes('RECRUITER') ||
                    (roles.includes('HIRING_MANAGER') && (candidate.hiring_manager_id === currentUser.user_id || candidate.department_id === currentUser.department_id));

  return {
    candidate,
    applications,
    notes,
    activities,
    stages,
    userPermissions: {
      canManage,
      canAddNote: true,
      canChangeStage: canManage,
      canRate: true,
      canEditTags: canManage
    }
  };
}

async function addCandidateNote(candidateId, noteContent, currentUser, ipAddress) {
  if (!noteContent || !noteContent.trim()) {
    const error = new Error('Nội dung ghi chú không được để trống.');
    error.statusCode = 400;
    throw error;
  }

  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await candidateRepo.checkCandidateAccess(candidate, currentUser);
  if (!hasAccess) {
    const error = new Error('Bạn không có quyền thêm ghi chú cho ứng viên này.');
    error.statusCode = 403;
    throw error;
  }

  const noteId = await candidateRepo.addNote(candidateId, currentUser.user_id, noteContent.trim());
  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'NOTE_ADDED', `Thêm ghi chú đánh giá mới: "${noteContent.trim().substring(0, 60)}${noteContent.trim().length > 60 ? '...' : ''}"`);

  await auditRepo.createLog({
    userId: currentUser.user_id,
    performedBy: currentUser.user_id,
    action: 'CANDIDATE_NOTE_ADDED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Added note for candidate ${candidate.full_name}`,
    ipAddress
  });

  return await candidateRepo.getNotes(candidateId);
}

async function updateCandidateStage(candidateId, stageCode, note, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const hasAccess = await candidateRepo.checkCandidateAccess(candidate, currentUser);
  if (!hasAccess) {
    const error = new Error('Bạn không có quyền cập nhật trạng thái ứng viên này.');
    error.statusCode = 403;
    throw error;
  }

  const oldStage = candidate.current_stage || 'NEW';
  await candidateRepo.updateStage(candidateId, stageCode);

  let details = `Chuyển giai đoạn từ [${oldStage}] sang [${stageCode}]`;
  if (note) details += `. Ghi chú: ${note}`;

  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'STAGE_CHANGED', details);

  if (note && note.trim()) {
    await candidateRepo.addNote(candidateId, currentUser.user_id, `[Chuyển sang ${stageCode}] ${note.trim()}`);
  }

  await auditRepo.createLog({
    userId: currentUser.user_id,
    performedBy: currentUser.user_id,
    action: 'CANDIDATE_STAGE_UPDATED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Changed stage of candidate ${candidate.full_name} to ${stageCode}`,
    ipAddress
  });

  return await candidateRepo.findById(candidateId);
}

async function updateCandidateRating(candidateId, rating, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const numRating = parseInt(rating);
  if (isNaN(numRating) || numRating < 0 || numRating > 5) {
    const error = new Error('Đánh giá phải từ 1 đến 5 sao.');
    error.statusCode = 400;
    throw error;
  }

  await candidateRepo.updateRating(candidateId, numRating);
  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'RATED', `Đánh giá mức độ tiềm năng: ${numRating} / 5 sao`);

  return await candidateRepo.findById(candidateId);
}

async function updateCandidateTags(candidateId, tags, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || '');
  await candidateRepo.updateTags(candidateId, tagsString);
  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'TAGS_UPDATED', `Cập nhật nhãn phân loại: ${tagsString || 'Không có nhãn'}`);

  return await candidateRepo.findById(candidateId);
}

async function toggleCandidateTalentPool(candidateId, isTalentPool, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  await candidateRepo.updateTalentPool(candidateId, isTalentPool);
  const actionText = isTalentPool ? 'Đã thêm vào Kho ứng viên tiềm năng (Talent Pool)' : 'Đã đưa ra khỏi Kho ứng viên tiềm năng';
  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'TALENT_POOL_UPDATED', actionText);

  return await candidateRepo.findById(candidateId);
}

async function updateCandidateCv(candidateId, cvFilePath, currentUser, ipAddress) {
  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  await candidateRepo.updateCvFilePath(candidateId, cvFilePath);
  await candidateRepo.addActivity(candidateId, currentUser.user_id, 'CV_UPDATED', `Tải lên phiên bản CV mới cho ứng viên.`);

  return await candidateRepo.findById(candidateId);
}

async function getCandidateResume(id) {
  const candidate = await candidateRepo.findById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }
  if (!candidate.resume_url) {
    const error = new Error('Hồ sơ này chưa có CV đính kèm.');
    error.statusCode = 404;
    throw error;
  }
  return candidate.resume_url;
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

  await candidateRepo.addActivity(id, userId, 'STATUS_UPDATED', `Cập nhật trạng thái hồ sơ thành ${status}${rejectionReasonCode ? ` (Lý do: ${rejectionReasonCode})` : ''}`);

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
  if (user.roles?.some(role => role.role_code === 'CANDIDATE')
      || !user.roles?.some(role => allowedRoles.includes(role.role_code))) {
    throw ratingError('Bạn không có quyền truy cập đánh giá ứng viên.', 403);
  }
}

function parseCandidateId(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) {
    throw ratingError('ID ứng viên không hợp lệ.', 400);
  }
  return Number(id);
}

async function requireRatingCandidate(candidateId, connection) {
  const candidate = await candidateRatingRepo.findCandidateById(candidateId, connection);
  if (!candidate) {
    throw ratingError('Không tìm thấy ứng viên.', 404);
  }
  if (candidate.merged_into_id) {
    throw ratingError('Hồ sơ đã được gộp. Vui lòng mở hồ sơ chính để xem hoặc đánh giá.', 409);
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

  return withCandidateTransaction(async connection => {
    const candidate = await requireRatingCandidate(candidateId, connection);
    if (candidate.status === 'REJECTED') {
      throw ratingError('Không thể đánh giá hồ sơ đã bị đánh trượt.', 409);
    }
    await candidateRatingRepo.upsertRating(candidateId, user.user_id, data.rating, comment, connection);
    const myRating = await candidateRatingRepo.getRatingByReviewer(candidateId, user.user_id, connection);
    const summary = await candidateRatingRepo.getSummary(candidateId, connection);
    return { ...summary, my_rating: myRating };
  });
}

async function getCandidateRatings(id, user) {
  requireRatingRole(user, ratingReaderRoles);
  const candidateId = parseCandidateId(id);
  const candidate = await requireRatingCandidate(candidateId);
  // Match SCRUM-337: staff readers have full scope; Hiring Manager is department-scoped.
  if (!user.roles.some(role => ratingWriterRoles.includes(role.role_code))) {
    const departmentId = candidate.recruitment_request_id && user.department_id
      ? await candidateProfileRepo.findRequestDepartment(candidate.recruitment_request_id)
      : null;
    if (!departmentId || String(departmentId) !== String(user.department_id)) {
      throw ratingError('Hồ sơ không thuộc phạm vi phòng ban được phép.', 403);
    }
  }
  const [ratings, myRating, summary] = await Promise.all([
    candidateRatingRepo.getRatingsByCandidate(candidateId),
    candidateRatingRepo.getRatingByReviewer(candidateId, user.user_id),
    candidateRatingRepo.getSummary(candidateId)
  ]);
  return { ...summary, my_rating: myRating, ratings };
}

module.exports = {
  createCandidate,
  findPotentialDuplicates,
  mergeCandidates,
  getActiveMerges,
  undoCandidateMerge,
  getAllCandidates,
  getUnifiedProfile,
  addCandidateNote,
  updateCandidateStage,
  updateCandidateRating,
  updateCandidateTags,
  toggleCandidateTalentPool,
  updateCandidateCv,
  getCandidateResume,
  updateCandidateStatus,
  saveMyRating,
  getCandidateRatings
};
