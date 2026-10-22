jest.mock('../config/database', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
jest.mock('../repositories/notificationRepository', () => ({}));

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const sessions = require('../repositories/sessionRepository');
const users = require('../repositories/userRepository');
const service = require('../services/offerService');
const router = require('./offerRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

const secret = 'offer-read-test-secret';
const previousSecret = process.env.JWT_SECRET;
const offers = [
  { id: 1, created_by: 3, manager_user_id: 8, status: 'DRAFT', basic_salary: 100 },
  { id: 2, created_by: 4, manager_user_id: 8, status: 'PENDING_APPROVAL', basic_salary: 200 },
  { id: 3, created_by: 5, manager_user_id: 9, status: 'CHANGE_REQUESTED', basic_salary: 300 },
  { id: 4, created_by: null, manager_user_id: null, status: 'DRAFT', basic_salary: 400 }
];
let server, baseUrl, errorSpy;

function login(roles, id = 3) {
  users.findById.mockResolvedValue({ user_id: id, status: 'ACTIVE', department_id: 80,
    full_name: 'Admin Director', company_email: 'admin@example.test', job_title: 'HR Manager' });
  users.getRolesAndPermissions.mockResolvedValue(roles.map((role_code, index) => ({
    role_id: index + 1, role_code, permission_code: null
  })));
  return jwt.sign({ userId: id, sessionToken: 'staff-session' }, secret);
}

// SQL contract double: the real route, auth, controller and service run against
// fixtures. No MySQL is started. Assertions below also pin the scope predicates.
function queryOffers(sql, params) {
  if (sql.includes('FROM offer_approvals oa')) return [[{ action: 'APPROVED' }]];
  if (!sql.includes('FROM candidate_offers o')) throw new Error('Unexpected SQL');
  let offset = 0;
  let rows = offers;
  if (sql.includes('WHERE o.id = ?')) {
    const id = Number(params[offset++]);
    rows = rows.filter(row => row.id === id);
  }
  const scopePredicates = [];
  if (sql.includes('o.created_by = ?')) {
    const id = params[offset++];
    scopePredicates.push(row => row.created_by === id);
  }
  if (sql.includes('d.manager_user_id = ?')) {
    const id = params[offset++];
    scopePredicates.push(row => row.manager_user_id === id);
  }
  if (scopePredicates.length) rows = rows.filter(row => scopePredicates.some(predicate => predicate(row)));
  if (sql.includes('AND o.status = ?')) {
    const status = params[offset++];
    rows = rows.filter(row => row.status === status);
  }
  return [rows.map(row => ({ ...row }))];
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
  sessions.findByToken.mockResolvedValue({ user_id: 3, revoked_at: null, expires_at: '2099-01-01' });
  pool.query.mockImplementation(async (sql, params) => queryOffers(sql, params));
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

async function get(path = '', token) {
  const response = await fetch(baseUrl + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: await response.json() };
}

it.each(['', '/1'])('returns 401 without a valid staff login on %s', async path => {
  for (const token of [undefined, 'invalid', jwt.sign({ userId: 3, sessionToken: 'staff-session' }, secret, { expiresIn: -1 })]) {
    expect((await get(path, token)).status).toBe(401);
  }
  expect(sessions.findByToken).not.toHaveBeenCalled();
  expect(pool.query).not.toHaveBeenCalled();
});

it.each(['', '/1'])('rejects candidate JWTs and incomplete staff claims before DB access on %s', async path => {
  for (const claims of [
    { tokenType: 'candidate', candidateAccountId: 7 },
    { tokenType: 'candidate', candidateAccountId: 7, userId: 3, sessionToken: 'staff-session' },
    { userId: 3 }, { sessionToken: 'staff-session' }
  ]) {
    expect((await get(path, jwt.sign(claims, secret))).status).toBe(401);
  }
  expect(sessions.findByToken).not.toHaveBeenCalled();
  expect(pool.query).not.toHaveBeenCalled();
});

it.each(['CANDIDATE', 'INTERVIEWER', 'HIRING_MANAGER', 'APPROVER', 'DIRECTOR', 'UNKNOWN'])(
  'denies both read APIs for %s without a verified scope', async role => {
    const token = login([role]);
    expect((await get('', token)).status).toBe(403);
    expect((await get('/1', token)).status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  }
);

it('does not infer permissions from names, emails, titles, JWT roles or client filters', async () => {
  login([]);
  const token = jwt.sign({ userId: 3, sessionToken: 'staff-session', roles: ['ADMIN'] }, secret);
  expect((await get('?role=ADMIN&created_by=3', token)).status).toBe(403);
  expect((await get('/1', token)).status).toBe(403);
  expect(pool.query).not.toHaveBeenCalled();
});

it.each(['CANDIDATE', 'INTERVIEWER'])('does not let ADMIN override the explicit %s restriction', async role => {
  const token = login(['ADMIN', role]);
  expect((await get('', token)).status).toBe(403);
  expect((await get('/1', token)).status).toBe(403);
});

it('lets ADMIN read all Offers and history, including an Offer without ownership links', async () => {
  const token = login(['ADMIN']);
  expect((await get('', token)).body.data.map(row => row.id)).toEqual([1, 2, 3, 4]);
  expect((await get('/4', token))).toMatchObject({ status: 200, body: { data: { id: 4, approvals: [{ action: 'APPROVED' }] } } });
  expect((await get('/999', token)).status).toBe(404);
});

it('limits RECRUITER list and detail to created_by and ignores forged scope filters', async () => {
  const token = login(['RECRUITER']);
  expect((await get('?created_by=4&user_id=4&department_id=80', token)).body.data.map(row => row.id)).toEqual([1]);
  expect(pool.query.mock.calls[0]).toEqual([expect.stringContaining('AND (o.created_by = ?)'), [3]]);
  expect((await get('/1', token))).toMatchObject({ status: 200, body: { data: { id: 1 } } });
  pool.query.mockClear();
  expect((await get('/2', token)).status).toBe(403);
  expect(pool.query).toHaveBeenCalledTimes(1); // No unauthorized history lookup.
  expect(pool.query.mock.calls[0]).toEqual([expect.stringContaining('WHERE o.id = ? AND (o.created_by = ?)'), ['2', 3]]);
  expect((await get('/999', token)).status).toBe(403); // Same response; no ID existence oracle.
});

it('limits HR_MANAGER to departments explicitly managed by that user', async () => {
  const token = login(['HR_MANAGER'], 8);
  expect((await get('', token)).body.data.map(row => row.id)).toEqual([1, 2]);
  expect(pool.query.mock.calls[0]).toEqual([expect.stringContaining('AND (d.manager_user_id = ?)'), [8]]);
  expect(pool.query.mock.calls[0][0]).toContain('LEFT JOIN departments d ON d.department_id = o.department_id');
  expect((await get('/2', token)).status).toBe(200);
  pool.query.mockClear();
  expect((await get('/3', token)).status).toBe(403);
  expect(pool.query).toHaveBeenCalledTimes(1);
  expect((await get('/4', token)).status).toBe(403);
});

it('does not give HR_MANAGER access merely for belonging to a department', async () => {
  const token = login(['HR_MANAGER'], 7);
  expect((await get('', token))).toMatchObject({ status: 200, body: { data: [] } });
  expect((await get('/1', token)).status).toBe(403);
});

it('combines only verified scopes for multiple allowed roles', async () => {
  const token = login(['HR_MANAGER', 'RECRUITER', 'APPROVER'], 3);
  expect((await get('', token)).body.data.map(row => row.id)).toEqual([1]);
  expect(pool.query.mock.calls[0]).toEqual([
    expect.stringContaining('AND (o.created_by = ? OR d.manager_user_id = ?)'), [3, 3]
  ]);
  expect((await get('/2', token)).status).toBe(403);
});

it('keeps scope predicates grouped before status/search filters and binds search as data', async () => {
  const token = login(['RECRUITER', 'HR_MANAGER'], 3);
  const search = "' OR 1=1 --";
  expect((await get(`?status=DRAFT&search=${encodeURIComponent(search)}`, token)).body.data.map(row => row.id)).toEqual([1]);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toMatch(/AND \(o\.created_by = \? OR d\.manager_user_id = \?\) AND o\.status = \? AND \(/);
  expect(sql).not.toContain(search);
  expect(params).toEqual([3, 3, 'DRAFT', `%${search}%`, `%${search}%`, `%${search}%`]);
});

it('rejects inactive staff and invalid sessions', async () => {
  const token = login(['ADMIN']);
  users.findById.mockResolvedValue({ user_id: 3, status: 'INACTIVE' });
  expect((await get('', token)).status).toBe(403);
  for (const session of [null, { revoked_at: '2026-01-01' }, { revoked_at: null, expires_at: '2000-01-01' }]) {
    sessions.findByToken.mockResolvedValue(session);
    expect((await get('/1', token)).status).toBe(401);
  }
  expect(pool.query).not.toHaveBeenCalled();
});

it('enforces read authorization even when the service is called directly', async () => {
  for (const call of [
    () => service.getAllOffers({}, undefined), () => service.getOfferById(1, undefined)
  ]) await expect(call()).rejects.toMatchObject({ statusCode: 401 });
  for (const user of [
    { roles: [{ role_code: 'ADMIN' }] },
    { user_id: 3, roles: [{ role_code: 'APPROVER' }] }
  ]) {
    await expect(service.getAllOffers({}, user)).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.getOfferById(1, user)).rejects.toMatchObject({ statusCode: 403 });
  }
  expect(pool.query).not.toHaveBeenCalled();
});

it('does not fall back to unrestricted reads when scope SQL fails', async () => {
  const token = login(['HR_MANAGER'], 8);
  pool.query.mockRejectedValue(new Error('manager column unavailable'));
  expect((await get('', token))).toMatchObject({ status: 500, body: { success: false } });
  expect(pool.query).toHaveBeenCalledTimes(1);
});

it.each([
  ['list missing creator column', '', 'ER_BAD_FIELD_ERROR'],
  ['detail missing creator column', '/1', 'ER_BAD_FIELD_ERROR'],
  ['list missing candidate_offers table', '', 'ER_NO_SUCH_TABLE'],
  ['detail missing candidate_offers table', '/1', 'ER_NO_SUCH_TABLE'],
])('unmigrated DB: %s returns safe 503 without revealing SQL', async (_name, path, code) => {
  const token = login(['RECRUITER']);
  const raw = Object.assign(new Error('PRIVATE_SQL o.created_by users.secret'), { code });
  pool.query.mockRejectedValueOnce(raw);
  const result = await get(path, token);
  expect(result).toMatchObject({ status: 503, body: {
    success: false, code: 'OFFER_SCHEMA_NOT_READY'
  } });
  expect(JSON.stringify(result.body)).not.toContain('PRIVATE_SQL');
  expect(JSON.stringify(result.body)).not.toContain('users.secret');
  expect(pool.query).toHaveBeenCalledTimes(1);
});

it('unmigrated DB: a missing offer_approvals table is a safe 503, never a partial detail', async () => {
  const token = login(['RECRUITER']);
  pool.query.mockImplementationOnce(async (sql, params) => queryOffers(sql, params))
    .mockRejectedValueOnce(Object.assign(new Error('private missing history'), { code: 'ER_NO_SUCH_TABLE' }));
  const result = await get('/1', token);
  expect(result).toMatchObject({ status: 503, body: { success: false, code: 'OFFER_SCHEMA_NOT_READY' } });
  expect(JSON.stringify(result.body)).not.toContain('private missing history');
  expect(pool.query).toHaveBeenCalledTimes(2);
});
