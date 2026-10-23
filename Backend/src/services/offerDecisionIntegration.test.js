'use strict';

// Real scope/policy, SQL writer, audit writer and coordinator; only the SQL
// connection and the not-yet-implemented evidence readers are test doubles.
const { createVerifiedOfferDecisionTransaction } = require('./offerDecisionTransaction');
const { POLICY_CODE } = require('./offerDecisionWritePolicy');

const input = { actorUserId: 5, applicationId: 7, candidateId: 10,
  decision: 'PASSED', comment: 'Reviewed application' };

function setup() {
  const events = [];
  const row = { id: 7, candidate_id: 10, recruitment_request_id: 14,
    application_status: 'INTERVIEWING', department_id: 2, department_status: 'ACTIVE',
    department_manager_user_id: 5, actor_user_id: 5, actor_status: 'ACTIVE' };
  const conn = {
    beginTransaction: jest.fn(async () => events.push('begin')),
    query: jest.fn(async () => { events.push('scope'); return [[row]]; }),
    execute: jest.fn(async sql => {
      if (/SELECT id, application_id/.test(sql)) { events.push('duplicate'); return [[]]; }
      if (/INSERT INTO candidate_hiring_decisions/.test(sql)) {
        events.push('decision'); return [{ affectedRows: 1, insertId: 55 }];
      }
      if (/INSERT INTO audit_logs/.test(sql)) {
        events.push('audit'); return [{ affectedRows: 1, insertId: 66 }];
      }
      throw new Error('Unexpected SQL');
    }),
    commit: jest.fn(async () => events.push('commit')),
    rollback: jest.fn(async () => events.push('rollback')),
    release: jest.fn(() => events.push('release'))
  };
  const pool = { getConnection: jest.fn(async () => conn) };
  const identity = { verified: true, application_id: 7, candidate_id: 10, recruitment_request_id: 14 };
  const verifyLifecycle = jest.fn(async () => {
    events.push('lifecycle'); return { ...identity, status_version: 3, reference: 'lifecycle-record' };
  });
  const verifyEvaluation = jest.fn(async () => {
    events.push('evaluation'); return { ...identity, total_rounds_evaluated: 2,
      average_score: 8, reference: 'evaluation-record' };
  });
  const service = createVerifiedOfferDecisionTransaction({ pool, verifyLifecycle, verifyEvaluation });
  return { conn, pool, row, events, verifyLifecycle, verifyEvaluation, service };
}

function rolledBack(s) {
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
  expect(s.conn.commit).not.toHaveBeenCalled();
  expect(s.conn.release).toHaveBeenCalledTimes(1);
}

test.each(['PASSED', 'FAILED'])('composes all adapters for %s on one connection', async decision => {
  const s = setup();
  await expect(s.service.record({ ...input, decision })).resolves.toEqual({
    decision_id: 55, audit_id: 66, application_id: 7, candidate_id: 10, decision
  });
  expect(s.events).toEqual(['begin', 'scope', 'lifecycle', 'evaluation', 'duplicate', 'decision', 'audit', 'commit', 'release']);
  for (const verifier of [s.verifyLifecycle, s.verifyEvaluation]) {
    expect(verifier).toHaveBeenCalledWith(expect.objectContaining({ conn: s.conn, applicationId: 7, candidateId: 10 }));
  }
  const [scopeSql, scopeParams] = s.conn.query.mock.calls[0];
  expect(scopeSql).toContain("role.role_code = 'HIRING_MANAGER'");
  expect(scopeSql).toContain('d.manager_user_id = u.user_id');
  expect(scopeSql).toContain('FOR UPDATE');
  expect(scopeParams).toEqual([5, 7, 10]);
  const [duplicateSql, duplicateParams] = s.conn.execute.mock.calls[0];
  expect(duplicateSql).toContain('FOR UPDATE');
  expect(duplicateParams).toEqual([7, 10, 14]);
  const [sql, params] = s.conn.execute.mock.calls[1];
  expect(sql).toContain("1, 'CURRENT'");
  expect(params).toEqual([10, 14, 2, 5, decision, input.comment, 2, 8, 7, POLICY_CODE,
    'app:7;lifecycle:lifecycle-record;version:3;eval:evaluation-record']);
  expect(s.conn.execute.mock.calls[2][1]).toEqual([5, 5, 'HIRING_DECISION_RECORDED',
    'candidate_hiring_decisions', '55', expect.stringContaining('row_version=1'), null]);
});

