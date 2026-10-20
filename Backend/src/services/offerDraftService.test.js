jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn(), query: jest.fn() } }));
jest.mock('../repositories/notificationRepository', () => ({
  create: jest.fn(), createForUsers: jest.fn(), findActiveUserIdsByRoles: jest.fn()
}));

const { pool } = require('../config/database');
const repo = require('../repositories/offerRepository');
const validation = require('./offerValidation');
const service = require('./offerService');
const notifications = require('../repositories/notificationRepository');
const actor = (role = 'RECRUITER', id = 3) => ({ user_id: id, roles: [{ role_code: role }] });
const contents = { job_title: 'Developer', position_id: 41, basic_salary: '25000000.00',
  currency: 'VND', expected_start_date: '2027-01-01', response_deadline: '2026-12-01' };
let store, application, decision, connections, mutex;

function scoped(row, scope) {
  if (!scope.sql) return true;
  let offset = 0;
  const checks = [];
  if (scope.sql.includes('o.created_by = ?')) checks.push(row.created_by === scope.params[offset++]);
  if (scope.sql.includes('d.manager_user_id = ?')) checks.push(application.department_manager_user_id === scope.params[offset++]);
  return checks.some(Boolean);
}

function seed(overrides = {}) {
  const row = { id: 1, ...contents, application_id: 11, candidate_id: 17, recruitment_request_id: 21,
    department_id: 31, created_by: 3, status: 'DRAFT', row_version: 1, ...overrides };
  store.offers.push(row);
  return row;
}

// An in-memory persistence contract double. It serializes transactions and
// snapshots their state to exercise service races and the REAL transaction
// wrapper. It does not prove MySQL locking or a finalized uniqueness schema.
function connection() {
  let snapshot, unlock;
  const conn = {
    beginTransaction: jest.fn(async () => {
      const preceding = mutex;
      mutex = new Promise(resolve => { unlock = resolve; });
      await preceding;
      snapshot = structuredClone(store);
    }),
    commit: jest.fn(async () => unlock()),
    rollback: jest.fn(async () => { if (snapshot) store = snapshot; unlock?.(); }),
    release: jest.fn(),
    query: jest.fn(async (sql, params) => {
      if (sql.includes('FROM offer_approvals oa')) return [[]];
      if (sql.includes('FROM candidate_offers o') || /^\s*UPDATE candidate_offers o/.test(sql)) {
        const row = store.offers.find(item => item.id === Number(params[0]));
        const scope = { sql, params: params.slice(1) };
        const visible = row && scoped(row, scope);
        if (/^\s*UPDATE/.test(sql)) {
          expect(sql).toContain("AND o.status IN ('DRAFT', 'CHANGE_REQUESTED')");
          if (!visible || !['DRAFT', 'CHANGE_REQUESTED'].includes(row.status)) return [{ affectedRows: 0 }];
          row.status = 'PENDING_APPROVAL';
          return [{ affectedRows: 1 }];
        }
        return [visible ? [structuredClone(row)] : []];
      }
      throw new Error('Unexpected SQL; candidate updates are not allowed in this fixture');
    })
  };
  connections.push(conn);
  return conn;
}

beforeEach(() => {
  jest.clearAllMocks();
  store = { offers: [], submissions: [], candidateStatus: 'PASSED' };
  connections = [];
  mutex = Promise.resolve();
  application = { id: 11, candidate_id: 17, recruitment_request_id: 21, department_id: 31,
    department_manager_user_id: 8, mapping_verified: true, creation_access_verified: true };
  decision = { application_id: 11, candidate_id: 17, recruitment_request_id: 21, decision: 'PASSED',
    authority_verified: true, is_current: true, source: 'mock-authoritative-reader',
    reference: 'decision-1', version: 1, decided_by: 8, decided_at: '2026-10-20T00:00:00Z' };
  // Test-only stand-in for the unconfirmed dependencies. No environment switch
  // or HTTP parameter can enable this path in production.
  jest.spyOn(validation, 'dependencyUnavailable').mockImplementation(() => {});
  pool.getConnection.mockImplementation(async () => connection());
  jest.spyOn(repo, 'loadApplicationForUpdate').mockImplementation(async () => structuredClone(application));
  jest.spyOn(repo, 'loadDecision').mockImplementation(async () => structuredClone(decision));
  jest.spyOn(repo, 'loadCatalog').mockResolvedValue({
    department: { id: 31, active: true }, position: { id: 41, active: true }
  });
  jest.spyOn(repo, 'findEffectiveOffers').mockImplementation(async (app, exceptId) =>
    store.offers.filter(row => row.application_id === app.id && row.id !== exceptId));
  jest.spyOn(repo, 'insertDraft').mockImplementation(async row => {
    if (store.offers.some(existing => existing.application_id === row.application_id)) {
      throw Object.assign(new Error('duplicate fixture'), { statusCode: 409 });
    }
    const persisted = { ...row, id: store.offers.length + 1 };
    store.offers.push(persisted);
    return structuredClone(persisted);
  });
  jest.spyOn(repo, 'updateDraftIfEditable').mockImplementation(async (id, patch, scope, version) => {
    const row = store.offers.find(item => item.id === id);
    if (!row || !scoped(row, scope) || !['DRAFT', 'CHANGE_REQUESTED'].includes(row.status) ||
        row.row_version !== version) return 0;
    Object.assign(row, patch, { row_version: version + 1 });
    return 1;
  });
  jest.spyOn(repo, 'recordSubmission').mockImplementation(async offer => {
    const entry = { id: store.submissions.length + 1, offer_id: offer.id };
    store.submissions.push(entry);
    return entry;
  });
  notifications.findActiveUserIdsByRoles.mockResolvedValue([8]);
});
afterEach(() => jest.restoreAllMocks());

