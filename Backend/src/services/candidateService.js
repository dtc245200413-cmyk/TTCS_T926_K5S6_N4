const candidateRepo = require('../repositories/candidateRepository');
const candidateMergeRepo = require('../repositories/candidateMergeRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9][0-9\s.\-()]{7,19}$/;

function badRequest(message, errors = null) {
  const error = new Error(message);
  error.statusCode = 400;
  if (errors) error.errors = errors;
  return error;
}

async function validateManualCandidate(data, userId = 1) {
  const errors = {};
  const fullName = String(data.full_name || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const sourceCode = String(data.source_code || '').trim().toUpperCase();

  if (!fullName) errors.full_name = 'Họ tên là bắt buộc.';
  if (!email) errors.email = 'Email là bắt buộc.';
  else if (!EMAIL_REGEX.test(email)) errors.email = 'Email không đúng định dạng.';
  if (!phone) errors.phone = 'Số điện thoại là bắt buộc.';
  else if (!PHONE_REGEX.test(phone)) errors.phone = 'Số điện thoại không hợp lệ.';

  let validRequestId = data.recruitment_request_id ? Number(data.recruitment_request_id) : null;
  if (!validRequestId) {
    errors.recruitment_request_id = 'Vị trí tuyển dụng là bắt buộc.';
  } else {
    // Kiểm tra xem ID có trong recruitment_requests không
    const [reqRows] = await pool.query('SELECT id FROM recruitment_requests WHERE id = ? LIMIT 1', [validRequestId]);
    if (!reqRows.length) {
      // Nếu là position_id từ job_positions, tạo 1 recruitment_request mẫu
      const [posRows] = await pool.query('SELECT position_id FROM job_positions WHERE position_id = ? LIMIT 1', [validRequestId]);
      if (posRows.length) {
        const [insertedReq] = await pool.query(
          "INSERT INTO recruitment_requests (position_id, headcount, status, created_by, reason) VALUES (?, 1, 'APPROVED', ?, 'Tuyển dụng trực tiếp')",
          [validRequestId, userId || 1]
        );
        validRequestId = insertedReq.insertId;
      }
    }
  }

  if (!sourceCode) {
    errors.source_code = 'Nguồn ứng viên là bắt buộc.';
  } else {
    const [rows] = await pool.query(
      "SELECT 1 FROM master_data WHERE category_group = 'CANDIDATE_SOURCE' AND code = ? LIMIT 1",
      [sourceCode]
    );
    if (!rows.length) {
      const sourceNameMap = {
        'LINKEDIN': 'LinkedIn',
        'TOPCV': 'TopCV',
        'VIETNAMWORKS': 'VietnamWorks',
        'REFERRAL': 'Giới thiệu nội bộ',
        'FACEBOOK': 'Facebook',
        'OTHER': 'Nguồn khác'
      };
      const name = sourceNameMap[sourceCode] || sourceCode;
      await pool.query(
        "INSERT IGNORE INTO master_data (category_group, code, name, is_active) VALUES ('CANDIDATE_SOURCE', ?, ?, 1)",
        [sourceCode, name]
      );
    }
  }

  if (Object.keys(errors).length) {
    throw badRequest(Object.values(errors)[0], errors);
  }
  return { fullName, email, phone, sourceCode, validRequestId };
}

async function createCandidate(data, userId, ipAddress, allowDuplicate = false) {
  const { resume_url } = data;
  const { fullName: full_name, email, phone, sourceCode: source_code, validRequestId: recruitment_request_id } = await validateManualCandidate(data, userId);

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

async function updateCandidateStatus(id, status, rejectionReasonCode, rejectionReason, userId, ipAddress) {
  const candidate = await candidateRepo.findById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  const finalCode = rejectionReasonCode ? String(rejectionReasonCode).trim() : null;
  const finalReason = rejectionReason ? String(rejectionReason).trim() : null;

  if (status === 'REJECTED' && !finalCode && !finalReason) {
    const error = new Error('Bắt buộc phải chọn hoặc viết lý do loại hồ sơ.');
    error.statusCode = 400;
    throw error;
  }

  // If user provided a code, but no text reason, find standard name if possible
  let resolvedReasonText = finalReason;
  if (!resolvedReasonText && finalCode) {
    const [rows] = await pool.query(
      "SELECT name FROM master_data WHERE category_group = 'REJECTION_REASON' AND code = ? LIMIT 1",
      [finalCode]
    );
    resolvedReasonText = rows[0]?.name || finalCode;
  }

  await candidateRepo.updateStatus(id, status, finalCode || 'OTHER', resolvedReasonText);

  // Reference Locking logic for Rejection Reason
  if (status === 'REJECTED' && finalCode) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'REJECTION_REASON' AND code = ?", [finalCode]);
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

async function listCandidates(query = {}, user) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const { rows, total } = await candidateRepo.search({
    search: String(query.search || '').trim(),
    source: String(query.source || '').trim(),
    status: String(query.status || '').trim(),
    page,
    limit,
    user
  });
  return {
    items: rows,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) }
  };
}

async function getCandidateDetail(id) {
  const candidate = await candidateRepo.findDetailById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }
  const applications = await candidateRepo.getApplicationHistory(id);
  const notes = await candidateRepo.listNotes(id);
  return {
    ...candidate,
    has_resume: Boolean(candidate.resume_url),
    applications,
    notes
  };
}