test.each(['both', 'lifecycle', 'evaluation'])('missing %s verifier blocks connection acquisition', async missing => {
  const s = setup();
  const service = createVerifiedOfferDecisionTransaction({ pool: s.pool,
    verifyLifecycle: missing === 'evaluation' ? s.verifyLifecycle : undefined,
    verifyEvaluation: missing === 'lifecycle' ? s.verifyEvaluation : undefined });
  await expect(service.record(input)).rejects.toMatchObject({ statusCode: 503 });
  expect(s.pool.getConnection).not.toHaveBeenCalled();
});

test.each([
  ['wrong manager', { department_manager_user_id: 6 }],
  ['wrong application', { id: 8 }],
  ['wrong candidate', { candidate_id: 11 }],
  ['inactive actor', { actor_status: 'INACTIVE' }],
  ['inactive department', { department_status: 'INACTIVE' }]
])('%s fails before evidence or writes', async (_, changed) => {
  const s = setup(); Object.assign(s.row, changed);
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 403 });
  expect(s.verifyLifecycle).not.toHaveBeenCalled();
  expect(s.conn.execute).not.toHaveBeenCalled(); rolledBack(s);
});

test('missing scoped HIRING_MANAGER row cannot be replaced by caller roles', async () => {
  const s = setup(); s.conn.query.mockResolvedValueOnce([[]]);
  await expect(s.service.record({ ...input, roles: ['ADMIN', 'HR_MANAGER'] }))
    .rejects.toMatchObject({ statusCode: 403 });
  expect(s.conn.execute).not.toHaveBeenCalled(); rolledBack(s);
});

test.each(['verifyLifecycle', 'verifyEvaluation'])('%s rejects evidence for another application', async name => {
  const s = setup(); s[name].mockResolvedValueOnce({ verified: true, application_id: 99 });
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 503 });
  expect(s.conn.execute).not.toHaveBeenCalled(); rolledBack(s);
});

test('existing decision is never overwritten', async () => {
  const s = setup(); s.conn.execute.mockResolvedValueOnce([[{ id: 22 }]]);
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 409 });
  expect(s.conn.execute).toHaveBeenCalledTimes(1); rolledBack(s);
});

test.each(['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'])('%s rolls back with sanitized conflict', async code => {
  const s = setup();
  s.conn.execute.mockResolvedValueOnce([[]]).mockRejectedValueOnce(Object.assign(new Error('private SQL data'), { code }));
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 409, message: expect.not.stringContaining('private') });
  expect(s.conn.execute).toHaveBeenCalledTimes(2); rolledBack(s);
});

test.each(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'])('%s is a sanitized dependency failure', async code => {
  const s = setup(); s.conn.query.mockRejectedValueOnce(Object.assign(new Error('private SQL'), { code }));
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 503, message: expect.not.stringContaining('private') });
  expect(s.conn.execute).not.toHaveBeenCalled(); rolledBack(s);
});

test('audit failure after INSERT rolls back the decision', async () => {
  const s = setup();
  s.conn.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1, insertId: 55 }])
    .mockRejectedValueOnce(new Error('audit unavailable'));
  await expect(s.service.record(input)).rejects.toThrow('audit unavailable');
  expect(s.conn.execute).toHaveBeenCalledTimes(3); rolledBack(s);
});

test('missing audit acknowledgement cannot commit', async () => {
  const s = setup();
  s.conn.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([{ affectedRows: 1, insertId: 55 }])
    .mockResolvedValueOnce([{ insertId: 0 }]);
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 503 }); rolledBack(s);
});

test('invalid IP fails before transaction or writes', async () => {
  const s = setup();
  await expect(s.service.record({ ...input, ipAddress: 'x'.repeat(46) })).rejects.toMatchObject({ statusCode: 400 });
  expect(s.pool.getConnection).not.toHaveBeenCalled();
});
