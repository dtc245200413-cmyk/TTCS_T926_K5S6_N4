const { pool } = require('../config/database');

function isMissingRecruitmentRequests(error) {
  return error.code === 'ER_NO_SUCH_TABLE'
    && /\bTable ['`](?:[^'`]+\.)?recruitment_requests['`] doesn't exist/i.test(error.sqlMessage || error.message || '');
}

async function create(data) {
  const sql = `
    INSERT INTO candidates
      (full_name, email, phone, status, current_stage, source_code, recruitment_request_id, cv_file_path, resume_url, cover_letter, tracking_code, parsed_skills, rating, is_talent_pool, tags, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const cvPath = data.cv_file_path || data.resume_url || null;

  const [result] = await pool.execute(sql, [
    data.full_name,
    data.email,
    data.phone || null,
    data.status || 'NEW',
    data.current_stage || 'NEW',
    data.source_code || null,
    data.recruitment_request_id || null,
    cvPath,
    cvPath,
    data.cover_letter || null,
    data.tracking_code || `TRK-${Date.now().toString().slice(-6)}`,
    data.parsed_skills || null,
    data.rating || 0,
    data.is_talent_pool ? 1 : 0,
    data.tags || null,
    data.created_by
  ]);

  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT c.*, 
           r.department_id, 
           r.position_id, 
           r.recruiter_id,
           r.created_by AS hiring_manager_id,
           d.department_name, 
           p.position_name,
           recruiter.full_name AS recruiter_name,
           recruiter.company_email AS recruiter_email,
           hm.full_name AS hiring_manager_name,
           hm.company_email AS hiring_manager_email
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users recruiter ON r.recruiter_id = recruiter.user_id
    LEFT JOIN users hm ON r.created_by = hm.user_id
    WHERE c.id = ? LIMIT 1
  `;
  try {
    const [rows] = await pool.execute(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    if (!isMissingRecruitmentRequests(error)) throw error;
    const [rows] = await pool.execute(`SELECT c.* FROM candidates c WHERE c.id = ? LIMIT 1`, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
}

async function getAll(user, filters = {}) {
  const {
    search,
    position_id,
    stage,
    source,
    tag,
    from_date,
    to_date,
    page = 1,
    limit = 10,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = filters;

  const whereClauses = ['(c.merged_into_id IS NULL)'];
  const params = [];

  // Authorization filter: Hiring Manager sees only candidates in their department / request
  if (user) {
    const roles = user.roles ? user.roles.map(r => r.role_code) : [];
    const isHiringManager = roles.includes('HIRING_MANAGER');
    const isHRManager = roles.includes('HR_MANAGER') || roles.includes('ADMIN');
    const isRecruiter = roles.includes('RECRUITER');
    
    if (isHiringManager && !isHRManager && !isRecruiter) {
      whereClauses.push('(r.department_id = ? OR r.created_by = ?)');
      params.push(user.department_id, user.user_id);
    }
  }

  // 1. Search keyword (họ tên, email, số điện thoại)
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
    params.push(term, term, term);
  }

  // 2. Position filter (theo vị trí tuyển dụng)
  if (position_id && position_id !== '' && position_id !== 'all') {
    whereClauses.push('(r.position_id = ? OR c.recruitment_request_id = ?)');
    params.push(position_id, position_id);
  }

  // 3. Stage filter (theo giai đoạn)
  if (stage && stage !== '' && stage !== 'all') {
    whereClauses.push('(c.current_stage = ? OR c.status = ?)');
    params.push(stage, stage);
  }

  // 4. Source filter (theo nguồn ứng tuyển)
  if (source && source !== '' && source !== 'all') {
    whereClauses.push('c.source_code = ?');
    params.push(source);
  }

  // 5. Tag filter (theo nhãn)
  if (tag && tag !== '' && tag !== 'all') {
    const tagTerm = `%${tag.trim()}%`;
    whereClauses.push('c.tags LIKE ?');
    params.push(tagTerm);
  }

  // 6. Date Range filter (khoảng ngày nộp: from_date -> to_date)
  if (from_date && from_date.trim()) {
    whereClauses.push('c.created_at >= ?');
    params.push(`${from_date.trim()} 00:00:00`);
  }
  if (to_date && to_date.trim()) {
    whereClauses.push('c.created_at <= ?');
    params.push(`${to_date.trim()} 23:59:59`);
  }

  const whereSql = whereClauses.join(' AND ');

  // Count total matching candidates
  const countSql = `
    SELECT COUNT(*) AS total
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    WHERE ${whereSql}
  `;
  const [countRows] = await pool.execute(countSql, params);
  const total = countRows[0]?.total || 0;

  // Sorting
  const allowedSortCols = ['created_at', 'full_name', 'email', 'rating', 'current_stage'];
  const sortCol = allowedSortCols.includes(sort_by) ? `c.${sort_by}` : 'c.created_at';
  const sortDir = (sort_order && sort_order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  // Pagination
  const numLimit = Math.max(1, parseInt(limit) || 10);
  const numPage = Math.max(1, parseInt(page) || 1);
  const offset = (numPage - 1) * numLimit;

  // Query records
  const dataSql = `
    SELECT c.*, 
           r.reason as job_reason, 
           r.recruiter_id,
           r.created_by AS hiring_manager_id,
           d.department_name, 
           p.position_name,
           p.position_id,
           recruiter.full_name AS recruiter_name,
           hm.full_name AS hiring_manager_name,
           (SELECT COUNT(*) FROM candidates c2 WHERE c2.email = c.email OR (c2.phone IS NOT NULL AND c2.phone != '' AND c2.phone = c.phone)) AS total_applications
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users recruiter ON r.recruiter_id = recruiter.user_id
    LEFT JOIN users hm ON r.created_by = hm.user_id
    WHERE ${whereSql}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ${numLimit} OFFSET ${offset}
  `;

  const [rows] = await pool.execute(dataSql, params);

  // Fetch filter options for dropdowns
  const [positions] = await pool.query('SELECT position_id, position_name FROM job_positions ORDER BY position_name ASC');
  const [stages] = await pool.query('SELECT stage_code, stage_name, stage_order FROM pipeline_stages WHERE is_active = 1 ORDER BY stage_order ASC');
  const [sources] = await pool.query("SELECT code, name FROM master_data WHERE category_group = 'CANDIDATE_SOURCE' AND is_active = 1 ORDER BY display_order ASC");

  // Extract all distinct tags from candidates in database
  const [tagRows] = await pool.query("SELECT tags FROM candidates WHERE tags IS NOT NULL AND tags != ''");
  const uniqueTags = new Set();
  tagRows.forEach(r => {
    if (r.tags) {
      r.tags.split(',').forEach(t => {
        const tr = t.trim();
        if (tr) uniqueTags.add(tr);
      });
    }
  });

  return {
    candidates: rows,
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1
    },
    filterOptions: {
      positions,
      stages,
      sources,
      tags: Array.from(uniqueTags)
    }
  };
}

/**
 * Check authorization for viewing candidate unified profile:
 * Acceptance criteria: "Chỉ recruiter phụ trách và hiring manager của vị trí đó mở được"
 * (Plus HR_MANAGER and ADMIN as system administrators)
 */
async function checkCandidateAccess(candidate, user) {
  if (!candidate || !user) return false;

  const roles = user.roles ? user.roles.map(r => r.role_code) : [];
  const isAdmin = roles.includes('ADMIN');
  const isHrManager = roles.includes('HR_MANAGER');
  const isRecruiter = roles.includes('RECRUITER');

  // Admin, HR Manager và toàn bộ Nhân viên tuyển dụng (Recruiter) đều có quyền xem hồ sơ
  if (isAdmin || isHrManager || isRecruiter) return true;

  const isHiringManager = roles.includes('HIRING_MANAGER');
  // Trưởng bộ phận của vị trí / phòng ban đó
  if (isHiringManager) {
    if (candidate.hiring_manager_id === user.user_id) return true;
    if (candidate.department_id && candidate.department_id === user.department_id) return true;
  }

  return false;
}

/**
 * Lịch sử ứng tuyển các vị trí của cùng ứng viên (qua email hoặc phone)
 */
async function getApplicationHistory(email, phone) {
  const sql = `
    SELECT 
      c.id,
      c.full_name,
      c.email,
      c.phone,
      c.status,
      c.current_stage,
      c.tracking_code,
      c.rating,
      c.created_at,
      c.updated_at,
      r.id AS recruitment_request_id,
      r.reason AS requisition_reason,
      r.needed_by_date,
      d.department_id,
      d.department_name,
      p.position_id,
      p.position_name,
      recruiter.full_name AS recruiter_name,
      recruiter.company_email AS recruiter_email,
      hm.full_name AS hiring_manager_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users recruiter ON r.recruiter_id = recruiter.user_id
    LEFT JOIN users hm ON r.created_by = hm.user_id
    WHERE c.email = ? OR (c.phone IS NOT NULL AND c.phone != '' AND c.phone = ?)
    ORDER BY c.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [email, phone || '']);
  return rows;
}

/**
 * Danh sách ghi chú của ứng viên
 */
async function getNotes(candidateId) {
  const sql = `
    SELECT 
      n.id,
      n.candidate_id,
      n.note_content,
      n.created_at,
      u.user_id AS author_id,
      u.full_name AS author_name,
      u.job_title AS author_title,
      u.company_email AS author_email
    FROM candidate_notes n
    JOIN users u ON n.author_id = u.user_id
    WHERE n.candidate_id = ?
    ORDER BY n.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [candidateId]);
  return rows;
}

async function addNote(candidateId, authorId, noteContent) {
  const sql = `INSERT INTO candidate_notes (candidate_id, author_id, note_content) VALUES (?, ?, ?)`;
  const [result] = await pool.execute(sql, [candidateId, authorId, noteContent]);
  return result.insertId;
}

/**
 * Lịch sử xử lý / Dòng thời gian ứng viên
 */
async function getActivities(candidateId) {
  const sql = `
    SELECT 
      a.id,
      a.candidate_id,
      a.action_type,
      a.details,
      a.created_at,
      u.user_id AS performer_id,
      u.full_name AS performer_name,
      u.job_title AS performer_title
    FROM candidate_activities a
    LEFT JOIN users u ON a.performed_by = u.user_id
    WHERE a.candidate_id = ?
    ORDER BY a.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [candidateId]);
  return rows;
}

async function addActivity(candidateId, performedBy, actionType, details) {
  const sql = `INSERT INTO candidate_activities (candidate_id, performed_by, action_type, details) VALUES (?, ?, ?, ?)`;
  const [result] = await pool.execute(sql, [candidateId, performedBy, actionType, details]);
  return result.insertId;
}

async function getPipelineStages() {
  const sql = `SELECT * FROM pipeline_stages WHERE is_active = 1 ORDER BY stage_order ASC`;
  const [rows] = await pool.execute(sql);
  return rows;
}

<<<<<<< HEAD
async function updateStatus(id, status, rejectionReasonCode = null, rejectionReason = null) {
  const sql = `UPDATE candidates SET status = ?, rejection_reason_code = ?, rejection_reason = ?, stage_changed_at = NOW(), sla_overdue = 0, sla_flagged_at = NULL WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReasonCode, rejectionReason, id]);
}