async function assertCandidateExists(id) {
  const candidate = await candidateRepo.findById(id);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }
  return candidate;
}

function validateNoteContent(content) {
  const text = String(content || '').trim();
  if (!text) throw badRequest('Nội dung ghi chú không được để trống.', { content: 'Nội dung ghi chú không được để trống.' });
  if (text.length > 2000) throw badRequest('Ghi chú tối đa 2000 ký tự.', { content: 'Ghi chú tối đa 2000 ký tự.' });
  return text;
}

async function getCandidateNotes(candidateId) {
  await assertCandidateExists(candidateId);
  return candidateRepo.listNotes(candidateId);
}

async function addCandidateNote(candidateId, content, userId, ipAddress) {
  await assertCandidateExists(candidateId);
  const text = validateNoteContent(content);
  const noteId = await candidateRepo.createNote(candidateId, text, userId);
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_NOTE_ADDED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Thêm ghi chú cho ứng viên #${candidateId}`,
    ipAddress
  });
  return candidateRepo.findNoteById(noteId);
}

async function updateCandidateNote(candidateId, noteId, content, userId, ipAddress) {
  await assertCandidateExists(candidateId);
  const note = await candidateRepo.findNoteById(noteId);
  if (!note || Number(note.candidate_id) !== Number(candidateId)) {
    const error = new Error('Không tìm thấy ghi chú.');
    error.statusCode = 404;
    throw error;
  }
  const text = validateNoteContent(content);
  await candidateRepo.updateNote(noteId, text, userId);
  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_NOTE_UPDATED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Cập nhật ghi chú #${noteId} của ứng viên #${candidateId}`,
    ipAddress
  });
  return candidateRepo.findNoteById(noteId);
}

async function getAvailablePositions() {
  // Lấy danh sách các yêu cầu tuyển dụng đang mở/đã duyệt
  const [requests] = await pool.query(`
    SELECT r.id, r.headcount, r.status, p.position_name, d.department_name
    FROM recruitment_requests r
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN departments d ON r.department_id = d.department_id
    WHERE r.status = 'APPROVED'
    ORDER BY r.id DESC
  `);

  if (requests.length > 0) {
    return requests.map(r => ({
      id: r.id,
      name: `#${r.id} - ${r.position_name || 'Vị trí tuyển dụng'} (${r.department_name || 'Toàn công ty'})`
    }));
  }

  // Nếu chưa có request nào được approved, lấy từ bảng job_positions
  const [positions] = await pool.query(`
    SELECT position_id, position_name, position_level 
    FROM job_positions 
    WHERE status = 'ACTIVE'
    ORDER BY position_name ASC
  `);

  return positions.map(p => ({
    id: p.position_id,
    name: `${p.position_name} (${p.position_level || 'Toàn thời gian'})`
  }));
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
  listCandidates,
  getCandidateDetail,
  getCandidateNotes,
  addCandidateNote,
  updateCandidateNote,
  getAvailablePositions
};

