const { pool } = require('../config/database');

const interviewerRoles = ['INTERVIEWER', 'HIRING_MANAGER', 'HR_MANAGER', 'RECRUITER', 'ADMIN'];
const rolePlaceholders = interviewerRoles.map(() => '?').join(', ');

async function withTransaction(work) {
  // InnoDB can detect deadlocks between overlapping edits/current conflict reads.
  // Retry only deadlocks (whose transaction is rolled back), never uncertain commit errors.
  for (let attempt = 0; attempt < 3; attempt++) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      try { await connection.rollback(); } catch (_) { /* Keep the original failure. */ }
      if (error.code !== 'ER_LOCK_DEADLOCK' || attempt === 2) throw error;
    } finally {
      connection.release();
    }
  }
}

async function supportsDepartmentScope() {
  const [rows] = await pool.execute(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recruitment_requests'
      AND COLUMN_NAME IN ('id', 'department_id')
  `);
  return rows.length === 2;
}

function scopeClause(scope, params) {
  if (scope.type === 'all') return '1 = 1';
  if (scope.type === 'interviewer') {
    params.push(scope.userId);
    return 's.interviewer_id = ?';
  }
  if (scope.type === 'department') {
    params.push(scope.departmentId);
    return `EXISTS (
      SELECT 1 FROM candidates scoped_candidate
      JOIN recruitment_requests r ON r.id = scoped_candidate.recruitment_request_id
      WHERE scoped_candidate.id = s.candidate_id AND r.department_id = ?
    )`;
  }
  throw new Error('Missing interview access scope');
}

const selectSchedule = `
  SELECT s.id, s.candidate_id, c.full_name AS candidate_name,
         s.position_id, p.position_name, s.interviewer_id, u.full_name AS interviewer_name,
         s.room_id, room.name AS room_name, room.is_active AS room_is_active,
         DATE_FORMAT(s.start_at, '%Y-%m-%dT%H:%i:%sZ') AS start_at,
         DATE_FORMAT(s.end_at, '%Y-%m-%dT%H:%i:%sZ') AS end_at,
         s.status, s.created_by, s.updated_by, s.created_at, s.updated_at
  FROM interview_schedules s
  JOIN candidates c ON c.id = s.candidate_id
  JOIN job_positions p ON p.position_id = s.position_id
  JOIN users u ON u.user_id = s.interviewer_id
  JOIN master_data room ON room.id = s.room_id
`;

async function getAll(filters, scope) {
  const params = [];
  const clauses = [scopeClause(scope, params)];
  for (const field of ['candidate_id', 'interviewer_id', 'room_id', 'status']) {
    if (filters[field] !== undefined) { clauses.push(`s.${field} = ?`); params.push(filters[field]); }
  }
  if (filters.from) { clauses.push('s.end_at > ?'); params.push(filters.from); }
  if (filters.to) { clauses.push('s.start_at < ?'); params.push(filters.to); }
  const [rows] = await pool.execute(`${selectSchedule} WHERE ${clauses.join(' AND ')} ORDER BY s.start_at ASC, s.id ASC`, params);
  return rows;
}

async function findById(id, scope, connection = pool) {
  const params = [id];
  const sql = `${selectSchedule} WHERE s.id = ? AND ${scopeClause(scope, params)}`;
  const [rows] = await connection.execute(sql, params);
  return rows[0] || null;
}

async function findForUpdate(id, connection) {
  const [rows] = await connection.execute(`
    SELECT id, candidate_id, position_id, interviewer_id, room_id, status,
           DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s') AS start_at,
           DATE_FORMAT(end_at, '%Y-%m-%d %H:%i:%s') AS end_at
    FROM interview_schedules WHERE id = ? FOR UPDATE
  `, [id]);
  return rows[0] || null;
}

async function candidateExists(id, connection) {
  const [rows] = await connection.execute('SELECT id FROM candidates WHERE id = ?', [id]);
  return rows.length > 0;
}

async function positionExists(id, connection) {
  const [rows] = await connection.execute('SELECT position_id FROM job_positions WHERE position_id = ?', [id]);
  return rows.length > 0;
}

async function lockInterviewer(id, connection) {
  const [rows] = await connection.execute('SELECT user_id, status FROM users WHERE user_id = ? FOR UPDATE', [id]);
  if (!rows.length) return null;
  const [roles] = await connection.execute(`
    SELECT r.role_code FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id WHERE ur.user_id = ?
  `, [id]);
  return { ...rows[0], role_codes: roles.map(role => role.role_code) };
}

async function lockRoom(id, connection) {
  const [rows] = await connection.execute(
    'SELECT id, category_group, is_active FROM master_data WHERE id = ? FOR UPDATE', [id]
  );
  return rows[0] || null;
}

async function findConflicts(data, excludeId, connection) {
  // This must be a locking/current read after resource locks, not a snapshot SELECT.
  // The parent user/room rows serialize reservations even when there are no schedules yet.
  const [rows] = await connection.execute(`
    SELECT s.id, s.interviewer_id, s.room_id FROM interview_schedules s
    WHERE s.status = 'SCHEDULED'
      AND (s.interviewer_id = ? OR s.room_id = ?)
      AND s.start_at < ? AND s.end_at > ?
      AND s.id <> ?
    FOR UPDATE
  `, [data.interviewer_id, data.room_id, data.end_at, data.start_at, excludeId || 0]);
  return rows;
}

async function insert(data, userId, connection) {
  const [result] = await connection.execute(`
    INSERT INTO interview_schedules
      (candidate_id, position_id, interviewer_id, room_id, start_at, end_at, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)
  `, [data.candidate_id, data.position_id, data.interviewer_id, data.room_id, data.start_at, data.end_at, userId]);
  return result.insertId;
}

async function update(id, data, userId, connection) {
  await connection.execute(`
    UPDATE interview_schedules SET position_id = ?, interviewer_id = ?, room_id = ?,
      start_at = ?, end_at = ?, updated_by = ? WHERE id = ?
  `, [data.position_id, data.interviewer_id, data.room_id, data.start_at, data.end_at, userId, id]);
}

async function cancel(id, userId, connection) {
  await connection.execute(
    "UPDATE interview_schedules SET status = 'CANCELLED', updated_by = ? WHERE id = ?", [userId, id]
  );
}

async function getOptions() {
  const results = await Promise.all([
    pool.execute('SELECT id, full_name, status FROM candidates ORDER BY full_name, id'),
    pool.execute('SELECT position_id, position_name, status FROM job_positions ORDER BY position_name, position_id'),
    pool.execute(`
      SELECT u.user_id, u.full_name, u.employee_code FROM users u
      WHERE u.status = 'ACTIVE'
        AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                    WHERE ur.user_id = u.user_id AND r.role_code IN (${rolePlaceholders}))
        AND NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_id = ur.role_id
                        WHERE ur.user_id = u.user_id AND r.role_code = 'CANDIDATE')
      ORDER BY u.full_name, u.user_id
    `, interviewerRoles),
    pool.execute("SELECT id, code, name FROM master_data WHERE category_group = 'INTERVIEW_ROOM' AND is_active = 1 ORDER BY display_order, name, id")
  ]);
  return { candidates: results[0][0], job_positions: results[1][0], interviewers: results[2][0], rooms: results[3][0] };
}

module.exports = {
  interviewerRoles, withTransaction, supportsDepartmentScope, getAll, findById, findForUpdate,
  candidateExists, positionExists, lockInterviewer, lockRoom, findConflicts, insert, update, cancel, getOptions
};
