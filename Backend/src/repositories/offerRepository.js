/**
 * offerRepository.js
 * Quản lý dữ liệu Thư mời nhận việc (candidate_offers),
 * Lịch sử phê duyệt (offer_approvals) và Tiếp nhận nhân viên mới (candidate_onboardings).
 */

const { pool } = require('../config/database');

async function getOffers({ status = 'ALL', search = '', departmentId = null, approverOnly = false, recruiterId = null }) {
  let query = `
    SELECT 
      o.id,
      o.offer_code,
      o.candidate_id,
      o.application_id,
      o.recruitment_request_id,
      o.department_id,
      o.position_id,
      o.job_title,
      o.basic_salary,
      COALESCE(o.salary_amount, o.basic_salary) AS salary_amount,
      o.probation_salary,
      o.probation_period_months,
      o.currency,
      o.expected_start_date,
      COALESCE(o.start_date, o.expected_start_date) AS start_date,
      o.response_deadline,
      o.work_location,
      o.benefits,
      o.message,
      o.special_terms,
      o.status,
      o.created_by,
      o.submitted_at,
      o.approved_at,
      o.sent_to_candidate_at,
      o.responded_at,
      o.candidate_response,
      o.created_at,
      o.updated_at,
      c.full_name AS candidate_name,
      c.email AS candidate_email,
      c.phone AS candidate_phone,
      c.application_code,
      d.department_name,
      p.position_name,
      u.full_name AS creator_name,
      u.company_email AS creator_email,
      (SELECT oa.reason FROM offer_approvals oa WHERE oa.offer_id = o.id ORDER BY oa.action_at DESC LIMIT 1) AS latest_approval_reason,
      (SELECT oa.action FROM offer_approvals oa WHERE oa.offer_id = o.id ORDER BY oa.action_at DESC LIMIT 1) AS latest_approval_action,
      (SELECT u2.full_name FROM offer_approvals oa JOIN users u2 ON u2.user_id = oa.approver_id WHERE oa.offer_id = o.id ORDER BY oa.action_at DESC LIMIT 1) AS latest_approver_name
    FROM candidate_offers o
    LEFT JOIN candidates c ON c.id = o.candidate_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    LEFT JOIN job_positions p ON p.position_id = o.position_id
    LEFT JOIN users u ON u.user_id = o.created_by
    WHERE 1=1
  `;
  const params = [];

  // Status filtering
  if (status && status !== 'ALL') {
    if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
      query += ` AND o.status = 'PENDING_APPROVAL'`;
    } else if (status === 'HISTORY') {
      query += ` AND o.status IN ('APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'REJECTED', 'EXPIRED')`;
    } else {
      query += ` AND o.status = ?`;
      params.push(status);
    }
  }

  // Search keyword (offer_code, candidate_name, email, job_title)
  if (search && search.trim()) {
    const kw = `%${search.trim()}%`;
    query += ` AND (o.offer_code LIKE ? OR c.full_name LIKE ? OR c.email LIKE ? OR o.job_title LIKE ?)`;
    params.push(kw, kw, kw, kw);
  }

  // Department filter
  if (departmentId) {
    query += ` AND o.department_id = ?`;
    params.push(departmentId);
  }

  // Recruiter specific
  if (recruiterId) {
    query += ` AND o.created_by = ?`;
    params.push(recruiterId);
  }

  // Order by PENDING_APPROVAL first, then newest
  query += ` ORDER BY CASE WHEN o.status = 'PENDING_APPROVAL' THEN 0 ELSE 1 END, o.created_at DESC`;

  const [rows] = await pool.query(query, params);
  return rows;
}

