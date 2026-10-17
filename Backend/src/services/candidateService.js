const candidateRepo = require('../repositories/candidateRepository');
const candidateRatingRepo = require('../repositories/candidateRatingRepository');
const candidateProfileRepo = require('../repositories/candidateProfileRepository');
const candidateMergeRepo = require('../repositories/candidateMergeRepository');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');
const { withCandidateTransaction } = require('../utils/candidateTransaction');

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
  const { resume_url, cv_file_path, cover_letter, tags, parsed_skills } = data;
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
  const text = String(noteContent || '').trim();
  if (!text) {
    const error = new Error('Nội dung ghi chú không được để trống.');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > 2000) {
    const error = new Error('Ghi chú tối đa 2000 ký tự.');
    error.statusCode = 400;
    throw error;
  }

  const userId = typeof currentUser === 'object' ? currentUser?.user_id : currentUser;
  const userObj = typeof currentUser === 'object' ? currentUser : { user_id: userId };

  const candidate = await candidateRepo.findById(candidateId);
  if (!candidate) {
    const error = new Error('Không tìm thấy ứng viên.');
    error.statusCode = 404;
    throw error;
  }

  if (candidateRepo.checkCandidateAccess && userObj.roles) {
    const hasAccess = await candidateRepo.checkCandidateAccess(candidate, userObj);
    if (!hasAccess) {
      const error = new Error('Bạn không có quyền thêm ghi chú cho ứng viên này.');
      error.statusCode = 403;
      throw error;
    }
  }

  const noteId = candidateRepo.createNote
    ? await candidateRepo.createNote(candidateId, text, userId)
    : await candidateRepo.addNote(candidateId, userId, text);

  if (candidateRepo.addActivity) {
    await candidateRepo.addActivity(candidateId, userId, 'NOTE_ADDED', `Thêm ghi chú đánh giá mới: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`);
  }

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_NOTE_ADDED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Added note for candidate ${candidate.full_name || candidateId}`,
    ipAddress
  });

  if (candidateRepo.findNoteById) {
    const created = await candidateRepo.findNoteById(noteId);
    if (created) return created;
  }
  return candidateRepo.getNotes ? await candidateRepo.getNotes(candidateId) : { id: noteId, candidate_id: candidateId, content: text };
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

async function updateCandidateStatus(id, status, rejectionReasonCode, rejectionReasonOrNote, userId, ipAddress) {
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

  const finalCode = rejectionReasonCode ? String(rejectionReasonCode).trim() : null;
  const finalReason = rejectionReasonOrNote ? String(rejectionReasonOrNote).trim() : null;

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

  await candidateRepo.updateStatus(id, status, finalCode, resolvedReasonText, userId, candidate.status);

  // Reference Locking logic for Rejection Reason
  if (status === 'REJECTED' && finalCode) {
    await pool.query("UPDATE master_data SET is_referenced = 1 WHERE category_group = 'REJECTION_REASON' AND code = ?", [finalCode]);
  }

  const stageNames = {
    NEW: 'Hồ sơ mới',
    SCREENING: 'Sàng lọc',
    INTERVIEWING: 'Phỏng vấn',
    OFFERED: 'Đề xuất offer',
    HIRED: 'Nhận việc',
    REJECTED: 'Loại'
  };

  try {
    await candidateRepo.addActivity(id, userId, 'STATUS_UPDATED', `Cập nhật trạng thái hồ sơ thành ${status}${finalCode ? ` (Lý do: ${finalCode})` : ''}`);
  } catch (e) {}

  await auditRepo.createLog({
    userId,
    performedBy: userId,
    action: 'CANDIDATE_STAGE_CHANGED',
    entityType: 'candidates',
    entityId: String(id),
    description: `Chuyển ứng viên "${candidate.full_name}" từ giai đoạn [${stageNames[candidate.status] || candidate.status}] sang [${stageNames[status] || status}]${finalCode ? ` (Lý do: ${finalCode})` : ''}`,
    ipAddress
  });

  return await candidateRepo.findById(id);
}

async function getCandidateHistory(id) {
  return await candidateRepo.getStageHistory(id);
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
  getCandidateHistory,
  listCandidates,
  getCandidateDetail,
  getCandidateNotes,
  updateCandidateNote,
  getAvailablePositions,
  saveMyRating,
  getCandidateRatings
};