function noNotification() {
  expect(notifications.create).not.toHaveBeenCalled();
  expect(notifications.createForUsers).not.toHaveBeenCalled();
  expect(notifications.findActiveUserIdsByRoles).not.toHaveBeenCalled();
}

it('creates a DRAFT with verified profile/decision, server identity/time, without changing the candidate or notifying', async () => {
  const startedAt = Date.now();
  const result = await service.createDraft({ application_id: 11, ...contents }, actor());
  expect(result).toMatchObject({ id: 1, application_id: 11, candidate_id: 17, department_id: 31,
    status: 'DRAFT', created_by: 3, row_version: 1,
    decision_reference: 'decision-1', basic_salary: '25000000.00' });
  expect(result.created_at.getTime()).toBeGreaterThanOrEqual(startedAt);
  expect(result.created_at.getTime()).toBeLessThanOrEqual(Date.now());
  expect(result.offer_code).toMatch(/^OFF-/);
  expect(store.candidateStatus).toBe('PASSED');
  expect(connections[0].commit).toHaveBeenCalledTimes(1);
  expect(repo.loadApplicationForUpdate).toHaveBeenCalledWith(11, actor(), connections[0]);
  noNotification();
});

it('allows incomplete content in a draft while retaining the application and department anchors', async () => {
  const result = await service.createDraft({ application_id: 11, job_title: null, basic_salary: null }, actor());
  expect(result).toMatchObject({ status: 'DRAFT', job_title: null, basic_salary: null, department_id: 31, currency: 'VND' });
});

it.each(['FAILED', null, 'RECOMMENDED'])('rejects a decision of %s, without falling back to candidate status', async value => {
  decision.decision = value;
  await expect(service.createDraft({ application_id: 11 }, actor())).rejects.toMatchObject({ statusCode: 422 });
  expect(store.offers).toEqual([]);
  expect(repo.insertDraft).not.toHaveBeenCalled();
  expect(connections[0].rollback).toHaveBeenCalled();
  noNotification();
});

it.each(['missing', 'unverified', 'revoked', 'wrong-profile'])('rejects unavailable or invalid decision proof: %s', async mode => {
  if (mode === 'missing') decision = null;
  if (mode === 'unverified') decision.authority_verified = false;
  if (mode === 'revoked') decision.is_current = false;
  if (mode === 'wrong-profile') decision.application_id = 99;
  await expect(service.createDraft({ application_id: 11 }, actor())).rejects.toMatchObject({
    statusCode: mode === 'wrong-profile' ? 422 : 503
  });
  expect(repo.insertDraft).not.toHaveBeenCalled();
  noNotification();
});

it('does not invent an application mapping', async () => {
  application.mapping_verified = false;
  await expect(service.createDraft({ application_id: 11 }, actor())).rejects.toMatchObject({ statusCode: 503 });
  expect(repo.insertDraft).not.toHaveBeenCalled();
});

it.each(['INTERVIEWER', 'CANDIDATE', 'HIRING_MANAGER', 'APPROVER', 'DIRECTOR'])('denies creation by %s before a transaction', async role => {
  await expect(service.createDraft({ application_id: 11 }, actor(role))).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});

it('requires application access proof and the HR management relation', async () => {
  application.creation_access_verified = false;
  await expect(service.createDraft({ application_id: 11 }, actor())).rejects.toMatchObject({ statusCode: 403 });
  application.creation_access_verified = true;
  await expect(service.createDraft({ application_id: 11 }, actor('HR_MANAGER', 9))).rejects.toMatchObject({ statusCode: 403 });
  expect(repo.insertDraft).not.toHaveBeenCalled();
  await expect(service.createDraft({ application_id: 11 }, actor('HR_MANAGER', 8))).resolves.toMatchObject({ created_by: 8 });
});

it.each(['created_by', 'status', 'candidate_id', 'department_id', 'hiring_decision_id', 'created_at'])(
  'rejects client assignment of %s when creating', async field => {
    await expect(service.createDraft({ application_id: 11, [field]: 'forged' }, actor()))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(pool.getConnection).not.toHaveBeenCalled();
  }
);

it.each(['DRAFT', 'CHANGE_REQUESTED'])('edits %s with a matching version and no notification', async status => {
  seed({ status });
  const result = await service.updateDraft(1, { job_title: '  Senior developer  ', basic_salary: null }, actor(), '"1"');
  expect(result).toMatchObject({ status, job_title: 'Senior developer', basic_salary: null, created_by: 3, row_version: 2 });
  expect(connections[0].commit).toHaveBeenCalled();
  noNotification();
});

