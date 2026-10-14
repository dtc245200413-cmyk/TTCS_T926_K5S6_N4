/**
 * approvalWorkflowRepository.js
 * Cấu hình chuỗi cấp duyệt (approval_workflows) và snapshot các bước duyệt của
 * từng yêu cầu tuyển dụng (recruitment_request_approval_steps).
 */

const { pool } = require('../config/database');

// ── Cấu hình ───────────────────────────────────────────────────────────────

async function findAllLevels() {
  const [rows] = await pool.query(`
    SELECT w.*, d.department_name, d.department_code, r.role_name AS approver_role_name,
           u.full_name AS updated_by_name
    FROM approval_workflows w
    LEFT JOIN departments d ON d.department_id = w.department_id
    LEFT JOIN roles r ON r.role_code = w.approver_role_code
    LEFT JOIN users u ON u.user_id = w.updated_by
    ORDER BY (w.department_id IS NOT NULL), d.department_name, w.step_number
  `);
  return rows;
}

async function findLevelsByScope(departmentId) {
  const [rows] = departmentId
    ? await pool.query(`SELECT * FROM approval_workflows WHERE department_id = ? ORDER BY step_number`, [departmentId])
    : await pool.query(`SELECT * FROM approval_workflows WHERE department_id IS NULL ORDER BY step_number`);
  return rows;
}

async function replaceScope(departmentId, levels, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (departmentId) {
      await conn.query(`DELETE FROM approval_workflows WHERE department_id = ?`, [departmentId]);
    } else {
      await conn.query(`DELETE FROM approval_workflows WHERE department_id IS NULL`);
    }
    for (const lv of levels) {
      await conn.execute(
        `INSERT INTO approval_workflows
           (department_id, step_number, step_name, step_description, approver_role_code, min_salary, max_salary, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [departmentId || null, lv.step_number, lv.step_name || null, lv.step_description || null,
          lv.approver_role_code, lv.min_salary ?? 0, lv.max_salary ?? null, userId]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteScope(departmentId) {
  await pool.query(`DELETE FROM approval_workflows WHERE department_id = ?`, [departmentId]);
}

async function countActiveUsersByRole(roleCode) {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT u.user_id) AS c
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.user_id
     JOIN roles r ON r.role_id = ur.role_id
     WHERE u.status = 'ACTIVE' AND r.role_code = ?`,
    [roleCode]
  );
  return rows[0].c;
}

async function findRolesByCodes(codes) {
  if (!codes.length) return [];
  const [rows] = await pool.query(
    `SELECT role_code, role_name FROM roles WHERE role_code IN (${codes.map(() => '?').join(',')})`,
    codes
  );
  return rows;
}

async function findActiveRoles() {
  const [rows] = await pool.query(`
    SELECT r.role_code, r.role_name, COUNT(DISTINCT u.user_id) AS active_users
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.role_id
    JOIN users u ON u.user_id = ur.user_id
    WHERE u.status = 'ACTIVE'
    GROUP BY r.role_id, r.role_code, r.role_name
    ORDER BY r.role_name
  `);
  return rows;
}

// ── Snapshot các bước duyệt của yêu cầu ───────────────────────────────────

async function findStepsByRequest(requestId, conn = pool) {
  const [rows] = await conn.query(`
    SELECT s.*, r.role_name AS approver_role_name, u.full_name AS acted_by_name
    FROM recruitment_request_approval_steps s
    LEFT JOIN roles r ON r.role_code = s.approver_role_code
    LEFT JOIN users u ON u.user_id = s.acted_by
    WHERE s.recruitment_request_id = ?
    ORDER BY s.step_number, s.id
  `, [requestId]);
  return rows;
}

async function insertSteps(requestId, steps, conn = pool) {
  for (let i = 0; i < steps.length; i += 1) {
    const s = steps[i];
    await conn.execute(
      `INSERT INTO recruitment_request_approval_steps
         (recruitment_request_id, step_number, step_name, approver_role_code, threshold_min, threshold_max, is_escalated, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, s.step_number, s.step_name || null, s.approver_role_code,
        s.min_salary ?? null, s.max_salary ?? null, s.is_escalated ? 1 : 0, i === 0 ? 'PENDING' : 'WAITING']
    );
  }
}

async function updateStep(stepId, { status, actedBy = null, comment = null }, conn = pool) {
  await conn.execute(
    `UPDATE recruitment_request_approval_steps
     SET status = ?, acted_by = ?, acted_at = ${actedBy ? 'NOW()' : 'NULL'}, comment = ?
     WHERE id = ?`,
    [status, actedBy, comment, stepId]
  );
}

async function skipRemainingSteps(requestId, conn = pool) {
  await conn.execute(
    `UPDATE recruitment_request_approval_steps SET status = 'SKIPPED'
     WHERE recruitment_request_id = ? AND status IN ('WAITING', 'PENDING')`,
    [requestId]
  );
}

/** Bước đang chờ duyệt của nhiều yêu cầu (dùng cho danh sách duyệt). */
async function findPendingStepsForRequests(requestIds) {
  if (!requestIds.length) return [];
  const [rows] = await pool.query(`
    SELECT s.*, r.role_name AS approver_role_name,
           (SELECT COUNT(*) FROM recruitment_request_approval_steps x WHERE x.recruitment_request_id = s.recruitment_request_id) AS total_steps
    FROM recruitment_request_approval_steps s
    LEFT JOIN roles r ON r.role_code = s.approver_role_code
    WHERE s.status = 'PENDING' AND s.recruitment_request_id IN (${requestIds.map(() => '?').join(',')})
  `, requestIds);
  return rows;
}

module.exports = {
  findAllLevels,
  findLevelsByScope,
  replaceScope,
  deleteScope,
  countActiveUsersByRole,
  findRolesByCodes,
  findActiveRoles,
  findStepsByRequest,
  insertSteps,
  updateStep,
  skipRemainingSteps,
  findPendingStepsForRequests,
};
