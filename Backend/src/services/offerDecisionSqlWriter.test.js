'use strict';
const { createOfferDecisionSqlWriter } = require('./offerDecisionSqlWriter');
const { POLICY_CODE } = require('./offerDecisionWritePolicy');

const scope = () => ({
  application: { id: 7, candidate_id: 10, recruitment_request_id: 14,
    department_id: 2, mapping_verified: true, status: 'SOME_STATUS' },
  policy: { policy_code: POLICY_CODE, application_id: 7, candidate_id: 10,
    recruitment_request_id: 14, department_id: 2, decision_maker_id: 5 }
});
const lifecycle = async () => ({ verified: true, application_id: 7, candidate_id: 10,
  recruitment_request_id: 14, status_version: 1, reference: 'status:1' });
const evaluation = async () => ({ verified: true, application_id: 7, candidate_id: 10,
  recruitment_request_id: 14, total_rounds_evaluated: 2,
  average_score: 8.25, reference: 'rounds:2' });
const args = (conn, overrides = {}) => ({ conn, scope: scope(), actorUserId: 5,
  applicationId: 7, candidateId: 10, decision: 'PASSED', comment: 'Ung vien dat',
  ...overrides });
function conn(existing = [], insert = { affectedRows: 1, insertId: 55 }) {
  return { execute: jest.fn().mockResolvedValueOnce([existing]).mockResolvedValueOnce([insert]) };
}
const writer = (l = lifecycle, e = evaluation) =>
  createOfferDecisionSqlWriter({ verifyLifecycle: l, verifyEvaluation: e });

describe('SCRUM-103 decision SQL writer: no route, no database connection', () => {
  test('fails closed without trusted lifecycle/evaluation callbacks', async () => {
    const c = conn();
    await expect(createOfferDecisionSqlWriter()(args(c))).rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('inserts CURRENT decision once with evidence and strict linkage', async () => {
    const c = conn();
    const result = await writer()(args(c));
    expect(result).toMatchObject({ id: 55, application_id: 7, candidate_id: 10,
      decision_maker_id: 5, row_version: 1, validity_status: 'CURRENT' });
    expect(c.execute).toHaveBeenCalledTimes(2);
    expect(c.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(c.execute.mock.calls[1][0]).toContain('INSERT INTO candidate_hiring_decisions');
    expect(c.execute.mock.calls[1][1]).toContain('HIRING_MANAGER_ASSIGNED_DEPARTMENT_V1');
  });
  test('allows FAILED as manager decision with verified scope and evidence', async () => {
    const c = conn();
    const r = await writer()(args(c, { decision: 'FAILED' }));
    expect(r.decision).toBe('FAILED');
  });
  test('rejects changed manager identity before SQL', async () => {
    const c = conn();
    await expect(writer()(args(c, { actorUserId: 6 }))).rejects.toMatchObject({ statusCode: 403 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects wrong application mapping before SQL', async () => {
    const c = conn();
    await expect(writer()(args(c, { applicationId: 8 }))).rejects.toMatchObject({ statusCode: 403 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects unverified lifecycle before SQL', async () => {
    const c = conn();
    await expect(writer(async () => ({ verified: false }), evaluation)(args(c)))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects missing lifecycle version before SQL', async () => {
    const c = conn();
    await expect(writer(async () => ({ ...await lifecycle(), status_version: null }), evaluation)(args(c)))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects candidate-wide evaluation evidence missing application link', async () => {
    const c = conn();
    await expect(writer(lifecycle, async () => ({ ...await evaluation(), application_id: null }))(args(c)))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects missing interview evaluation summary', async () => {
    const c = conn();
    await expect(writer(lifecycle, async () => ({ ...await evaluation(), total_rounds_evaluated: 0 }))(args(c)))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
  test('rejects existing decision for same application or candidate/request', async () => {
    const c = conn([{ id: 41, application_id: 7 }]);
    await expect(writer()(args(c))).rejects.toMatchObject({ statusCode: 409 });
    expect(c.execute).toHaveBeenCalledTimes(1);
  });
  test('converts unique constraint conflicts to 409', async () => {
    const c = { execute: jest.fn().mockResolvedValueOnce([[]]).mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' })) };
    await expect(writer()(args(c))).rejects.toMatchObject({ statusCode: 409 });
  });
  test('rejects INSERT without actual insert id', async () => {
    const c = conn([], { affectedRows: 1, insertId: 0 });
    await expect(writer()(args(c))).rejects.toMatchObject({ statusCode: 503 });
  });
  test('does not hide connection failure', async () => {
    const failure = new Error('SQL connection unavailable');
    const c = { execute: jest.fn().mockRejectedValue(failure) };
    await expect(writer()(args(c))).rejects.toBe(failure);
  });
  test('rejects unsupported decision values before SQL', async () => {
    const c = conn();
    await expect(writer()(args(c, { decision: 'PENDING_RESPONSE' })))
      .rejects.toMatchObject({ statusCode: 503 });
    expect(c.execute).not.toHaveBeenCalled();
  });
});
