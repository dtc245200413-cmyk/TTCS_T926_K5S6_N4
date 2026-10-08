const candidateRepo = require('../repositories/candidateRepository');
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

async function getAllCandidates() {
  return await candidateRepo.getAll();
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

module.exports = {
  createCandidate,
  getAllCandidates,
  updateCandidateStatus
};
