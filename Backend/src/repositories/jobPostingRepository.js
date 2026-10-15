const { pool } = require('../config/database');

const postingSelect = `
  SELECT jp.*, COALESCE(jp.department_id, rr.department_id) AS department_id,
         d.department_name, rr.position_id,
         pos.position_name, rr.headcount, rr.proposed_salary_min, rr.proposed_salary_max,
      COALESCE(loc.name, jp.work_location) AS location_name,
      COALESCE(wt.name, jp.job_type) AS work_type_name,
      creator.full_name AS created_by_name, submitter.full_name AS submitted_by_name,
      reviewer.full_name AS reviewed_by_name, publisher.full_name AS published_by_name,
      hiddenBy.full_name AS hidden_by_name,
      CASE WHEN jp.deadline IS NOT NULL AND jp.deadline < CURDATE() THEN 1 ELSE 0 END AS is_expired
  FROM job_postings jp
  LEFT JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
  LEFT JOIN departments d ON d.department_id = COALESCE(jp.department_id, rr.department_id)
  LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
  LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
  LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
  LEFT JOIN users creator ON creator.user_id = jp.created_by
  LEFT JOIN users submitter ON submitter.user_id = jp.submitted_by
  LEFT JOIN users reviewer ON reviewer.user_id = jp.reviewed_by
  LEFT JOIN users publisher ON publisher.user_id = jp.published_by
  LEFT JOIN users hiddenBy ON hiddenBy.user_id = jp.hidden_by
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
          AND jp.status IN ('PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'HIDDEN')
      )
    ORDER BY rr.updated_at DESC
  `);
  return rows;
}

async function findAll(status = '') {
  let where = '';
  const params = [];
  if (status === 'EXPIRED') {
    where = "WHERE (jp.status = 'EXPIRED' OR (jp.deadline IS NOT NULL AND jp.deadline < CURDATE() AND jp.status IN ('PUBLISHED', 'HIDDEN')))";
  } else if (status) {
    where = 'WHERE jp.status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(`${postingSelect} ${where} ORDER BY jp.updated_at DESC`, params);
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
    `SELECT id FROM job_postings WHERE recruitment_request_id = ? AND status IN ('PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'HIDDEN') LIMIT 1`,
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

async function hide(id, userId) {
  await pool.execute(
    `UPDATE job_postings SET status = 'HIDDEN', hidden_at = NOW(), hidden_by = ? WHERE id = ?`,
    [userId, id]
  );
}

async function unhide(id) {
  await pool.execute(
    `UPDATE job_postings SET status = 'PUBLISHED', hidden_at = NULL, hidden_by = NULL WHERE id = ?`,
    [id]
  );
}

async function close(id) {
  await pool.execute(
    `UPDATE job_postings SET status = 'CLOSED', closed_at = NOW() WHERE id = ?`,
    [id]
  );
}

async function findPublic({ search = '', departmentId = '', location = '', workType = '' } = {}) {
  const conditions = ["jp.status = 'PUBLISHED'", '(jp.deadline IS NULL OR jp.deadline >= CURDATE())'];
  const params = [];
  if (search && search.trim()) {
    conditions.push('(jp.title LIKE ? OR jp.description LIKE ? OR jp.requirements LIKE ? OR jp.benefits LIKE ? OR pos.position_name LIKE ? OR d.department_name LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (departmentId) {
    conditions.push('COALESCE(jp.department_id, rr.department_id) = ?');
    params.push(departmentId);
  }
  if (location && location.trim()) {
    conditions.push('(rr.work_location_code = ? OR loc.name = ? OR jp.work_location = ? OR loc.name LIKE ? OR jp.work_location LIKE ?)');
    const locTerm = `%${location.trim()}%`;
    params.push(location.trim(), location.trim(), location.trim(), locTerm, locTerm);
  }
  if (workType && workType.trim()) {
    conditions.push('(rr.work_type_code = ? OR wt.name = ? OR jp.job_type = ? OR wt.name LIKE ? OR jp.job_type LIKE ?)');
    const wtTerm = `%${workType.trim()}%`;
    params.push(workType.trim(), workType.trim(), workType.trim(), wtTerm, wtTerm);
  }
  const [rows] = await pool.query(`
    SELECT jp.id, jp.title, jp.description, jp.requirements, jp.benefits,
           jp.work_location, jp.job_type, jp.salary_display, jp.deadline, jp.published_at,
           rr.headcount, COALESCE(jp.department_id, rr.department_id) AS department_id,
           COALESCE(d.department_name, 'TechCorp') AS department_name, pos.position_name,
           COALESCE(loc.name, jp.work_location) AS location_name,
           COALESCE(wt.name, jp.job_type) AS work_type_name
    FROM job_postings jp
    LEFT JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = COALESCE(jp.department_id, rr.department_id)
    LEFT JOIN job_positions pos ON pos.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE ${conditions.join(' AND ')}
    ORDER BY jp.published_at DESC, jp.id DESC
  `, params);
  return rows;
}

async function findPublicFilterOptions() {
  const [departments] = await pool.query(`
    SELECT DISTINCT d.department_id AS id, d.department_name AS name, COUNT(jp.id) AS count
    FROM departments d
    JOIN job_postings jp ON COALESCE(jp.department_id, (SELECT department_id FROM recruitment_requests WHERE id = jp.recruitment_request_id)) = d.department_id
    WHERE jp.status = 'PUBLISHED' AND (jp.deadline IS NULL OR jp.deadline >= CURDATE())
    GROUP BY d.department_id, d.department_name
    ORDER BY d.department_name ASC
  `);

  const [locations] = await pool.query(`
    SELECT DISTINCT COALESCE(loc.name, jp.work_location) AS name, COUNT(jp.id) AS count
    FROM job_postings jp
    LEFT JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    WHERE jp.status = 'PUBLISHED' AND (jp.deadline IS NULL OR jp.deadline >= CURDATE())
      AND (loc.name IS NOT NULL OR jp.work_location IS NOT NULL)
    GROUP BY COALESCE(loc.name, jp.work_location)
    ORDER BY name ASC
  `);

  const [workTypes] = await pool.query(`
    SELECT DISTINCT COALESCE(wt.name, jp.job_type) AS name, COUNT(jp.id) AS count
    FROM job_postings jp
    LEFT JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN master_data wt ON wt.category_group = 'WORK_TYPE' AND wt.code = rr.work_type_code
    WHERE jp.status = 'PUBLISHED' AND (jp.deadline IS NULL OR jp.deadline >= CURDATE())
      AND (wt.name IS NOT NULL OR jp.job_type IS NOT NULL)
    GROUP BY COALESCE(wt.name, jp.job_type)
    ORDER BY name ASC
  `);

  return { departments, locations, workTypes };
}

async function findPublicById(id) {
  const [rows] = await pool.execute(`
    SELECT jp.id, jp.title, jp.description, jp.requirements, jp.benefits,
           jp.work_location, jp.job_type, jp.salary_display, jp.deadline, jp.published_at,
           rr.id AS recruitment_request_id, rr.headcount,
           COALESCE(jp.department_id, rr.department_id) AS department_id,
           COALESCE(d.department_name, 'TechCorp') AS department_name, pos.position_name,
           COALESCE(loc.name, jp.work_location) AS location_name,
           COALESCE(wt.name, jp.job_type) AS work_type_name
    FROM job_postings jp
    LEFT JOIN recruitment_requests rr ON rr.id = jp.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = COALESCE(jp.department_id, rr.department_id)
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
  hide,
  unhide,
  close,
  findPublic,
  findPublicFilterOptions,
  findPublicById
};
