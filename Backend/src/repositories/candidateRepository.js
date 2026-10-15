const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO candidates
      (full_name, email, phone, status, source_code, recruitment_request_id, created_by, resume_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    data.full_name,
    data.email,
    data.phone || null,
    data.status || 'NEW',
    data.source_code || null,
    data.recruitment_request_id || null,
    data.created_by,
    data.resume_url || null
  ]);
  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT c.*, r.department_id, r.position_id 
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    WHERE c.id = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll(user) {
  let sql = `
    SELECT c.*, r.reason as job_reason, d.department_name, p.position_name
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    WHERE c.merged_into_id IS NULL
  `;
  const params = [];

  if (user) {
    const isHiringManager = user.roles && user.roles.some(r => r.role_code === 'HIRING_MANAGER');
    const isHRManager = user.roles && user.roles.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'ADMIN');
    const isRecruiter = user.roles && user.roles.some(r => r.role_code === 'RECRUITER');
    
    // If not HR Manager and not Admin and not Recruiter, filter by department
    if (isHiringManager && !isHRManager && !isRecruiter) {
      // Show candidates applied to jobs in their department OR candidates with no job assigned yet (optional, but let's restrict to strictly their dept)
      // Actually, if candidate has no recruitment_request_id (N/A), they shouldn't see them either, unless we want them to see "floating" candidates. But per matrix: "Chỉ trên dữ liệu của vị trí mình/phòng ban mình". So it's best to only show candidates explicitly linked to their department's requests.
      sql += ` AND r.department_id = ? `;
      params.push(user.department_id);
    }
  }

  sql += ` ORDER BY c.created_at DESC`;

  const [rows] = await pool.execute(sql, params);
  return rows;
}

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


module.exports = {
  create,
  findById,
  getAll,
  updateStatus,
  search,
  findDetailById,
  getApplicationHistory,
  listNotes,
  findNoteById,
  createNote,
  updateNote
};
