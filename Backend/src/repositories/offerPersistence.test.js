jest.mock('../config/database', () => ({ pool: { query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('./offerPersistenceDependencies', () => ({
  verifyDecisionAuthority: jest.fn(), resolveSubmissionAssignments: jest.fn()
}));
const { pool } = require('../config/database');
const repo = require('./offerRepository');
const validation = require('../services/offerValidation');
const deps = require('./offerPersistenceDependencies');
const actor = (role = 'RECRUITER', id = 3) => ({ user_id: id, roles: [{ role_code: role }] });
const app = { id: 11, candidate_id: 17, recruitment_request_id: 21, department_id: 31 };
const decisionRow = { id: 7, application_id: 11, candidate_id: 17, recruitment_request_id: 21,
  department_id: 31, decision: 'PASSED', decided_by: 8, decided_at: '2026-10-20',
  row_version: 2, validity_status: 'CURRENT', revoked_at: null, superseded_at: null,
  authority_policy: 'reviewed-policy-v1', authority_reference: 'audit-77' };
const scope = { sql: ' AND (o.created_by = ?)', params: [3] };
let conn, gate;
beforeEach(() => {
  jest.clearAllMocks();
  conn = { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  pool.getConnection.mockResolvedValue(conn);
  // Skip exactly the entry gate in each SQL test, not later dependency checks.
  gate = jest.spyOn(validation, 'dependencyUnavailable');
  deps.verifyDecisionAuthority.mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());
const allowEntry = () => gate.mockImplementationOnce(() => {});

it.each([
  ['RECRUITER', /r.recruiter_id = \?/, [11, 3]],
  ['HR_MANAGER', /d.manager_user_id = \?/, [11, 3]],
  ['ADMIN', /WHERE a.id = \? FOR UPDATE/, [11]]
])('loads and locks a real application in %s creation scope', async (role, predicate, params) => {
  allowEntry(); conn.query.mockResolvedValueOnce([[app]]);
  await expect(repo.loadApplicationForUpdate(11, actor(role), conn)).resolves.toMatchObject({
    ...app, mapping_verified: true, creation_access_verified: true
  });
  const [sql, bound] = conn.query.mock.calls[0];
  expect(sql).toMatch(predicate); expect(bound).toEqual(params);
  expect(sql).toContain('jp.recruitment_request_id = a.recruitment_request_id');
  expect(sql).toContain('c.id = a.candidate_id');
  expect(sql).not.toMatch(/candidate\.status|rating|recommendation/);
});

it('denies an unassigned recruiter or invalid application without exposing data', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[]]);
  await expect(repo.loadApplicationForUpdate(11, actor(), conn)).rejects.toMatchObject({
    statusCode: 403, code: 'OFFER_APPLICATION_ACCESS_DENIED'
  });
});

it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER'])('rejects %s even behind the write gate', async role => {
  allowEntry();
  await expect(repo.loadApplicationForUpdate(11, actor(role), conn)).rejects.toMatchObject({ statusCode: 403 });
  expect(conn.query).not.toHaveBeenCalled();
});

it('uses creator scope for editing, without granting new creation access', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[app]]);
  await expect(repo.loadApplicationForUpdate(11, actor(), conn, { offerId: 41 }))
    .resolves.toMatchObject({ creation_access_verified: false });
  expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('o.created_by = ?'), [11, 41, 3]);
  expect(conn.query.mock.calls[0][0]).not.toContain('r.recruiter_id = ?');
});

it('returns a scoped PASSED proof only after the authority verifier succeeds', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[decisionRow]]);
  await expect(repo.loadDecision(app, conn)).resolves.toMatchObject({ source: 'candidate_hiring_decisions',
    reference: 7, version: 2, authority_verified: true, is_current: true });
  expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), [11, 17, 21, 31]);
  expect(deps.verifyDecisionAuthority).toHaveBeenCalledWith(decisionRow, app, conn);
});