/** Danh sách ứng viên có tìm kiếm, lọc nguồn/trạng thái và phân trang. */
async function search({ search = '', source = '', status = '', page = 1, limit = 10, user = null } = {}) {
  const where = ['c.merged_into_id IS NULL'];
  const params = [];

  if (search) {
    where.push('(c.full_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (source) {
    where.push('c.source_code = ?');
    params.push(source);
  }
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }

  const whereSql = where.join(' AND ');
  const fromSql = `
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN master_data src ON src.category_group = 'CANDIDATE_SOURCE' AND src.code = c.source_code
    WHERE ${whereSql}
  `;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${fromSql}`, params);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT c.*, d.department_name, p.position_name, src.name AS source_name
     ${fromSql}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { rows, total: Number(total) };
}

async function findDetailById(id) {
  const [rows] = await pool.execute(`
    SELECT c.*, d.department_name, p.position_name, src.name AS source_name,
           u.full_name AS created_by_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN master_data src ON src.category_group = 'CANDIDATE_SOURCE' AND src.code = c.source_code
    LEFT JOIN users u ON u.user_id = c.created_by
    WHERE c.id = ? LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function getApplicationHistory(candidateId) {
  const [rows] = await pool.execute(`
    SELECT a.id AS application_id, a.status, a.resume_url, a.cover_letter, a.applied_at, a.updated_at,
           jp.title AS job_title, d.department_name, p.position_name
    FROM candidate_applications a
    LEFT JOIN job_postings jp ON jp.id = a.job_posting_id
    LEFT JOIN recruitment_requests rr ON rr.id = a.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions p ON p.position_id = rr.position_id
    WHERE a.candidate_id = ?
    ORDER BY a.applied_at DESC
  `, [candidateId]);
  return rows;
}

const NOTE_SELECT = `
    SELECT n.id, n.candidate_id, n.note_content AS content, n.author_id AS created_by, n.updated_by,
           n.created_at, n.updated_at,
           cu.full_name AS created_by_name, uu.full_name AS updated_by_name
    FROM candidate_notes n
    LEFT JOIN users cu ON cu.user_id = n.author_id
    LEFT JOIN users uu ON uu.user_id = n.updated_by
`;

async function listNotes(candidateId) {
  const [rows] = await pool.execute(`
    ${NOTE_SELECT}
    WHERE n.candidate_id = ?
    ORDER BY n.created_at DESC, n.id DESC
  `, [candidateId]);
  return rows;
}

async function findNoteById(noteId) {
  const [rows] = await pool.execute(`${NOTE_SELECT} WHERE n.id = ? LIMIT 1`, [noteId]);
  return rows[0] || null;
}

async function createNote(candidateId, content, userId) {
  const [result] = await pool.execute(
    'INSERT INTO candidate_notes (candidate_id, note_content, author_id) VALUES (?, ?, ?)',
    [candidateId, content, userId]
  );
  return result.insertId;
}

async function updateNote(noteId, content, userId) {
  await pool.execute(
    'UPDATE candidate_notes SET note_content = ?, updated_by = ? WHERE id = ?',
    [content, userId, noteId]
  );
}


=======
async function updateStatus(id, status, rejectionReasonCode = null) {
  const sql = `UPDATE candidates SET status = ?, rejection_reason_code = ?, stage_changed_at = NOW(), sla_overdue = 0, sla_flagged_at = NULL, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReasonCode, id]);
}

async function updateStage(id, stageCode) {
  let mappedStatus = 'INTERVIEWING';
  if (stageCode === 'NEW') mappedStatus = 'NEW';
  else if (stageCode === 'SCREENING') mappedStatus = 'NEW';
  else if (stageCode === 'INTERVIEW') mappedStatus = 'INTERVIEWING';
  else if (stageCode === 'OFFER') mappedStatus = 'OFFERED';
  else if (stageCode === 'HIRED') mappedStatus = 'HIRED';
  else if (stageCode === 'REJECTED') mappedStatus = 'REJECTED';

  const sql = `UPDATE candidates SET current_stage = ?, status = ?, stage_changed_at = NOW(), sla_overdue = 0, sla_flagged_at = NULL, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [stageCode, mappedStatus, id]);
}

