const { pool } = require('../config/database');

async function getConfigs() {
  const [rows] = await pool.query('SELECT id, stage_code, max_days, is_active FROM sla_configs ORDER BY stage_code');
  return rows;
}

async function saveConfig({ stageCode, maxDays, isActive, userId }) {
  await pool.execute(`
    INSERT INTO sla_configs (stage_code, max_days, is_active, updated_by)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE max_days = VALUES(max_days), is_active = VALUES(is_active), updated_by = VALUES(updated_by)
  `, [stageCode, maxDays, isActive ? 1 : 0, userId]);
}

async function findOverdueCandidates() {
  const [rows] = await pool.query(`
        SELECT c.id, c.full_name, c.status AS stage_code,
          COALESCE(rr.recruiter_id, c.created_by) AS assigned_recruiter_id,
           cfg.max_days,
           GREATEST(TIMESTAMPDIFF(DAY, COALESCE(c.stage_changed_at, c.updated_at, c.created_at), NOW()) - cfg.max_days, 1) AS overdue_days
    FROM candidates c
    JOIN sla_configs cfg ON cfg.stage_code = c.status AND cfg.is_active = 1
        LEFT JOIN recruitment_requests rr ON rr.id = c.recruitment_request_id
    WHERE c.merged_into_id IS NULL
      AND c.status NOT IN ('HIRED', 'REJECTED', 'WITHDRAWN')
      AND TIMESTAMPDIFF(DAY, COALESCE(c.stage_changed_at, c.updated_at, c.created_at), NOW()) > cfg.max_days
    ORDER BY overdue_days DESC, c.created_at ASC
  `);
  return rows;
}

async function getRecipients(candidate, connection = pool) {
  if (candidate.assigned_recruiter_id) {
    const [assigned] = await connection.execute(
      `SELECT u.user_id
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.user_id
       JOIN roles r ON r.role_id = ur.role_id
       WHERE u.user_id = ? AND u.status = 'ACTIVE' AND r.role_code = 'RECRUITER'`,
      [candidate.assigned_recruiter_id]
    );
    if (assigned.length) return assigned.map(row => row.user_id);
  }

  const [rows] = await connection.query(`
    SELECT DISTINCT u.user_id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.status = 'ACTIVE' AND r.role_code = 'RECRUITER'
  `);
  return rows.map(row => row.user_id);
}

async function markOverdue(candidateId) {
  await pool.execute(
    'UPDATE candidates SET sla_overdue = 1, sla_flagged_at = COALESCE(sla_flagged_at, NOW()) WHERE id = ?',
    [candidateId]
  );
}

async function createReminder(candidateId, recipientId, stageCode, overdueDays, connection) {
  const [result] = await connection.execute(`
    INSERT IGNORE INTO sla_reminders (candidate_id, recipient_id, stage_code, reminder_date, overdue_days)
    VALUES (?, ?, ?, CURDATE(), ?)
  `, [candidateId, recipientId, stageCode, overdueDays]);
  return result.affectedRows > 0;
}

async function beginDailyRun(connection) {
  const [result] = await connection.execute(`
    INSERT IGNORE INTO scheduled_job_runs (job_name, run_date, trigger_type, started_at, status)
    VALUES ('candidate_sla_daily', CURDATE(), 'SCHEDULED', NOW(), 'RUNNING')
  `);
  if (result.affectedRows > 0) return { started: true, id: result.insertId };

  const [rows] = await connection.query(`
    SELECT id, status, TIMESTAMPDIFF(MINUTE, started_at, NOW()) AS minutes_running FROM scheduled_job_runs
    WHERE job_name = 'candidate_sla_daily' AND run_date = CURDATE()
    LIMIT 1 FOR UPDATE
  `);
  if (rows[0]?.status === 'SUCCESS') return { started: false, id: rows[0].id };
  if (rows[0]?.status === 'RUNNING' && Number(rows[0].minutes_running) < 30) {
    return { started: false, id: rows[0].id, reason: 'Kiểm tra SLA hôm nay đang chạy.' };
  }
  if (rows[0]) {
    await connection.execute(
      "UPDATE scheduled_job_runs SET started_at = NOW(), finished_at = NULL, status = 'RUNNING', summary = NULL WHERE id = ?",
      [rows[0].id]
    );
    return { started: true, id: rows[0].id };
  }
  return { started: false, id: null };
}

async function finishDailyRun(id, status, summary) {
  if (!id) return;
  await pool.execute(
    'UPDATE scheduled_job_runs SET finished_at = NOW(), status = ?, summary = ? WHERE id = ?',
    [status, JSON.stringify(summary), id]
  );
}

module.exports = {
  getConfigs,
  saveConfig,
  findOverdueCandidates,
  getRecipients,
  markOverdue,
  createReminder,
  beginDailyRun,
  finishDailyRun
};