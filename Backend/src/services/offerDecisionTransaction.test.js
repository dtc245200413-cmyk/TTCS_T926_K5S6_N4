'use strict';

jest.mock('./offerDecisionScopeReader', () => ({ loadVerifiedDecisionWriteScope: jest.fn() }));
const { createOfferDecisionTransaction } = require('./offerDecisionTransaction');
const { loadVerifiedDecisionWriteScope } = require('./offerDecisionScopeReader');

const request = Object.freeze({ actorUserId: 8, applicationId: 20, candidateId: 30, decision: 'PASSED', comment: 'Phu hop yeu cau' });
function setup() {
  const conn = { beginTransaction: jest.fn().mockResolvedValue(undefined), commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined), release: jest.fn() };
  const pool = { getConnection: jest.fn().mockResolvedValue(conn) };
  const scope = { application: { mapping_verified: true }, policy: {
    application_id: 20, candidate_id: 30, decision_maker_id: 8 } };
  loadVerifiedDecisionWriteScope.mockResolvedValue(scope);
  const writeDecision = jest.fn().mockResolvedValue({ id: 9, application_id: 20, candidate_id: 30, decision: 'PASSED' });
  const writeAudit = jest.fn().mockResolvedValue({ id: 10 });
  const service = createOfferDecisionTransaction({ pool, writeDecision, writeAudit });
  return { conn, pool, scope, writeDecision, writeAudit, service };
}
beforeEach(() => jest.clearAllMocks());

test('writes decision and audit on one connection, then commits', async () => {
  const s = setup();
  await expect(s.service.record(request)).resolves.toEqual({ decision_id: 9, audit_id: 10,
    application_id: 20, candidate_id: 30, decision: 'PASSED' });
  expect(loadVerifiedDecisionWriteScope).toHaveBeenCalledWith(expect.objectContaining({ conn: s.conn }));
  expect(s.writeDecision).toHaveBeenCalledWith(expect.objectContaining({ conn: s.conn, scope: s.scope }));
  expect(s.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ conn: s.conn, scope: s.scope }));
  expect(s.conn.commit).toHaveBeenCalledTimes(1);
  expect(s.conn.rollback).not.toHaveBeenCalled();
  expect(s.conn.release).toHaveBeenCalledTimes(1);
});

test('rejects missing writer before acquiring connection', async () => {
  const s = setup();
  const service = createOfferDecisionTransaction({ pool: s.pool, writeAudit: s.writeAudit });
  await expect(service.record(request)).rejects.toMatchObject({ statusCode: 503 });
  expect(s.pool.getConnection).not.toHaveBeenCalled();
});

test.each([
  [{ ...request, actorUserId: 0 }], [{ ...request, actorUserId: 1.2 }],
  [{ ...request, applicationId: '01' }], [{ ...request, candidateId: null }],
  [{ ...request, decision: 'PENDING' }], [{ ...request, comment: '  ' }],
  [{ ...request, comment: 'x'.repeat(4001) }]
])('rejects invalid request before opening transaction %#', async (input) => {
  const s = setup();
  await expect(s.service.record(input)).rejects.toMatchObject({ statusCode: 400 });
  expect(s.pool.getConnection).not.toHaveBeenCalled();
});

test('rolls back when scope verification rejects', async () => {
  const s = setup();
  loadVerifiedDecisionWriteScope.mockRejectedValueOnce(Object.assign(new Error('denied'), { statusCode: 403 }));
  await expect(s.service.record(request)).rejects.toMatchObject({ statusCode: 403 });
  expect(s.writeDecision).not.toHaveBeenCalled();
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
  expect(s.conn.commit).not.toHaveBeenCalled();
  expect(s.conn.release).toHaveBeenCalledTimes(1);
});

test('rolls back if scope proof does not match requested application', async () => {
  const s = setup();
  loadVerifiedDecisionWriteScope.mockResolvedValueOnce({ ...s.scope, policy: { ...s.scope.policy, application_id: 99 } });
  await expect(s.service.record(request)).rejects.toMatchObject({ statusCode: 403 });
  expect(s.writeDecision).not.toHaveBeenCalled();
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
});

test('rolls back when decision writer fails', async () => {
  const s = setup();
  s.writeDecision.mockRejectedValueOnce(new Error('DB write failed'));
  await expect(s.service.record(request)).rejects.toThrow('DB write failed');
  expect(s.writeAudit).not.toHaveBeenCalled();
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
  expect(s.conn.commit).not.toHaveBeenCalled();
});

test('rolls back when decision writer returns mismatched application', async () => {
  const s = setup();
  s.writeDecision.mockResolvedValueOnce({ id: 9, application_id: 99, candidate_id: 30, decision: 'PASSED' });
  await expect(s.service.record(request)).rejects.toMatchObject({ statusCode: 503 });
  expect(s.writeAudit).not.toHaveBeenCalled();
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
});

test('rolls back when audit writer fails', async () => {
  const s = setup();
  s.writeAudit.mockRejectedValueOnce(new Error('audit failed'));
  await expect(s.service.record(request)).rejects.toThrow('audit failed');
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
  expect(s.conn.commit).not.toHaveBeenCalled();
});

test('rolls back when audit writer returns no confirmed record', async () => {
  const s = setup();
  s.writeAudit.mockResolvedValueOnce({});
  await expect(s.service.record(request)).rejects.toMatchObject({ statusCode: 503 });
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
});

test('does not commit and releases connection if beginTransaction fails', async () => {
  const s = setup();
  s.conn.beginTransaction.mockRejectedValueOnce(new Error('start failed'));
  await expect(s.service.record(request)).rejects.toThrow('start failed');
  expect(s.conn.rollback).not.toHaveBeenCalled();
  expect(s.conn.commit).not.toHaveBeenCalled();
  expect(s.conn.release).toHaveBeenCalledTimes(1);
});

test('does not conceal audit error if rollback itself also fails', async () => {
  const s = setup();
  s.writeAudit.mockRejectedValueOnce(new Error('original error'));
  s.conn.rollback.mockRejectedValueOnce(new Error('rollback failed'));
  await expect(s.service.record(request)).rejects.toThrow('original error');
  expect(s.conn.release).toHaveBeenCalledTimes(1);
});

test('rolls back when commit fails', async () => {
  const s = setup();
  s.conn.commit.mockRejectedValueOnce(new Error('commit error'));
  await expect(s.service.record(request)).rejects.toThrow('commit error');
  expect(s.conn.rollback).toHaveBeenCalledTimes(1);
  expect(s.conn.release).toHaveBeenCalledTimes(1);
});
