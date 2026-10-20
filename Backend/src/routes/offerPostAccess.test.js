jest.mock('../config/database', () => ({ pool: { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
jest.mock('../repositories/notificationRepository', () => ({
  create: jest.fn(), createForUsers: jest.fn(), findActiveUserIdsByRoles: jest.fn()
}));

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const sessions = require('../repositories/sessionRepository');
const users = require('../repositories/userRepository');
const notifications = require('../repositories/notificationRepository');
const offerService = require('../services/offerService');
const offerRepository = require('../repositories/offerRepository');
const validation = require('../services/offerValidation');
const router = require('./offerRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

const endpoints = ['submit', 'approve', 'reject', 'request-change', 'process-approval'];
const approvalEndpoints = endpoints.slice(1);
const secret = 'offer-post-access-test-secret';
const previousSecret = process.env.JWT_SECRET;
let server, baseUrl, errorSpy, offer, race;

function login(roles, id = 3) {
  users.findById.mockResolvedValue({ user_id: id, status: 'ACTIVE', department_id: 1,
    full_name: 'Admin Director', company_email: 'admin@example.test' });
  sessions.findByToken.mockResolvedValue({ user_id: id, revoked_at: null, expires_at: '2099-01-01' });
  users.getRolesAndPermissions.mockResolvedValue(roles.map((role_code, index) => ({
    role_id: index + 1, role_code, permission_code: 'OFFER_APPROVE'
  })));
  return jwt.sign({ userId: id, sessionToken: 'staff-session' }, secret);
}

// Contract double for SQL predicates, not a live database/concurrency test.
// Ownership and state are evaluated again at UPDATE, including simulated races.
function inScope(sql, params) {
  if (offer.id !== Number(params[0])) return false;
  let offset = 1;
  const permissions = [];
  if (sql.includes('o.created_by = ?')) permissions.push(offer.created_by === params[offset++]);
  if (sql.includes('d.manager_user_id = ?')) permissions.push(offer.manager_user_id === params[offset++]);
  return !permissions.length || permissions.some(Boolean);
}

async function query(sql, params) {
  if (sql.includes('FROM offer_approvals oa')) return [[{ action: 'REQUEST_CHANGE' }]];
  if (/^\s*UPDATE candidate_offers o/.test(sql)) {
    if (race) Object.assign(offer, race);
    if (!inScope(sql, params) || !['DRAFT', 'CHANGE_REQUESTED'].includes(offer.status)) return [{ affectedRows: 0 }];
    if (!sql.includes("AND o.status IN ('DRAFT', 'CHANGE_REQUESTED')")) throw new Error('Missing atomic state guard');
    offer.status = 'PENDING_APPROVAL';
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('FROM candidate_offers o')) return [inScope(sql, params) ? [{ ...offer }] : []];
  throw new Error('Unexpected Offer query');
}

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use(express.json());
  app.use('/api/offers', router);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/offers`;
});

afterAll(async () => {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

beforeEach(() => {
  jest.resetAllMocks();
  offer = { id: 1, created_by: 3, manager_user_id: 8, status: 'DRAFT',
    basic_salary: 987654321, candidate_name: 'CONFIDENTIAL_CANDIDATE', special_terms: 'CONFIDENTIAL_TERMS',
    application_id: 11, candidate_id: 17, recruitment_request_id: 21, department_id: 31,
    position_id: 41, job_title: 'Developer', currency: 'VND',
    expected_start_date: '2027-01-01', response_deadline: '2026-12-01' };
  race = null;
  pool.query.mockImplementation(query);
  notifications.findActiveUserIdsByRoles.mockResolvedValue([6]);
  // Contract tests with mock dependencies only. offerDraftRoutes.test.js checks
  // the real closed gate; this is NOT a production activation mechanism.
  jest.spyOn(validation, 'dependencyUnavailable').mockImplementation(() => {});
  const conn = { query: pool.query, beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  pool.getConnection.mockResolvedValue(conn);
  jest.spyOn(offerRepository, 'loadApplicationForUpdate').mockResolvedValue({
    id: 11, candidate_id: 17, recruitment_request_id: 21, department_id: 31, mapping_verified: true
  });
  jest.spyOn(offerRepository, 'loadDecision').mockResolvedValue({
    application_id: 11, candidate_id: 17, recruitment_request_id: 21, decision: 'PASSED',
    authority_verified: true, is_current: true, source: 'mock', reference: 'decision-1', version: 1,
    decided_by: 8, decided_at: '2026-10-20T00:00:00Z'
  });
  jest.spyOn(offerRepository, 'loadCatalog').mockResolvedValue({
    department: { id: 31, active: true }, position: { id: 41, active: true }
  });
  jest.spyOn(offerRepository, 'findEffectiveOffers').mockResolvedValue([]);
  jest.spyOn(offerRepository, 'recordSubmission').mockResolvedValue({ id: 1 });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function post(endpoint, token, { id = 1, body = { action: 'APPROVED', reason: 'Reason' } } = {}) {
  const response = await fetch(`${baseUrl}/${id}/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

function expectPrivateDenial(result, status = 403) {
  expect(result.status).toBe(status);
  expect(result.body.success).toBe(false);
  expect(result.body).not.toHaveProperty('data');
  expect(JSON.stringify(result.body)).not.toMatch(/CONFIDENTIAL|987654321|DRAFT|PENDING_APPROVAL/);
}

function expectNoMutation() {
  expect(pool.query.mock.calls.some(([sql]) => /^\s*(UPDATE|INSERT|DELETE)/.test(sql))).toBe(false);
  expect(notifications.create).not.toHaveBeenCalled();
  expect(notifications.createForUsers).not.toHaveBeenCalled();
  expect(notifications.findActiveUserIdsByRoles).not.toHaveBeenCalled();
}

it.each(endpoints)('%s requires a staff login and rejects candidate credentials', async endpoint => {
  for (const token of [undefined, 'invalid', jwt.sign({ tokenType: 'candidate', candidateAccountId: 7 }, secret)]) {
    expectPrivateDenial(await post(endpoint, token), 401);
  }
  expect(sessions.findByToken).not.toHaveBeenCalled();
  expect(pool.query).not.toHaveBeenCalled();
  expectNoMutation();
});

it.each(endpoints)('%s rejects roles without action permission before reading Offer data', async endpoint => {
  for (const roles of [[], ['HIRING_MANAGER'], ['CANDIDATE'], ['INTERVIEWER'], ['UNKNOWN'], ['ADMIN', 'INTERVIEWER'], ['ADMIN', 'CANDIDATE']]) {
    expectPrivateDenial(await post(endpoint, login(roles)));
  }
  expect(pool.query).not.toHaveBeenCalled();
  expectNoMutation();
});

it.each(approvalEndpoints)('%s denies all unassigned approvers including ADMIN and ignores fabricated assignments', async endpoint => {
  for (const roles of [['APPROVER'], ['DIRECTOR'], ['HR_MANAGER'], ['ADMIN'], ['RECRUITER'], ['ADMIN', 'APPROVER']]) {
    const token = login(roles);
    const body = { action: 'APPROVED', reason: 'Reason', approver_id: 3, assigned_to: 3,
      workflow: { assigned: true }, approvals: [{ approver_id: 3 }], roles: ['ADMIN'] };
    const denied = await post(endpoint, token, { body });
    expectPrivateDenial(denied);
    expect(await post(endpoint, token, { id: 999, body })).toEqual(denied);
  }
  expect(pool.query).not.toHaveBeenCalled(); // Past approval history cannot grant access.
  expectNoMutation();
});

it('cannot submit another recruiter Offer or learn its existence/state from an ID', async () => {
  const token = login(['RECRUITER'], 4);
  const denied = await post('submit', token, { body: { created_by: 4, user_id: 3, role: 'ADMIN' } });
  expectPrivateDenial(denied);
  expect(await post('submit', token, { id: 999 })).toEqual(denied);
  expect(pool.query.mock.calls[0]).toEqual([expect.stringContaining('WHERE o.id = ? AND (o.created_by = ?)'), ['1', 4]]);
  expectNoMutation();
});

it('cannot submit outside an explicitly managed department', async () => {
  const token = login(['HR_MANAGER'], 9);
  expectPrivateDenial(await post('submit', token, { body: { department_id: 1, manager_user_id: 9 } }));
  expect(pool.query.mock.calls[0]).toEqual([expect.stringContaining('AND (d.manager_user_id = ?)'), ['1', 9]]);
  expectNoMutation();
});

it.each(['APPROVER', 'DIRECTOR'])('%s cannot submit merely because it can participate in approval', async role => {
  expectPrivateDenial(await post('submit', login([role])));
  expect(pool.query).not.toHaveBeenCalled();
  expectNoMutation();
});

it.each(['DRAFT', 'CHANGE_REQUESTED'])('the creator can submit %s with the existing response and notification contract', async status => {
  offer.status = status;
  const result = await post('submit', login(['RECRUITER']));
  expect(result).toMatchObject({ status: 200, body: { success: true, data: {
    id: 1, status: 'PENDING_APPROVAL', basic_salary: 987654321, approvals: [{ action: 'REQUEST_CHANGE' }]
  } } });
  expect(pool.query.mock.calls[1]).toEqual([
    expect.stringContaining("WHERE o.id = ? AND (o.created_by = ?)\n       AND o.status IN ('DRAFT', 'CHANGE_REQUESTED')"), ['1', 3]
  ]);
  expect(pool.query.mock.calls[2]).toEqual([expect.stringContaining('WHERE o.id = ? AND (o.created_by = ?)'), ['1', 3]]);
  expect(notifications.createForUsers).toHaveBeenCalledTimes(1);
  expect(notifications.createForUsers).toHaveBeenCalledWith([6], expect.objectContaining({
    title: 'Yêu cầu phê duyệt Offer mới', type: 'OFFER_PENDING_APPROVAL', link: '/offers'
  }));
});

it.each([['ADMIN', 9], ['HR_MANAGER', 8]])('%s retains submit permission within the confirmed scope', async (role, id) => {
  expect((await post('submit', login([role], id))).status).toBe(200);
  expect(offer.status).toBe('PENDING_APPROVAL');
});

it.each(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED'])(
  'does not resubmit %s even for its creator', async status => {
    offer.status = status;
    const result = await post('submit', login(['RECRUITER']));
    expect(result.status).toBe(400);
    expect(result.body).not.toHaveProperty('data');
    expect(offer.status).toBe(status);
    expectNoMutation();
  }
);

it.each([{ created_by: 9 }, { status: 'PENDING_APPROVAL' }])('rechecks ownership and state atomically at UPDATE: %j', async change => {
  race = change;
  expectPrivateDenial(await post('submit', login(['RECRUITER'])), 409);
  expect(pool.query).toHaveBeenCalledTimes(2);
  expect(notifications.findActiveUserIdsByRoles).not.toHaveBeenCalled();
  expect(notifications.createForUsers).not.toHaveBeenCalled();
});

it('rechecks the HR management relation at UPDATE', async () => {
  race = { manager_user_id: 9 };
  expectPrivateDenial(await post('submit', login(['HR_MANAGER'], 8)), 409);
  expect(pool.query.mock.calls[1][0]).toContain('AND (d.manager_user_id = ?)');
  expect(offer.status).toBe('DRAFT');
  expect(notifications.createForUsers).not.toHaveBeenCalled();
});

it('only one of overlapping submissions can transition the fixture and notify', async () => {
  const token = login(['RECRUITER']);
  const results = await Promise.all([post('submit', token), post('submit', token)]);
  expect(results.filter(result => result.status === 200)).toHaveLength(1);
  expect(results.some(result => [400, 409].includes(result.status))).toBe(true);
  expect(notifications.createForUsers).toHaveBeenCalledTimes(1);
});

it('fails closed on SQL errors without leaking diagnostics or issuing notifications', async () => {
  pool.query.mockRejectedValue(new Error('CONFIDENTIAL SQL diagnostic'));
  expectPrivateDenial(await post('submit', login(['RECRUITER'])), 500);
  expect(pool.query).toHaveBeenCalledTimes(1);
  expectNoMutation();
});

it('enforces action authorization for direct service calls too', async () => {
  await expect(offerService.submitOffer(1, undefined)).rejects.toMatchObject({ statusCode: 401 });
  await expect(offerService.processApproval(1, { action: 'APPROVED' }, undefined)).rejects.toMatchObject({ statusCode: 401 });
  await expect(offerService.processApproval(1, { action: 'APPROVED' },
    { user_id: 3, roles: [{ role_code: 'ADMIN' }] })).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.query).not.toHaveBeenCalled();
});

// Wiring compatibility ONLY: production authorization is exercised above.
// Stubbing the service here does not represent a working approval assignment.
it.each([
  ['approve', 'APPROVED'], ['reject', 'REJECTED'], ['request-change', 'REQUEST_CHANGE'],
  ['process-approval', 'REJECTED']
])('%s preserves teammate action mapping and success envelope (service stub)', async (endpoint, expectedAction) => {
  const stub = jest.spyOn(offerService, 'processApproval').mockResolvedValue({ id: 1, status: 'fixture' });
  const result = await post(endpoint, login(['APPROVER']), { body: { action: 'REJECTED', reason: 'Original reason' } });
  expect(result).toMatchObject({ status: 200, body: { success: true, data: { id: 1, status: 'fixture' } } });
  expect(stub).toHaveBeenCalledWith('1', { action: expectedAction, reason: 'Original reason' },
    expect.objectContaining({ user_id: 3 }));
});
