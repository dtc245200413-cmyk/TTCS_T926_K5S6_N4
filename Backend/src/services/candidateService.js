const candidateRepo = require('../repositories/candidateRepository');
const candidateMergeRepo = require('../repositories/candidateMergeRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');

async function createCandidate(data, userId, ipAddress, allowDuplicate = false) {
  const { full_name, email, phone, source_code, recruitment_request_id, resume_url } = data;

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
    source_code,
    recruitment_request_id,
    created_by: userId,
    resume_url
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

async function getAllCandidates(user) {
  return await candidateRepo.getAll(user);
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

async function updateCandidateStatus(id, status, rejectionReasonCode, rejectionNote, userId, ipAddress) {
  const candidate = await candidateRepo.findById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const validStatuses = ['NEW', 'SCREENING', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    const error = new Error(`Trạng thái "${status}" không hợp lệ. Các giai đoạn hợp lệ: ${validStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  if (status === 'REJECTED' && !rejectionReasonCode) {
    const error = new Error('Bắt buộc phải chọn lý do loại hồ sơ.');
    error.statusCode = 400;
    throw error;
  }

  await candidateRepo.updateStatus(id, status, rejectionReasonCode, rejectionNote, userId, candidate.status);

  // Reference Locking logic for Rejection Reason
  if (status === 'REJECTED' && rejectionReasonCode) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'REJECTION_REASON' AND code = ?", [rejectionReasonCode]);
  }

  const stageNames = {
    NEW: 'Hồ sơ mới',
    SCREENING: 'Sàng lọc',
    INTERVIEWING: 'Phỏng vấn',
    OFFERED: 'Đề xuất offer',
    HIRED: 'Nhận việc',
    REJECTED: 'Loại'
  };

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_STAGE_CHANGED',
    entityType: 'candidates',
    entityId: String(id),
    description: `Chuyển ứng viên "${candidate.full_name}" từ giai đoạn [${stageNames[candidate.status] || candidate.status}] sang [${stageNames[status] || status}]${rejectionReasonCode ? ` (Lý do: ${rejectionReasonCode})` : ''}`,
    ipAddress
  });

  return await candidateRepo.findById(id);
}

async function getCandidateHistory(id) {
  return await candidateRepo.getStageHistory(id);
}

module.exports = {
  createCandidate,
  findPotentialDuplicates,
  mergeCandidates,
  getActiveMerges,
  undoCandidateMerge,
  getAllCandidates,
  getCandidateResume,
  updateCandidateStatus,
  getCandidateHistory
};
