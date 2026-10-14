// Real JWT/session authentication, routes, upload middleware, controller and service.
// All persistence and PDF extraction are mocked; no MySQL or uploaded files on disk.
jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), query: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
jest.mock('../repositories/candidateRepository', () => ({ create: jest.fn(), findById: jest.fn(), updateStatus: jest.fn(), getAll: jest.fn() }));
jest.mock('../repositories/candidateMergeRepository', () => ({ findPotentialDuplicates: jest.fn() }));
jest.mock('../repositories/auditRepository', () => ({ createLog: jest.fn() }));
jest.mock('../utils/cvParser', () => ({ parseCvBuffer: jest.fn() }));

const jwt = require('jsonwebtoken');
const sessions = require('../repositories/sessionRepository');
const users = require('../repositories/userRepository');
const candidates = require('../repositories/candidateRepository');
const duplicates = require('../repositories/candidateMergeRepository');
const { parseCvBuffer } = require('../utils/cvParser');
const app = require('../app');
let server, base, token, errorLog;
const previousSecret = process.env.JWT_SECRET;

beforeAll(async () => {
  process.env.JWT_SECRET = 'candidate-route-test-secret';
  token = jwt.sign({ userId: 7, sessionToken: 'mock-session' }, process.env.JWT_SECRET);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/candidates`;
});
afterAll(async () => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});
beforeEach(() => {
  jest.resetAllMocks();
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  sessions.findByToken.mockResolvedValue({ revoked_at: null, expires_at: new Date(Date.now() + 60000) });
  users.findById.mockResolvedValue({ user_id: 7, status: 'ACTIVE', department_id: 2 });
  candidates.create.mockResolvedValue(12);
  candidates.findById.mockResolvedValue({ id: 12, full_name: 'Test Candidate' });
  duplicates.findPotentialDuplicates.mockResolvedValue([]);
  parseCvBuffer.mockResolvedValue({ full_name: 'Test Candidate', email: 'test@example.test', phone: '', missing_fields: ['phone'] });
});
afterEach(() => errorLog.mockRestore());

async function request(operation, roles = ['RECRUITER'], options = {}) {
  users.getRolesAndPermissions.mockResolvedValue(roles.map((role_code, i) => ({ role_id: i + 1, role_code })));
  const headers = options.anonymous ? {} : { Authorization: `Bearer ${options.invalidToken ? 'invalid' : token}` };
  let method = 'POST', url = base, body;
  if (operation === 'parse') {
    url += '/parse-cv';
    body = new FormData();
    if (!options.missing) body.append('cv', new Blob([Buffer.alloc(options.size || 16)], { type: options.type || 'application/pdf' }), options.filename || 'test.pdf');
  } else {
    headers['Content-Type'] = 'application/json';
    if (operation === 'status') { method = 'PUT'; url += '/12/status'; }
    body = JSON.stringify(operation === 'status'
      ? { status: options.status || 'REJECTED', rejection_reason_code: 'UNSUITABLE' }
      : { full_name: 'Test Candidate', email: 'test@example.test', allow_duplicate: options.allowDuplicate || false });
  }
  const response = await fetch(url, { method, headers, body });
  return { status: response.status, body: await response.json() };
}

describe.each(['parse', 'create', 'status'])('%s authorization', operation => {
  it.each(['INTERVIEWER', 'HIRING_MANAGER', 'APPROVER', 'CANDIDATE', 'EMPLOYEE'])('denies %s before extraction or writes', async role => {
    expect((await request(operation, [role])).status).toBe(403);
    expect(parseCvBuffer).not.toHaveBeenCalled();
    expect(candidates.create).not.toHaveBeenCalled();
    expect(candidates.updateStatus).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER'])('allows %s', async role => {
    expect((await request(operation, [role])).status).toBe(operation === 'create' ? 201 : 200);
  });
  it('rejects anonymous requests', async () => {
    expect((await request(operation, [], { anonymous: true })).status).toBe(401);
  });
  it('rejects invalid tokens', async () => {
    expect((await request(operation, [], { invalidToken: true })).status).toBe(401);
  });
  it('denies Candidate combined with a staff role, matching SCRUM-337', async () => {
    expect((await request(operation, ['CANDIDATE', 'HR_MANAGER'])).status).toBe(403);
  });
});

it.each(['ADMIN', 'HR_MANAGER'])('%s can hire', async role => {
  expect((await request('status', [role], { status: 'HIRED' })).status).toBe(200);
  expect(candidates.updateStatus).toHaveBeenCalledWith('12', 'HIRED', 'UNSUITABLE');
});
it('Recruiter cannot bypass the HR hire decision', async () => {
  expect((await request('status', ['RECRUITER'], { status: 'HIRED' })).status).toBe(403);
  expect(candidates.updateStatus).not.toHaveBeenCalled();
});
it('returns 413 with Vietnamese guidance above 5 MiB', async () => {
  const result = await request('parse', ['RECRUITER'], { size: 5 * 1024 * 1024 + 1 });
  expect(result.status).toBe(413);
  expect(result.body.message).toContain('Dung lượng CV tối đa là 5 MB');
  expect(parseCvBuffer).not.toHaveBeenCalled();
});
it('accepts exactly 5 MiB', async () => {
  expect((await request('parse', ['RECRUITER'], { size: 5 * 1024 * 1024 })).status).toBe(200);
});
it('checks authorization before reading an oversized upload', async () => {
  expect((await request('parse', ['INTERVIEWER'], { size: 5 * 1024 * 1024 + 1 })).status).toBe(403);
});
it('rejects missing and non-PDF uploads as input errors', async () => {
  expect((await request('parse', ['RECRUITER'], { missing: true })).status).toBe(400);
  expect((await request('parse', ['RECRUITER'], { filename: 'test.txt', type: 'text/plain' })).status).toBe(400);
});
it('preserves manual-entry fallback on extraction failure', async () => {
  parseCvBuffer.mockRejectedValue(new Error('Unreadable PDF'));
  const result = await request('parse');
  expect(result.status).toBe(200);
  expect(result.body.data.parse_success).toBe(false);
});
it('retains duplicate detection and explicit override', async () => {
  duplicates.findPotentialDuplicates.mockResolvedValue([{ id: 3 }]);
  const result = await request('create');
  expect(result.status).toBe(409);
  expect(result.body.duplicates).toEqual([{ id: 3 }]);
  expect(candidates.create).not.toHaveBeenCalled();
  expect((await request('create', ['RECRUITER'], { allowDuplicate: true })).status).toBe(201);
});
it('does not turn unrelated server errors into upload errors', async () => {
  candidates.create.mockRejectedValue(new Error('Database unavailable'));
  expect((await request('create')).status).toBe(500);
});
