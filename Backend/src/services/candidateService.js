const candidateRepo = require('../repositories/candidateRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');

async function createCandidate(data, userId, ipAddress) {
  const { full_name, email, phone, source_code, recruitment_request_id, cv_file_path, cover_letter, tags, parsed_skills } = data;

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
    current_stage: 'NEW',
    source_code,
    recruitment_request_id,
    cv_file_path,
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

  return await candidateRepo.findById(insertId);
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

module.exports = {
  createCandidate,
  getAllCandidates,
  getUnifiedProfile,
  addCandidateNote,
  updateCandidateStage,
  updateCandidateRating,
  updateCandidateTags,
  toggleCandidateTalentPool,
  updateCandidateCv,
  updateCandidateStatus
};
