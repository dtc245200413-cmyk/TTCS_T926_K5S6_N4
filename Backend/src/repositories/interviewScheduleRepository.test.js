jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const repository = require('./interviewScheduleRepository');
const service = require('../services/interviewScheduleService');

beforeEach(() => jest.resetAllMocks());

describe('transaction lifecycle', () => {
  let connection;
  beforeEach(() => {
    connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(), execute: jest.fn() };
    pool.getConnection.mockResolvedValue(connection);
  });
  it('begins and commits work on one connection and releases it', async () => {
    await expect(repository.withTransaction(async conn => { expect(conn).toBe(connection); return 123; })).resolves.toBe(123);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
  it('rolls back a conflict and releases without committing', async () => {
    const error = Object.assign(new Error('conflict'), { statusCode: 409 });
    await expect(repository.withTransaction(async () => { throw error; })).rejects.toBe(error);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
  });
  it('retries a rolled-back deadlock then commits', async () => {
    const work = jest.fn().mockRejectedValueOnce({ code: 'ER_LOCK_DEADLOCK' }).mockResolvedValueOnce('ok');
    await expect(repository.withTransaction(work)).resolves.toBe('ok');
    expect(pool.getConnection).toHaveBeenCalledTimes(2);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(2);
  });
  it('caps deadlock retries at three transactions', async () => {
    const error = { code: 'ER_LOCK_DEADLOCK' };
    await expect(repository.withTransaction(async () => { throw error; })).rejects.toBe(error);
    expect(connection.rollback).toHaveBeenCalledTimes(3);
    expect(connection.release).toHaveBeenCalledTimes(3);
  });
  it('does not retry uncertain commit failures', async () => {
    const error = { code: 'ECONNRESET' };
    connection.commit.mockRejectedValue(error);
    connection.rollback.mockRejectedValue(new Error('connection lost'));
    await expect(repository.withTransaction(async () => 'ok')).rejects.toBe(error);
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});

describe('locking and write SQL', () => {
  const connection = { execute: jest.fn() };
  beforeEach(() => connection.execute.mockReset());
  it('locks the actual user and room rows, not just existing schedule rows', async () => {
    connection.execute.mockResolvedValueOnce([[{ user_id: 3, status: 'ACTIVE' }]])
      .mockResolvedValueOnce([[{ role_code: 'INTERVIEWER' }]])
      .mockResolvedValueOnce([[{ id: 4, category_group: 'INTERVIEW_ROOM', is_active: 1 }]]);
    await expect(repository.lockInterviewer(3, connection)).resolves.toMatchObject({ role_codes: ['INTERVIEWER'] });
    await repository.lockRoom(4, connection);
    expect(connection.execute.mock.calls[0]).toEqual([expect.stringContaining('users WHERE user_id = ? FOR UPDATE'), [3]]);
    expect(connection.execute.mock.calls[2]).toEqual([expect.stringContaining('master_data WHERE id = ? FOR UPDATE'), [4]]);
  });
  it('uses strict overlap, ignores cancelled rows, excludes edited ID and uses a current read', async () => {
    connection.execute.mockResolvedValue([[]]);
    const data = { interviewer_id: 3, room_id: 4, start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 04:00:00' };
    await repository.findConflicts(data, 10, connection);
    const [sql, params] = connection.execute.mock.calls[0];
    expect(sql).toContain("s.status = 'SCHEDULED'");
    expect(sql).toContain('(s.interviewer_id = ? OR s.room_id = ?)');
    expect(sql).toContain('s.start_at < ? AND s.end_at > ?');
    expect(sql).toContain('s.id <> ?');
    expect(sql).toContain('FOR UPDATE');
    expect(params).toEqual([3, 4, data.end_at, data.start_at, 10]);
  });
  it('locks the edited/cancelled schedule and preserves UTC strings without driver timezone conversion', async () => {
    connection.execute.mockResolvedValue([[{ id: 10 }]]);
    await repository.findForUpdate(10, connection);
    expect(connection.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(connection.execute.mock.calls[0][0]).toContain("DATE_FORMAT(start_at, '%Y-%m-%d %H:%i:%s')");
  });
  it('inserts SCHEDULED and writes only whitelisted update fields plus trusted actor', async () => {
    connection.execute.mockResolvedValue([{ insertId: 10 }]);
    const data = { candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4, start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 04:00:00', created_by: 999 };
    await repository.insert(data, 7, connection);
    await repository.update(10, data, 7, connection);
    expect(connection.execute.mock.calls[0][0]).toContain("'SCHEDULED'");
    expect(connection.execute.mock.calls[0][1]).toEqual([1, 2, 3, 4, data.start_at, data.end_at, 7]);
    expect(connection.execute.mock.calls[1][1]).toEqual([2, 3, 4, data.start_at, data.end_at, 7, 10]);
    expect(connection.execute.mock.calls[1][0]).not.toContain('created_by');
  });
  it('cancels with an UPDATE, never a physical DELETE', async () => {
    connection.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await repository.cancel(10, 7, connection);
    expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining("SET status = 'CANCELLED', updated_by = ?"), [7, 10]);
  });
});

describe('scoped reads and safe options', () => {
  beforeEach(() => pool.execute.mockResolvedValue([[]]));
  it('ANDs authenticated interviewer scope with requested filters', async () => {
    await repository.getAll({ interviewer_id: 999, from: '2026-10-13 03:00:00', to: '2026-10-13 04:00:00' }, { type: 'interviewer', userId: 7 });
    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toContain('WHERE s.interviewer_id = ? AND s.interviewer_id = ?');
    expect(params).toEqual([7, 999, '2026-10-13 03:00:00', '2026-10-13 04:00:00']);
  });
  it('restricts detail to authenticated interviewer', async () => {
    await repository.findById(10, { type: 'interviewer', userId: 7 });
    expect(pool.execute.mock.calls[0][0]).toContain('WHERE s.id = ? AND s.interviewer_id = ?');
    expect(pool.execute.mock.calls[0][1]).toEqual([10, 7]);
  });
  it('uses candidate recruitment request department for Hiring Manager', async () => {
    await repository.getAll({}, { type: 'department', departmentId: 2 });
    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toContain('scoped_candidate.id = s.candidate_id AND r.department_id = ?');
    expect(sql).toContain('r.id = scoped_candidate.recruitment_request_id');
    expect(params).toEqual([2]);
  });
  it('never falls back to an unscoped query when department SQL fails', async () => {
    const error = { code: 'ER_NO_SUCH_TABLE' };
    pool.execute.mockRejectedValueOnce(error);
    await expect(repository.getAll({}, { type: 'department', departmentId: 2 })).rejects.toBe(error);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });
  it('refuses an unspecified scope', async () => {
    await expect(repository.getAll({}, {})).rejects.toThrow('Missing interview access scope');
    expect(pool.execute).not.toHaveBeenCalled();
  });
  it('keeps inactive rooms/users visible in historical schedules', async () => {
    const historical = { id: 10, room_is_active: 0, status: 'CANCELLED' };
    pool.execute.mockResolvedValueOnce([[historical]]);
    await expect(repository.findById(10, { type: 'all' })).resolves.toEqual(historical);
    const sql = pool.execute.mock.calls[0][0];
    expect(sql).not.toContain('room.is_active =');
    expect(sql).not.toContain("u.status = 'ACTIVE'");
    expect(sql).toContain("'%Y-%m-%dT%H:%i:%sZ'");
  });
  it('options selects only public interviewer identity, active users with eligible roles, and active INTERVIEW_ROOM entries', async () => {
    const result = await repository.getOptions();
    expect(Object.keys(result)).toEqual(['candidates', 'job_positions', 'interviewers', 'rooms']);
    const [userSql, roles] = pool.execute.mock.calls[2];
    expect(userSql).toContain('SELECT u.user_id, u.full_name, u.employee_code FROM users u');
    expect(userSql).toContain("u.status = 'ACTIVE'");
    expect(userSql).toContain('NOT EXISTS');
    expect(roles).toEqual(repository.interviewerRoles);
    expect(userSql).not.toMatch(/password|token|SELECT \*/i);
    expect(pool.execute.mock.calls[3][0]).toContain("category_group = 'INTERVIEW_ROOM' AND is_active = 1");
  });
});

describe('service + repository with a simulated MySQL connection', () => {
  // No DDL or writes against real MySQL. SQL contract checks above complement this
  // model of MySQL row matching; this is not a live InnoDB concurrency benchmark.
  let schedules;
  let connection;
  const body = { candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4, start_at: '2026-10-13T03:00:00Z', end_at: '2026-10-13T04:00:00Z' };
  const actor = { user_id: 7, roles: [{ role_code: 'RECRUITER' }] };
  beforeEach(() => {
    schedules = [];
    connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(), execute: jest.fn() };
    pool.getConnection.mockResolvedValue(connection);
    connection.execute.mockImplementation(async (sql, params) => {
      if (sql.startsWith('SELECT id FROM candidates')) return [[{ id: 1 }]];
      if (sql.startsWith('SELECT position_id')) return [[{ position_id: 2 }]];
      if (sql.startsWith('SELECT user_id')) return [[{ user_id: params[0], status: 'ACTIVE' }]];
      if (sql.includes('SELECT r.role_code')) return [[{ role_code: 'INTERVIEWER' }]];
      if (sql.startsWith('SELECT id, category_group')) return [[{ id: params[0], category_group: 'INTERVIEW_ROOM', is_active: 1 }]];
      if (sql.includes('SELECT s.id, s.interviewer_id, s.room_id')) {
        const [interviewer, room, end, start, excluded] = params;
        return [schedules.filter(item => item.status === 'SCHEDULED' && item.id !== excluded
          && (item.interviewer_id === interviewer || item.room_id === room) && item.start_at < end && item.end_at > start)];
      }
      if (sql.includes('INSERT INTO interview_schedules')) {
        const [candidate_id, position_id, interviewer_id, room_id, start_at, end_at, created_by] = params;
        const row = { id: schedules.length + 1, candidate_id, position_id, interviewer_id, room_id, start_at, end_at, created_by, status: 'SCHEDULED' };
        schedules.push(row);
        return [{ insertId: row.id }];
      }
      if (sql.includes('WHERE id = ? FOR UPDATE')) return [schedules.filter(item => item.id === params[0])];
      if (sql.includes("SET status = 'CANCELLED'")) { schedules.find(item => item.id === params[1]).status = 'CANCELLED'; return [{ affectedRows: 1 }]; }
      if (sql.includes('WHERE s.id = ?')) return [schedules.filter(item => item.id === params[0])];
      throw new Error(`Unexpected test SQL: ${sql}`);
    });
  });
  it('allows two adjacent intervals sharing both resources', async () => {
    await service.create(body, actor);
    await service.create({ ...body, start_at: body.end_at, end_at: '2026-10-13T05:00:00Z' }, actor);
    expect(schedules).toHaveLength(2);
    expect(connection.commit).toHaveBeenCalledTimes(2);
  });
  it('rejects partial overlap and rolls back without writing', async () => {
    await service.create(body, actor);
    await expect(service.create({ ...body, start_at: '2026-10-13T03:30:00Z', end_at: '2026-10-13T04:30:00Z' }, actor))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(schedules).toHaveLength(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
  });
  it('a cancelled schedule frees the interviewer and room for the same interval', async () => {
    const first = await service.create(body, actor);
    await service.cancel(first.id, {}, actor);
    await expect(service.create(body, actor)).resolves.toMatchObject({ status: 'SCHEDULED' });
    expect(schedules.map(item => item.status)).toEqual(['CANCELLED', 'SCHEDULED']);
  });
});