async function updateRating(id, rating) {
  const sql = `UPDATE candidates SET rating = ?, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [rating, id]);
}

async function updateTags(id, tags) {
  const sql = `UPDATE candidates SET tags = ?, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [tags, id]);
}

async function updateTalentPool(id, isTalentPool) {
  const sql = `UPDATE candidates SET is_talent_pool = ?, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [isTalentPool ? 1 : 0, id]);
}

async function updateCvFilePath(id, filePath) {
  const sql = `UPDATE candidates SET cv_file_path = ?, resume_url = ?, updated_at = NOW() WHERE id = ?`;
  await pool.execute(sql, [filePath, filePath, id]);
}

>>>>>>> 27c5b55ac5c2c5fd3de79a2e5637d3ea01e18e22
module.exports = {
  create,
  findById,
  getAll,
<<<<<<< HEAD
  updateStatus,
  search,
  findDetailById,
  getApplicationHistory,
  listNotes,
  findNoteById,
  createNote,
  updateNote
=======
  checkCandidateAccess,
  getApplicationHistory,
  getNotes,
  addNote,
  getActivities,
  addActivity,
  getPipelineStages,
  updateStatus,
  updateStage,
  updateRating,
  updateTags,
  updateTalentPool,
  updateCvFilePath
>>>>>>> 27c5b55ac5c2c5fd3de79a2e5637d3ea01e18e22
};
