'use strict';

const { writeOfferDecisionAudit } = require('./offerDecisionAuditWriter');
const { createOfferDecisionTransaction } = require('./offerDecisionTransaction');

const proof = Object.freeze({
  application: { id: 101, candidate_id: 201, mapping_verified: true },
  policy: {
    policy_code: 'HIRING_MANAGER_ASSIGNED_DEPARTMENT_V1',
    decision_maker_id: 7, application_id: 101, candidate_id: 201
  }
});
const record = Object.freeze({
  id: 301, application_id: 101, candidate_id: 201,
  decision_maker_id: 7, decision: 'PASSED',
  validity_status: 'CURRENT', row_version: 1
});
const input = {
  scope: proof, actorUserId: 7, applicationId: 101, candidateId: 201,
  decision: 'PASSED', comment: 'Dat phong van', decisionRecord: record,
  ipAddress: '127.0.0.1'
};

function connection() {
  return {
    execute: jest.fn().mockResolvedValue([{ insertId: 501 }]),
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn()
  };
}

describe('SCRUM-103 same-connection audit writer (no database)', () => {
  test('inserts audit on passed transaction connection and returns audit id', async () => {
    const conn = connection();
    await expect(writeOfferDecisionAudit({ conn, ...input })).resolves.toEqual({ id: 501 });
    expect(conn.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.execute.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO audit_logs/);
    expect(params).toEqual([
      7, 7, 'HIRING_DECISION_RECORDED', 'candidate_hiring_decisions', '301',
      expect.stringContaining('application_id=101'), '127.0.0.1'
    ]);
  });

  test.each([
    ['missing conn', { conn: null }],
    ['unverified mapping', { scope: { ...proof, application: { ...proof.application, mapping_verified: false } } }],
    ['other manager', { actorUserId: 8 }],
    ['other application', { applicationId: 102 }],
    ['wrong decision', { decision: 'FAILED' }],
    ['unverified record', { decisionRecord: { ...record, validity_status: 'UNVERIFIED' } }],
    ['missing row version', { decisionRecord: { ...record, row_version: null } }],
    ['untrusted policy', { scope: { ...proof, policy: { ...proof.policy, policy_code: 'CLIENT_SUPPLIED' } } }],
    ['too long address', { ipAddress: 'x'.repeat(46) }]
  ])('fails closed before SQL: %s', async (_name, override) => {
    const conn = connection();
    await expect(writeOfferDecisionAudit({ conn, ...input, ...override }))
      .rejects.toMatchObject({ statusCode: 503, code: 'DECISION_AUDIT_NOT_READY' });
    expect(conn.execute).not.toHaveBeenCalled();
  });

  test('does not hide connection failure', async () => {
    const conn = connection();
    const err = new Error('audit insert failed');
    conn.execute.mockRejectedValue(err);
    await expect(writeOfferDecisionAudit({ conn, ...input })).rejects.toBe(err);
  });

  test('rejects missing insert id so coordinator rolls back', async () => {
    const conn = connection();
    conn.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await expect(writeOfferDecisionAudit({ conn, ...input })).rejects.toMatchObject({ statusCode: 503 });
  });

  test('coordinator commits only after both real adapters return ids', async () => {
    const conn = connection();
    const pool = { getConnection: jest.fn().mockResolvedValue(conn) };
    const loadScope = jest.fn().mockResolvedValue(proof);
    const writeDecision = jest.fn().mockResolvedValue(record);
    const transaction = createOfferDecisionTransaction({
      pool, loadScope, writeDecision, writeAudit: writeOfferDecisionAudit
    });
    await expect(transaction.record({
      actorUserId: 7, applicationId: 101, candidateId: 201,
      decision: 'PASSED', comment: 'Dat phong van'
    })).resolves.toMatchObject({ decision_id: 301, audit_id: 501 });
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
    expect(writeDecision.mock.calls[0][0].conn).toBe(conn);
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });

  test('coordinator rolls back when audit insert fails', async () => {
    const conn = connection();
    conn.execute.mockRejectedValue(new Error('audit insert failed'));
    const transaction = createOfferDecisionTransaction({
      pool: { getConnection: jest.fn().mockResolvedValue(conn) },
      loadScope: jest.fn().mockResolvedValue(proof),
      writeDecision: jest.fn().mockResolvedValue(record),
      writeAudit: writeOfferDecisionAudit
    });
    await expect(transaction.record({
      actorUserId: 7, applicationId: 101, candidateId: 201,
      decision: 'PASSED', comment: 'Dat phong van'
    })).rejects.toThrow('audit insert failed');
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
