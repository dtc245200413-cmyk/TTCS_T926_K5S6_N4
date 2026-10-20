jest.mock('../config/database', () => ({ pool: { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
jest.mock('../repositories/notificationRepository', () => ({ create: jest.fn(), createForUsers: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const users = require('../repositories/userRepository');
const sessions = require('../repositories/sessionRepository');
const service = require('../services/offerService');
const notifications = require('../repositories/notificationRepository');
const router = require('./offerRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');
const secret = 'offer-draft-route-test-secret';
const previousSecret = process.env.JWT_SECRET;
const actions = [
  ['POST', '', { application_id: 11 }],
  ['PATCH', '/1', { message: 'Draft' }],
  ['POST', '/1/submit', {}]
];
let server, baseUrl;

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
  jest.clearAllMocks();
  sessions.findByToken.mockResolvedValue({ user_id: 3, revoked_at: null, expires_at: '2099-01-01' });
  users.findById.mockResolvedValue({ user_id: 3, status: 'ACTIVE' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function login(role = 'RECRUITER') {
  users.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: role }]);
  return jwt.sign({ userId: 3, sessionToken: 'staff-session' }, secret);
}
async function request(method, path, body, token, version = '"1"') {
  const response = await fetch(baseUrl + path, { method, headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(version ? { 'If-Match': version } : {})
  }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
function noIO() {
  expect(pool.getConnection).not.toHaveBeenCalled();
  expect(pool.query).not.toHaveBeenCalled();
  expect(pool.execute).not.toHaveBeenCalled();
  expect(notifications.create).not.toHaveBeenCalled();
  expect(notifications.createForUsers).not.toHaveBeenCalled();
}

it.each(actions)('%s %s requires staff authentication', async (method, path, body) => {
  for (const token of [undefined, 'invalid', jwt.sign({ tokenType: 'candidate', candidateAccountId: 7 }, secret)]) {
    expect((await request(method, path, body, token)).status).toBe(401);
  }
  noIO();
});

it.each(actions)('%s %s rejects unapproved roles', async (method, path, body) => {
  for (const role of ['CANDIDATE', 'INTERVIEWER', 'HIRING_MANAGER', 'APPROVER', 'DIRECTOR', 'UNKNOWN']) {
    expect((await request(method, path, body, login(role))).status).toBe(403);
  }
  noIO();
});

it.each(actions)('%s %s remains unavailable with a clear error even for valid staff', async (method, path, body) => {
  for (const role of ['RECRUITER', 'HR_MANAGER', 'ADMIN']) {
    const result = await request(method, path, body, login(role));
    expect(result).toMatchObject({ status: 503, body: { success: false } });
    expect(result.body.message).toContain('chưa được kích hoạt');
    expect(result.body.message).toContain('quyết định Đạt');
    expect(result.body).not.toHaveProperty('data');
  }
  noIO();
});

it.each(['created_by', 'status', 'candidate_id', 'department_id', 'decision', 'mapping_verified'])(
  'rejects client injection of %s at POST', async field => {
    expect((await request('POST', '', { application_id: 11, [field]: 'forged' }, login())).status).toBe(400);
    noIO();
  }
);

it.each(['candidate_id', 'application_id', 'created_by', 'status', 'approved_at', 'approvals'])(
  'rejects changes to %s at PATCH', async field => {
    expect((await request('PATCH', '/1', { [field]: 'forged' }, login())).status).toBe(400);
    noIO();
  }
);

it('requires a specific strong version for PATCH', async () => {
  const token = login();
  expect((await request('PATCH', '/1', { message: 'Draft' }, token, null)).status).toBe(428);
  for (const version of ['*', 'W/"1"', '"0"', '1']) {
    expect((await request('PATCH', '/1', { message: 'Draft' }, token, version)).status).toBe(400);
  }
  noIO();
});

// Controller wiring only, not a claim that storage is activated.
it('preserves standard 201/200 envelopes and authenticated identity (service stubs)', async () => {
  const create = jest.spyOn(service, 'createDraft').mockResolvedValue({ id: 1, status: 'DRAFT', row_version: 1 });
  const edit = jest.spyOn(service, 'updateDraft').mockResolvedValue({ id: 1, status: 'DRAFT', row_version: 2 });
  const token = login();
  expect(await request('POST', '', { application_id: 11 }, token)).toMatchObject({
    status: 201, body: { success: true, data: { id: 1, status: 'DRAFT', row_version: 1 } }
  });
  expect(create).toHaveBeenCalledWith({ application_id: 11 }, expect.objectContaining({ user_id: 3 }));
  expect((await request('PATCH', '/1', { message: 'Draft' }, token)).status).toBe(200);
  expect(edit).toHaveBeenCalledWith('1', { message: 'Draft' }, expect.objectContaining({ user_id: 3 }), '"1"');
  noIO();
});
