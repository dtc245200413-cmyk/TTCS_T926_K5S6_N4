// HTTP contract integration: real auth, router, controller, service, validation
// and transaction wrapper. Only DB/session/notification dependencies are mocked.
jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
jest.mock('../repositories/notificationRepository', () => ({ createForUsers: jest.fn() }));
jest.mock('../repositories/offerRepository', () => {
  const real = jest.requireActual('../repositories/offerRepository');
  const fake = { ...real };
  for (const key of ['assertDraftWritesReady', 'loadApplicationForUpdate', 'loadDecision',
    'loadCatalog', 'findEffectiveOffers', 'insertDraft', 'findScopedOfferForUpdate',
    'updateDraftIfEditable', 'submitIfEditable', 'recordSubmission']) fake[key] = jest.fn();
  return fake;
});
const express = require('express');
const jwt = require('jsonwebtoken');
const repo = require('../repositories/offerRepository');
const { pool } = require('../config/database');
const users = require('../repositories/userRepository');
const sessions = require('../repositories/sessionRepository');
const notifications = require('../repositories/notificationRepository');
const router = require('./offerRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');
const validation = require('../services/offerValidation');
const previousSecret = process.env.JWT_SECRET;
let server, url, token, store, conn, decision;
const content = { application_id: 11, position_id: 41, job_title: 'Developer',
  basic_salary: '25000000.00', currency: 'VND', expected_start_date: '2027-01-15', response_deadline: '2027-01-10' };