it.each([
  ['another application', { application_id: 12 }], ['another candidate', { candidate_id: 18 }],
  ['another request', { recruitment_request_id: 22 }], ['another department', { department_id: 32 }],
  ['FAILED', { decision: 'FAILED' }], ['unverified', { validity_status: 'UNVERIFIED' }],
  ['revoked', { revoked_at: '2026-10-21' }], ['superseded', { superseded_at: '2026-10-21' }]
])('rejects %s decision proof before consulting authority', async (label, patch) => {
  allowEntry(); conn.query.mockResolvedValueOnce([[{ ...decisionRow, ...patch }]]);
  await expect(repo.loadDecision(app, conn)).rejects.toMatchObject({ statusCode: 422 });
  expect(deps.verifyDecisionAuthority).not.toHaveBeenCalled();
});

it('does not use the candidate summary when the dedicated decision is absent', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[]]);
  await expect(repo.loadDecision(app, conn)).rejects.toMatchObject({ code: 'OFFER_DECISION_UNVERIFIED' });
  expect(conn.query).toHaveBeenCalledTimes(1);
});

it.each(['unconfirmed authority', 'missing metadata', 'missing actor', 'missing version'])('fails closed for %s', async mode => {
  allowEntry();
  const row = { ...decisionRow };
  if (mode === 'missing metadata') row.authority_reference = null;
  if (mode === 'missing actor') row.decided_by = null;
  if (mode === 'missing version') row.row_version = null;
  if (mode === 'unconfirmed authority') deps.verifyDecisionAuthority.mockResolvedValue(false);
  conn.query.mockResolvedValueOnce([[row]]);
  await expect(repo.loadDecision(app, conn)).rejects.toMatchObject({ statusCode: 503 });
});

it('lets missing decision schema fail without attempting a fallback query', async () => {
  allowEntry(); conn.query.mockRejectedValueOnce(Object.assign(new Error('schema missing'), { code: 'ER_BAD_FIELD_ERROR' }));
  await expect(repo.loadDecision(app, conn)).rejects.toMatchObject({ code: 'ER_BAD_FIELD_ERROR' });
  expect(conn.query).toHaveBeenCalledTimes(1);
});

it('reads the position through the request, not an arbitrary client position', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[{ department_id: 31, department_status: 'ACTIVE',
    position_id: 41, position_status: 'ACTIVE' }]]);
  const catalog = await repo.loadCatalog({ position_id: 99 }, app, conn);
  expect(() => validation.assertCatalog({ position_id: 99 }, app, catalog)).toThrow();
  expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('p.position_id = r.position_id'), [21, 31]);
});

it('blocks every existing Offer status and unmapped candidate Offer', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([[{ id: 41 }]]);
  const existing = await repo.findEffectiveOffers(app, null, conn);
  expect(() => validation.assertNoDuplicate(existing)).toThrow();
  expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('application_id IS NULL'), [11, 17, null, null]);
  expect(conn.query.mock.calls[0][0]).not.toContain('status');
});

const draft = { offer_code: 'OFF-test', application_id: 11, candidate_id: 17, recruitment_request_id: 21,
  department_id: 31, created_by: 3, currency: 'VND', decision_source: 'candidate_hiring_decisions',
  decision_reference: 7, decision_version: 2 };

it('inserts incomplete DRAFT and returns database row/version without touching old rows', async () => {
  allowEntry();
  const persisted = { ...draft, id: 41, status: 'DRAFT', row_version: 1, created_at: 'db-time' };
  conn.query.mockResolvedValueOnce([{ insertId: 41 }]).mockResolvedValueOnce([[persisted]]);
  await expect(repo.insertDraft(draft, conn)).resolves.toEqual(persisted);
  const [sql, values] = conn.query.mock.calls[0];
  expect(sql).toContain("'DRAFT', 1, CURRENT_TIMESTAMP");
  expect(sql).toContain('salary_amount, start_date');
  expect(values.slice(-3)).toEqual([7, null, null]);
  expect(conn.query.mock.calls.map(([q]) => q).join('\n')).not.toMatch(/UPDATE|DELETE|PENDING_RESPONSE/);
});