async function getOfferById(id) {
  const [rows] = await pool.query(`
    SELECT 
      o.*,
      COALESCE(o.salary_amount, o.basic_salary) AS salary_amount,
      COALESCE(o.start_date, o.expected_start_date) AS start_date,
      c.full_name AS candidate_name,
      c.email AS candidate_email,
      c.phone AS candidate_phone,
      c.application_code,
      c.resume_url,
      d.department_name,
      p.position_name,
      u.full_name AS creator_name,
      u.company_email AS creator_email
    FROM candidate_offers o
    LEFT JOIN candidates c ON c.id = o.candidate_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    LEFT JOIN job_positions p ON p.position_id = o.position_id
    LEFT JOIN users u ON u.user_id = o.created_by
    WHERE o.id = ?
    LIMIT 1
  `, [id]);

  if (!rows.length) return null;
  const offer = rows[0];

  // Fetch approvals history
  const [approvals] = await pool.query(`
    SELECT 
      oa.id,
      oa.offer_id,
      oa.approver_id,
      oa.action,
      oa.reason,
      oa.action_at,
      u.full_name AS approver_name,
      u.job_title AS approver_job_title
    FROM offer_approvals oa
    LEFT JOIN users u ON u.user_id = oa.approver_id
    WHERE oa.offer_id = ?
    ORDER BY oa.action_at DESC
  `, [id]);

  offer.approvals = approvals;

  // Fetch onboarding details if accepted
  const [onboardings] = await pool.query(`
    SELECT 
      onb.*,
      u.full_name AS hr_in_charge_name
    FROM candidate_onboardings onb
    LEFT JOIN users u ON u.user_id = onb.hr_in_charge_id
    WHERE onb.offer_id = ?
    LIMIT 1
  `, [id]);

  offer.onboarding = onboardings[0] || null;

  return offer;
}

async function recordApprovalAction({ offerId, approverId, action, reason = null }) {
  const [result] = await pool.execute(`
    INSERT INTO offer_approvals (offer_id, approver_id, action, reason, action_at)
    VALUES (?, ?, ?, ?, NOW())
  `, [offerId, approverId, action, reason || null]);
  return result.insertId;
}

async function updateOfferStatus(id, status, fields = {}) {
  const updates = ['status = ?', 'updated_at = NOW()'];
  const values = [status];

  if (fields.approved_at !== undefined) {
    updates.push('approved_at = ?');
    values.push(fields.approved_at);
  }
  if (fields.sent_to_candidate_at !== undefined) {
    updates.push('sent_to_candidate_at = ?');
    values.push(fields.sent_to_candidate_at);
  }
  if (fields.responded_at !== undefined) {
    updates.push('responded_at = ?');
    values.push(fields.responded_at);
  }
  if (fields.candidate_response !== undefined) {
    updates.push('candidate_response = ?');
    values.push(fields.candidate_response);
  }

  values.push(id);
  const sql = `UPDATE candidate_offers SET ${updates.join(', ')} WHERE id = ?`;
  const [result] = await pool.execute(sql, values);
  return result.affectedRows > 0;
}

async function createOnboarding({ offerId, candidateId, hrInChargeId, officialStartDate, checklistNotes = null }) {
  const [result] = await pool.execute(`
    INSERT INTO candidate_onboardings (
      offer_id, candidate_id, hr_in_charge_id, official_start_date, status, checklist_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'PREPARING', ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      official_start_date = VALUES(official_start_date),
      status = 'PREPARING',
      updated_at = NOW()
  `, [offerId, candidateId, hrInChargeId, officialStartDate, checklistNotes || null]);
  return result.insertId;
}

async function getOnboardings() {
  const [rows] = await pool.query(`
    SELECT 
      onb.*,
      c.full_name AS candidate_name,
      c.email AS candidate_email,
      c.phone AS candidate_phone,
      o.offer_code,
      o.job_title,
      o.basic_salary,
      d.department_name,
      p.position_name,
      u.full_name AS hr_name
    FROM candidate_onboardings onb
    JOIN candidate_offers o ON o.id = onb.offer_id
    JOIN candidates c ON c.id = onb.candidate_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    LEFT JOIN job_positions p ON p.position_id = o.position_id
    LEFT JOIN users u ON u.user_id = onb.hr_in_charge_id
    ORDER BY onb.official_start_date ASC
  `);
  return rows;
}

module.exports = {
  getOffers,
  getOfferById,
  recordApprovalAction,
  updateOfferStatus,
  createOnboarding,
  getOnboardings
};
