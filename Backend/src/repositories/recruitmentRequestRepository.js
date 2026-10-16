/**
 * recruitmentRequestRepository.js
 */

const { pool } = require('../config/database');

async function create(data) {
  const sql = `
    INSERT INTO recruitment_requests
      (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, salary_explanation, status, created_by, work_location_code, work_type_code, budget, level_salary, skills, recruiter_id, assistant_recruiter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.execute(sql, [
    data.code ?? null,
    data.title ?? null,
    data.department_id ?? null,
    data.position_id ?? null,
    data.headcount ?? null,
    data.reason ?? null,
    data.proposed_salary_min ?? null,
    data.proposed_salary_max ?? null,
    data.needed_by_date ?? null,
    data.job_description ?? null,
    data.candidate_requirements ?? null,
    data.salary_explanation ?? null,
    data.status ?? 'DRAFT',
    data.created_by ?? null,
    data.work_location_code ?? null,
    data.work_type_code ?? null,
    data.budget ?? null,
    data.level_salary ?? null,
    data.skills ?? null,
    data.recruiter_id ?? null,
    data.assistant_recruiter_id ?? null
  ]);
  return result.insertId;
}

async function findById(id) {
  const sql = `
    SELECT 
      r.*, 
      d.department_name, 
      p.position_name, 
      p.min_salary AS std_min_salary, 
      p.max_salary AS std_max_salary, 
      u.full_name AS created_by_name,
      rec.full_name AS recruiter_name,
      rec.avatar_url AS recruiter_avatar,
      asst.full_name AS assistant_recruiter_name,
      asst.avatar_url AS assistant_recruiter_avatar
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    LEFT JOIN users rec ON r.recruiter_id = rec.user_id
    LEFT JOIN users asst ON r.assistant_recruiter_id = asst.user_id
    WHERE r.id = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

async function getAll(userId) {
  const sql = `
    SELECT 
      r.*, 
      d.department_name, 
      p.position_name, 
      u.full_name AS created_by_name,
      rec.full_name AS recruiter_name,
      rec.avatar_url AS recruiter_avatar,
      asst.full_name AS assistant_recruiter_name,
      asst.avatar_url AS assistant_recruiter_avatar
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    LEFT JOIN users rec ON r.recruiter_id = rec.user_id
    LEFT JOIN users asst ON r.assistant_recruiter_id = asst.user_id
    WHERE r.created_by = ?
    ORDER BY r.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

async function getAllSystemWide() {
  const sql = `
    SELECT 
      r.*, 
      d.department_name, 
      p.position_name, 
      u.full_name AS created_by_name,
      rec.full_name AS recruiter_name,
      rec.avatar_url AS recruiter_avatar,
      asst.full_name AS assistant_recruiter_name,
      asst.avatar_url AS assistant_recruiter_avatar
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    LEFT JOIN users rec ON r.recruiter_id = rec.user_id
    LEFT JOIN users asst ON r.assistant_recruiter_id = asst.user_id
    ORDER BY r.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function getAllForApproval() {
  const sql = `
    SELECT 
      r.*, 
      d.department_name, 
      p.position_name, 
      u.full_name AS created_by_name,
      rec.full_name AS recruiter_name,
      rec.avatar_url AS recruiter_avatar,
      asst.full_name AS assistant_recruiter_name,
      asst.avatar_url AS assistant_recruiter_avatar
    FROM recruitment_requests r
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    JOIN users u ON r.created_by = u.user_id
    LEFT JOIN users rec ON r.recruiter_id = rec.user_id
    LEFT JOIN users asst ON r.assistant_recruiter_id = asst.user_id
    WHERE r.status != 'DRAFT'
    ORDER BY CASE WHEN r.status = 'PENDING' THEN 1 ELSE 2 END, r.created_at DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function update(id, data) {
  const sql = `
    UPDATE recruitment_requests
    SET department_id = ?,
        position_id = ?,
        headcount = ?,
        reason = ?,
        proposed_salary_min = ?,
        proposed_salary_max = ?,
        needed_by_date = ?,
        job_description = ?,
        candidate_requirements = ?,
        salary_explanation = ?,
        status = ?,
        work_location_code = ?,
        work_type_code = ?,
        title = COALESCE(?, title),
        budget = COALESCE(?, budget),
        level_salary = COALESCE(?, level_salary),
        skills = COALESCE(?, skills)
    WHERE id = ?
  `;
  await pool.execute(sql, [
    data.department_id ?? null,
    data.position_id ?? null,
    data.headcount ?? null,
    data.reason ?? null,
    data.proposed_salary_min ?? null,
    data.proposed_salary_max ?? null,
    data.needed_by_date ?? null,
    data.job_description ?? null,
    data.candidate_requirements ?? null,
    data.salary_explanation ?? null,
    data.status ?? 'PENDING',
    data.work_location_code ?? null,
    data.work_type_code ?? null,
    data.title ?? null,
    data.budget ?? null,
    data.level_salary ?? null,
    data.skills ?? null,
    id
  ]);
}

async function updateStatus(id, status, rejectionReason = null) {
  const sql = `UPDATE recruitment_requests SET status = ?, rejection_reason = ? WHERE id = ?`;
  await pool.execute(sql, [status, rejectionReason, id]);
}

async function assignRecruiter(id, { recruiter_id, assistant_recruiter_id, assignment_note, status }) {
  let sql = `UPDATE recruitment_requests SET recruiter_id = ?, assistant_recruiter_id = ?, assignment_note = ?`;
  const params = [recruiter_id ?? null, assistant_recruiter_id ?? null, assignment_note ?? null];
  if (status) {
    sql += `, status = ?`;
    params.push(status);
  }
  sql += ` WHERE id = ?`;
  params.push(id);
  await pool.execute(sql, params);
}

async function updateStatusAction(id, { status, reason }) {
  let reasonCol = null;
  if (status === 'PAUSED') reasonCol = 'pause_reason';
  else if (status === 'CLOSED') reasonCol = 'close_reason';
  else if (status === 'CANCELLED') reasonCol = 'cancel_reason';

  let sql = `UPDATE recruitment_requests SET status = ?`;
  const params = [status];
  if (reasonCol) {
    sql += `, ${reasonCol} = ?`;
    params.push(reason || null);
  }
  sql += ` WHERE id = ?`;
  params.push(id);
  await pool.execute(sql, params);
}

async function getAuditLogsForRequest(requestId) {
  const sql = `
    SELECT a.*, u.full_name AS user_full_name, u.avatar_url, u.job_title
    FROM audit_logs a
    LEFT JOIN users u ON a.performed_by = u.user_id
    WHERE a.entity_type = 'recruitment_requests' AND a.entity_id = ?
    ORDER BY a.created_at DESC
  `;
  const [rows] = await pool.execute(sql, [String(requestId)]);
  return rows;
}

async function getRecruitersWithWorkload() {
  const sql = `
    SELECT 
      u.user_id, 
      u.full_name, 
      u.company_email, 
      u.avatar_url,
      COUNT(DISTINCT r.id) AS active_request_count
    FROM users u
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles ro ON ur.role_id = ro.role_id
    LEFT JOIN recruitment_requests r ON (r.recruiter_id = u.user_id AND r.status IN ('IN_PROGRESS', 'APPROVED', 'DRAFT', 'PAUSED'))
    WHERE ro.role_code = 'RECRUITER'
    GROUP BY u.user_id, u.full_name, u.company_email, u.avatar_url
    ORDER BY u.full_name ASC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

module.exports = {
  create,
  update,
  findById,
  getAll,
  getAllSystemWide,
  getAllForApproval,
  updateStatus,
  assignRecruiter,
  updateStatusAction,
  getAuditLogsForRequest,
  getRecruitersWithWorkload
};