it('mirrors only explicitly changed legacy fields and checks scope + status + version atomically', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
  await expect(repo.updateDraftIfEditable(41, { basic_salary: '123.00', expected_start_date: null }, scope, 2, conn)).resolves.toBe(1);
  const [sql, params] = conn.query.mock.calls[0];
  expect(sql).toContain('o.salary_amount = ?'); expect(sql).toContain('o.start_date = ?');
  expect(sql).toContain('o.row_version = o.row_version + 1');
  expect(sql).toContain("o.status IN ('DRAFT', 'CHANGE_REQUESTED')");
  expect(params).toEqual(['123.00', null, '123.00', null, 41, 3, 2]);
});

it('leaves legacy salary/date untouched when PATCH only changes a message', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
  await expect(repo.updateDraftIfEditable(41, { message: 'note' }, scope, 1, conn)).resolves.toBe(0);
  expect(conn.query.mock.calls[0][0]).not.toMatch(/salary_amount|start_date/);
});

it('increments persisted version on submit while preserving the editable-status predicate', async () => {
  allowEntry(); conn.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
  await expect(repo.submitIfEditable(41, scope, conn, 1)).resolves.toBe(1);
  expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('o.row_version = o.row_version + 1'), [41, 3, 1]);
});

const offer = { ...draft, id: 41, row_version: 1 };
const proof = { ...decisionRow, source: 'candidate_hiring_decisions', reference: 7, version: 2 };
const plan = { verified: true, offer_id: 41, application_id: 11, source: 'reviewed-workflow', reference: 'assignment-1',
  version: 1, assigned_by: 9, approver_ids: [8, 8] };