beforeAll(async () => {
  process.env.JWT_SECRET = 'offer-workflow-api-test';
  const app = express(); app.use(express.json()); app.use('/api/offers', router); app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  url = `http://127.0.0.1:${server.address().port}/api/offers`;
});
afterAll(async () => {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
beforeEach(() => {
  jest.resetAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {});
  store = { offer: null, submissions: [] };
  let snapshot;
  conn = {
    beginTransaction: jest.fn(async () => { snapshot = structuredClone(store); }),
    commit: jest.fn(), rollback: jest.fn(async () => { store = snapshot; }), release: jest.fn(),
    query: jest.fn(async sql => sql.includes('FROM offer_approvals') ? [[]] : [[structuredClone(store.offer)]])
  };
  pool.getConnection.mockResolvedValue(conn);
  users.findById.mockResolvedValue({ user_id: 3, status: 'ACTIVE' });
  users.getRolesAndPermissions.mockResolvedValue([{ role_code: 'RECRUITER' }]);
  sessions.findByToken.mockResolvedValue({ user_id: 3, revoked_at: null, expires_at: '2099-01-01' });
  token = jwt.sign({ userId: 3, sessionToken: 'test-session' }, process.env.JWT_SECRET);
  repo.loadApplicationForUpdate.mockResolvedValue({ id: 11, candidate_id: 17,
    recruitment_request_id: 21, department_id: 31, mapping_verified: true, creation_access_verified: true });
  decision = { application_id: 11, candidate_id: 17, recruitment_request_id: 21,
    decision: 'PASSED', authority_verified: true, is_current: true,
    source: 'test-only-verified-reader', reference: 5, version: 1, decided_by: 8, decided_at: '2026-10-21' };
  repo.loadDecision.mockImplementation(async () => decision);
  repo.loadCatalog.mockResolvedValue({ department: { id: 31, active: true }, position: { id: 41, active: true } });
  repo.findEffectiveOffers.mockImplementation(async (_, except) => store.offer && store.offer.id !== except ? [store.offer] : []);
  repo.insertDraft.mockImplementation(async row => {
    store.offer = { ...row, id: 1, created_at: '2026-10-21T00:00:00Z' }; return structuredClone(store.offer);
  });
  repo.findScopedOfferForUpdate.mockImplementation(async () => store.offer && structuredClone(store.offer));
  repo.updateDraftIfEditable.mockImplementation(async (_, patch, scope, version) => {
    if (store.offer.row_version !== version) return 0;
    Object.assign(store.offer, patch, { row_version: version + 1 }); return 1;
  });
  repo.submitIfEditable.mockImplementation(async (_, scope, connection, version) => {
    expect(connection).toBe(conn);
    if (store.offer.row_version !== version) return 0;
    Object.assign(store.offer, { status: 'PENDING_APPROVAL', row_version: version + 1 }); return 1;
  });
  repo.recordSubmission.mockImplementation(async (offer, user, proof, connection) => {
    expect(connection).toBe(conn);
    const record = { id: store.submissions.length + 1, offer_id: offer.id,
      submitted_by: user.user_id, submitted_at: '2026-10-21T00:01:00Z', offer_row_version: store.offer.row_version,
      approver_ids: [8] };
    store.submissions.push(record); return record;
  });
});
afterEach(() => jest.restoreAllMocks());
async function request(method, path, body = {}, version = '"1"') {
  const response = await fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json', ...(version ? { 'If-Match': version } : {}) }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('HTTP create, edit, submit, lock, external change request, edit and resubmit', async () => {
  expect(await request('POST', '', content)).toMatchObject({ status: 201, body: { data: {
    id: 1, status: 'DRAFT', created_by: 3, row_version: 1, candidate_id: 17, department_id: 31
  } } });
  expect((await request('PATCH', '/1', { message: 'Updated' })).status).toBe(200);
  expect((await request('POST', '/1/submit', {}, '"2"')).body.data).toMatchObject({ status: 'PENDING_APPROVAL', row_version: 3 });
  expect((await request('PATCH', '/1', { message: 'Forbidden' }, '"3"')).status).toBe(400);
  // Fixture represents an external, already-authorized workflow transition.
  // It does not claim this project's currently blocked approval API succeeded.
  Object.assign(store.offer, { status: 'CHANGE_REQUESTED', row_version: 4 });
  expect((await request('PATCH', '/1', { message: 'Corrected' }, '"4"')).status).toBe(200);
  expect((await request('POST', '/1/submit', {}, '"5"')).body.data.row_version).toBe(6);
  expect(store.submissions.map(s => s.offer_row_version)).toEqual([3, 6]);
  expect(store.submissions.every(s => s.submitted_by === 3 && s.submitted_at)).toBe(true);
  expect(store.offer.created_by).toBe(3);
});
test.each(['FAILED', 'missing', 'wrong-application'])('HTTP creation rejects %s decision', async mode => {
  if (mode === 'FAILED') decision.decision = 'FAILED';
  if (mode === 'missing') decision = null;
  if (mode === 'wrong-application') decision.application_id = 99;
  expect((await request('POST', '', content)).status).toBe(mode === 'missing' ? 503 : 422);
  expect(repo.insertDraft).not.toHaveBeenCalled(); expect(conn.rollback).toHaveBeenCalled();
});
test('HTTP duplicate and stale versions cannot change persisted fixture', async () => {
  await request('POST', '', content);
  expect((await request('POST', '', content)).status).toBe(409);
  expect((await request('PATCH', '/1', { message: 'stale' }, '"9"')).status).toBe(409);
  expect((await request('POST', '/1/submit', {}, '"9"')).status).toBe(409);
  expect((await request('POST', '/1/submit', {}, null)).status).toBe(428);
  expect(store.offer.row_version).toBe(1); expect(store.submissions).toEqual([]);
});
test('HTTP validation allows incomplete draft but prevents submission', async () => {
  expect((await request('POST', '', { application_id: 11 })).status).toBe(201);
  expect((await request('POST', '/1/submit')).status).toBe(422);
  expect((await request('PATCH', '/1', { basic_salary: '-1' })).status).toBe(400);
  expect(store.offer.status).toBe('DRAFT');
});
test.each(['insert', 'update', 'history', 'commit'])('HTTP %s failure rolls back the transaction', async step => {
  if (step !== 'insert') await request('POST', '', content);
  const before = structuredClone(store);
  const fail = () => { throw new Error('PRIVATE_SQL_FAILURE'); };
  if (step === 'insert') repo.insertDraft.mockImplementationOnce(async row => { store.offer = row; fail(); });
  if (step === 'update') repo.updateDraftIfEditable.mockImplementationOnce(async () => { store.offer.message = 'partial'; fail(); });
  if (step === 'history') repo.recordSubmission.mockImplementationOnce(async () => { store.submissions.push({}); fail(); });
  if (step === 'commit') conn.commit.mockImplementationOnce(fail);
  const result = step === 'insert' ? await request('POST', '', content)
    : step === 'update' ? await request('PATCH', '/1', { message: 'new' }) : await request('POST', '/1/submit');
  expect(result.status).toBe(500); expect(JSON.stringify(result.body)).not.toContain('PRIVATE_SQL');
  expect(store).toEqual(before); expect(conn.rollback).toHaveBeenCalled();
  expect(notifications.createForUsers).not.toHaveBeenCalled();
});
test('production gate still denies valid HTTP input before acquiring connection', async () => {
  repo.assertDraftWritesReady.mockImplementation(validation.dependencyUnavailable);
  expect((await request('POST', '', content)).status).toBe(503);
  expect(pool.getConnection).not.toHaveBeenCalled();
});
test.each(['ADMIN', 'APPROVER', 'DIRECTOR'])('%s cannot approve without verified submission assignment', async role => {
  users.getRolesAndPermissions.mockResolvedValue([{ role_code: role }]);
  expect((await request('POST', '/1/approve')).status).toBe(403);
  expect(pool.getConnection).not.toHaveBeenCalled();
});
