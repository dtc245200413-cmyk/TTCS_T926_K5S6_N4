const { pool } = require('../config/database');

const postingSelect = `
  SELECT jp.*, rr.department_id, d.department_name, rr.position_id,
         pos.position_name, rr.headcount, rr.proposed_salary_min, rr.proposed_salary_max,
      loc.name AS location_name, wt.name AS work_type_name,
      creator.full_name AS created_by_name, submitter.full_name AS submitted_by_name,
      reviewer.full_name AS reviewed_by_name, publisher.full_name AS published_by_name
  FROM job_postings jp
  JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
  LEFT JOIN departments d ON d.department_id = rr.department_id
  LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
  LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
  LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
  LEFT JOIN users creator ON creator.user_id = jp.created_by
  LEFT JOIN users submitter ON submitter.user_id = jp.submitted_by
  LEFT JOIN users reviewer ON reviewer.user_id = jp.reviewed_by
  LEFT JOIN users publisher ON publisher.user_id = jp.published_by
`;

async function findEligibleRequests() {
  const [rows] = await pool.query(`
    SELECT rr.*, d.department_name, pos.position_name,
           loc.name AS location_name, wt.name AS work_type_name
    FROM recruitment_requests rr
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE rr.status = 'APPROVED'
      AND NOT EXISTS (
        SELECT 1 FROM job_postings jp
        WHERE jp.recruitment_request_id = rr.id
          AND jp.status IN ('PENDING_REVIEW', 'APPROVED', 'PUBLISHED')
      )
    ORDER BY rr.updated_at DESC
  `);
  return rows;
}

async function findAll(status = '') {
  const where = status ? 'WHERE jp.status = ?' : '';
  const [rows] = await pool.query(`${postingSelect} ${where} ORDER BY jp.updated_at DESC`, status ? [status] : []);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(`${postingSelect} WHERE jp.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findApprovedRequest(id) {
  const [rows] = await pool.execute(`
    SELECT rr.*, d.department_name, pos.position_name,
           loc.name AS location_name, wt.name AS work_type_name
    FROM recruitment_requests rr
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE rr.id = ? AND rr.status = 'APPROVED'
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function hasActivePostingForRequest(requestId) {
  const [rows] = await pool.execute(
    `SELECT id FROM job_postings WHERE recruitment_request_id = ? AND status IN ('PENDING_REVIEW', 'APPROVED', 'PUBLISHED') LIMIT 1`,
    [requestId]
  );
  return rows.length > 0;
}

async function create(data) {
  const [result] = await pool.execute(`
    INSERT INTO job_postings
      (recruitment_request_id, title, description, requirements, benefits, work_location, job_type, salary_display, deadline, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
  `, [
    data.recruitment_request_id,
    data.title,
    data.description,
    data.requirements,
    data.benefits,
    data.work_location,
    data.job_type,
    data.salary_display,
    data.deadline,
    data.created_by
  ]);
  return result.insertId;
}

async function submit(id, userId) {
  await pool.execute(
    `UPDATE job_postings SET status = 'PENDING_REVIEW', submitted_by = ?, submitted_at = NOW(), review_note = NULL WHERE id = ?`,
    [userId, id]
  );
}

async function updateDraft(id, data) {
  await pool.execute(`
    UPDATE job_postings
    SET title = ?, description = ?, requirements = ?, benefits = ?, deadline = ?, review_note = NULL
    WHERE id = ?
  `, [data.title, data.description, data.requirements, data.benefits, data.deadline, id]);
}

async function review(id, { status, note, userId }) {
  await pool.execute(
    `UPDATE job_postings SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [status, note, userId, id]
  );
}

async function publish(id, userId) {
  await pool.execute(
    `UPDATE job_postings SET status = 'PUBLISHED', published_by = ?, published_at = NOW(), closed_at = NULL WHERE id = ?`,
    [userId, id]
  );
}

async function findPublic({ search = '', departmentId = '', location = '', workType = '' } = {}) {
  const conditions = ["jp.status = 'PUBLISHED'", '(jp.deadline IS NULL OR jp.deadline >= CURDATE())'];
  const params = [];
  if (search.trim()) {
    conditions.push('(jp.title LIKE ? OR jp.description LIKE ? OR jp.requirements LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (departmentId) {
    conditions.push('rr.department_id = ?');
    params.push(departmentId);
  }
  if (location) {
    conditions.push('(rr.work_location_code = ? OR loc.name = ?)');
    params.push(location, location);
  }
  if (workType) {
    conditions.push('(rr.work_type_code = ? OR wt.name = ?)');
    params.push(workType, workType);
  }
  const [rows] = await pool.query(`
    SELECT jp.id, jp.title, jp.description, jp.requirements, jp.benefits,
           jp.work_location, jp.job_type, jp.salary_display, jp.deadline, jp.published_at,
           rr.headcount, rr.department_id, d.department_name, pos.position_name,
           COALESCE(loc.name, jp.work_location) AS location_name,
           COALESCE(wt.name, jp.job_type) AS work_type_name
    FROM job_postings jp
    JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE ${conditions.join(' AND ')}
    ORDER BY jp.published_at DESC
  `, params);
  return rows;
}

async function findPublicById(id) {
  const [rows] = await pool.execute(`
    SELECT jp.id, jp.title, jp.description, jp.requirements, jp.benefits,
           jp.work_location, jp.job_type, jp.salary_display, jp.deadline, jp.published_at,
           rr.id AS recruitment_request_id, rr.headcount, rr.department_id,
           d.department_name, pos.position_name,
           COALESCE(loc.name, jp.work_location) AS location_name,
           COALESCE(wt.name, jp.job_type) AS work_type_name
    FROM job_postings jp
    JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE jp.id = ? AND jp.status = 'PUBLISHED'
      AND (jp.deadline IS NULL OR jp.deadline >= CURDATE())
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

module.exports = {
  findEligibleRequests,
  findAll,
  findById,
  findApprovedRequest,
  hasActivePostingForRequest,
  create,
  updateDraft,
  submit,
  review,
  publish,
  findPublic,
  findPublicById
};