it('refuses an edit outside the creator scope, before any update', async () => {
  seed({ created_by: 4 });
  await expect(service.updateDraft(1, { message: 'edit' }, actor(), '"1"')).rejects.toMatchObject({ statusCode: 403 });
  expect(repo.updateDraftIfEditable).not.toHaveBeenCalled();
  noNotification();
});

it.each(['PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED'])(
  'cannot edit %s', async status => {
    seed({ status });
    await expect(service.updateDraft(1, { message: 'edit' }, actor(), '"1"')).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.updateDraftIfEditable).not.toHaveBeenCalled();
  }
);

it.each(['id', 'application_id', 'candidate_id', 'created_by', 'department_id', 'status', 'approved_at', 'approvals', 'row_version'])(
  'rejects immutable field %s in an edit', async field => {
    seed();
    await expect(service.updateDraft(1, { [field]: 'forged' }, actor(), '"1"')).rejects.toMatchObject({ statusCode: 400 });
    expect(pool.getConnection).not.toHaveBeenCalled();
  }
);

it('rejects a missing version and a stale version', async () => {
  seed({ row_version: 2 });
  await expect(service.updateDraft(1, { message: 'edit' }, actor())).rejects.toMatchObject({ statusCode: 428 });
  await expect(service.updateDraft(1, { message: 'edit' }, actor(), '"1"')).rejects.toMatchObject({ statusCode: 409 });
  expect(repo.updateDraftIfEditable).not.toHaveBeenCalled();
});

it('only one of two competing creates persists under the application-lock contract', async () => {
  const results = await Promise.allSettled([
    service.createDraft({ application_id: 11 }, actor()),
    service.createDraft({ application_id: 11 }, actor())
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(result => result.status === 'rejected').reason.statusCode).toBe(409);
  expect(store.offers).toHaveLength(1);
  noNotification();
});

it('only one edit based on the same version succeeds', async () => {
  seed();
  const results = await Promise.allSettled([
    service.updateDraft(1, { message: 'A' }, actor(), '"1"'),
    service.updateDraft(1, { message: 'B' }, actor(), '"1"')
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(result => result.status === 'rejected').reason.statusCode).toBe(409);
  expect(store.offers[0].row_version).toBe(2);
});

it('rolls back a partially failed insert and never notifies', async () => {
  repo.insertDraft.mockImplementation(async row => {
    store.offers.push(row);
    throw new Error('insert failed');
  });
  await expect(service.createDraft({ application_id: 11 }, actor())).rejects.toThrow('insert failed');
  expect(store.offers).toEqual([]);
  expect(connections[0].rollback).toHaveBeenCalled();
  expect(connections[0].release).toHaveBeenCalled();
  noNotification();
});

it('treats a conditional update that affects no row as a conflict', async () => {
  seed();
  repo.updateDraftIfEditable.mockResolvedValue(0);
  await expect(service.updateDraft(1, { message: 'edit' }, actor(), '"1"')).rejects.toMatchObject({ statusCode: 409 });
  expect(connections[0].rollback).toHaveBeenCalled();
});

it('validates and records a submission in the transaction before notification', async () => {
  seed();
  notifications.createForUsers.mockImplementation(async () => {
    expect(connections[0].commit).toHaveBeenCalled();
    expect(store.submissions).toHaveLength(1);
  });
  await expect(service.submitOffer(1, actor())).resolves.toMatchObject({ status: 'PENDING_APPROVAL' });
  expect(notifications.createForUsers).toHaveBeenCalledTimes(1);
});

it.each(['decision', 'mapping', 'salary', 'title', 'position', 'department', 'dates', 'duplicate', 'unknown-duplicate-policy'])(
  'cannot submit with invalid %s', async invalid => {
    const row = seed();
    if (invalid === 'decision') decision.decision = 'FAILED';
    if (invalid === 'mapping') application.mapping_verified = false;
    if (invalid === 'salary') row.basic_salary = null;
    if (invalid === 'title') row.job_title = ' ';
    if (invalid === 'position') row.position_id = null;
    if (invalid === 'department') repo.loadCatalog.mockResolvedValue({ department: { id: 31, active: false } });
    if (invalid === 'dates') row.response_deadline = '2026-02-30';
    if (invalid === 'duplicate') seed({ id: 2 });
    if (invalid === 'unknown-duplicate-policy') repo.findEffectiveOffers.mockResolvedValue(undefined);
    await expect(service.submitOffer(1, actor())).rejects.toBeDefined();
    expect(store.offers[0].status).toBe('DRAFT');
    expect(repo.recordSubmission).not.toHaveBeenCalled();
    noNotification();
  }
);

it('rolls back the state transition if submission history fails', async () => {
  seed();
  repo.recordSubmission.mockRejectedValue(new Error('history failed'));
  await expect(service.submitOffer(1, actor())).rejects.toThrow('history failed');
  expect(store.offers[0].status).toBe('DRAFT');
  noNotification();
});