it('records separate submit/resubmit snapshots and concrete assignments on the supplied transaction', async () => {
  deps.resolveSubmissionAssignments.mockResolvedValue(plan);
  for (const [number, priorVersion] of [[1, 1], [2, 3]]) {
    allowEntry();
    conn.query.mockResolvedValueOnce([[{ user_id: 8 }]])
      .mockResolvedValueOnce([[{ row_version: priorVersion + 1 }]])
      .mockResolvedValueOnce([[{ last_number: number - 1 }]])
      .mockResolvedValueOnce([{ insertId: 100 + number }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    await expect(repo.recordSubmission({ ...offer, row_version: priorVersion }, actor(), proof, conn))
      .resolves.toEqual({ id: 100 + number, offer_id: 41, submission_number: number, approver_ids: [8] });
  }
  const history = conn.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO offer_submissions'));
  expect(history.map(([, params]) => params.slice(0, 4))).toEqual([[41, 1, 2, 3], [41, 2, 4, 3]]);
  expect(JSON.parse(history[0][1][7])).toMatchObject({ application_id: 11, decision: 'PASSED' });
  expect(conn.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO offer_submission_assignments'))).toHaveLength(2);
  expect(pool.query).not.toHaveBeenCalled();
});

it.each(['missing', 'unverified', 'wrong Offer', 'wrong application', 'empty recipients'])('rejects %s assignment proof before history writes', async mode => {
  allowEntry(); const value = { ...plan };
  if (mode === 'unverified') value.verified = false;
  if (mode === 'wrong Offer') value.offer_id = 42;
  if (mode === 'wrong application') value.application_id = 12;
  if (mode === 'empty recipients') value.approver_ids = [];
  deps.resolveSubmissionAssignments.mockResolvedValue(mode === 'missing' ? null : value);
  await expect(repo.recordSubmission(offer, actor(), proof, conn)).rejects.toMatchObject({ statusCode: 503 });
  expect(conn.query).not.toHaveBeenCalled();
});

it('rolls back history when assignment persistence fails, without issuing pool writes', async () => {
  allowEntry(); deps.resolveSubmissionAssignments.mockResolvedValue(plan);
  conn.query.mockResolvedValueOnce([[{ user_id: 8 }]])
    .mockResolvedValueOnce([[{ row_version: 2 }]])
    .mockResolvedValueOnce([[{ last_number: null }]])
    .mockResolvedValueOnce([{ insertId: 101 }])
    .mockRejectedValueOnce(new Error('assignment insert failed'));
  await expect(repo.withTransaction(c => repo.recordSubmission(offer, actor(), proof, c))).rejects.toThrow('assignment insert failed');
  expect(conn.commit).not.toHaveBeenCalled(); expect(conn.rollback).toHaveBeenCalledTimes(1);
  expect(conn.release).toHaveBeenCalledTimes(1); expect(pool.query).not.toHaveBeenCalled();
});

it('refuses inactive assigned users before persisting any submission', async () => {
  allowEntry(); deps.resolveSubmissionAssignments.mockResolvedValue(plan);
  conn.query.mockResolvedValueOnce([[]]);
  await expect(repo.recordSubmission(offer, actor(), proof, conn)).rejects.toMatchObject({ statusCode: 503 });
  expect(conn.query).toHaveBeenCalledTimes(1);
});

it('refuses history for an unexpected persisted Offer version', async () => {
  allowEntry(); deps.resolveSubmissionAssignments.mockResolvedValue(plan);
  conn.query.mockResolvedValueOnce([[{ user_id: 8 }]]).mockResolvedValueOnce([[{ row_version: 7 }]]);
  await expect(repo.recordSubmission(offer, actor(), proof, conn)).rejects.toMatchObject({ statusCode: 409 });
  expect(conn.query).toHaveBeenCalledTimes(2);
});

it('maps a missing persistence schema to dependency unavailable after rollback', async () => {
  await expect(repo.withTransaction(async () => { throw Object.assign(new Error('private schema info'), { code: 'ER_NO_SUCH_TABLE' }); }))
    .rejects.toMatchObject({ statusCode: 503, code: 'OFFER_DRAFT_DEPENDENCY_UNAVAILABLE' });
  expect(conn.rollback).toHaveBeenCalled(); expect(conn.release).toHaveBeenCalled();
});

it.each(['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'])('sanitizes %s after rollback and releases the connection', async code => {
  await expect(repo.withTransaction(async () => { throw Object.assign(new Error('salary secret'), { code }); }))
    .rejects.toMatchObject({ statusCode: 409, code: 'OFFER_WRITE_CONFLICT' });
  expect(conn.rollback).toHaveBeenCalled(); expect(conn.release).toHaveBeenCalled();
});

it('maps a concurrent unique-constraint failure to 409 using real INSERT code', async () => {
  // A connection double models UNIQUE(application_id), NOT InnoDB scheduling.
  let inserted = false;
  const connections = [0, 1].map(() => ({ ...conn, query: jest.fn(async sql => {
    if (sql.startsWith('INSERT INTO candidate_offers')) {
      if (inserted) throw Object.assign(new Error('duplicate private data'), { code: 'ER_DUP_ENTRY' });
      inserted = true; return [{ insertId: 41 }];
    }
    return [[{ ...draft, id: 41, row_version: 1, status: 'DRAFT' }]];
  }), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() }));
  pool.getConnection.mockResolvedValueOnce(connections[0]).mockResolvedValueOnce(connections[1]);
  allowEntry(); allowEntry();
  const results = await Promise.allSettled([0, 1].map(() => repo.withTransaction(c => repo.insertDraft(draft, c))));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(r => r.status === 'rejected').reason).toMatchObject({ statusCode: 409 });
  expect(connections[0].commit).toHaveBeenCalled(); expect(connections[1].rollback).toHaveBeenCalled();
  expect(connections.every(c => c.release.mock.calls.length === 1)).toBe(true);
});
