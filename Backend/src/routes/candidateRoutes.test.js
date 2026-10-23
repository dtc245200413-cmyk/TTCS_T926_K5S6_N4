jest.mock('../repositories/candidateProfileRepository', () => ({ findRequestDepartment: jest.fn() }));
jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn(), execute: jest.fn(), query: jest.fn() } }));
jest.mock('../repositories/candidateRatingRepository', () => ({
  findCandidateById: jest.fn(),
  upsertRating: jest.fn(),
  getRatingsByCandidate: jest.fn(),
  getRatingByReviewer: jest.fn(),
  getSummary: jest.fn()
}));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));

jest.mock('../repositories/candidateRepository', () => ({ create: jest.fn(), findById: jest.fn(), updateStatus: jest.fn(), getAll: jest.fn(), search: jest.fn(), addActivity: jest.fn() }));
jest.mock('../repositories/candidateMergeRepository', () => ({ findPotentialDuplicates: jest.fn() }));
jest.mock('../repositories/auditRepository', () => ({ createLog: jest.fn() }));
jest.mock('../utils/cvParser', () => ({ parseCvBuffer: jest.fn() }));

describe('SCRUM-129 regression suite', () => {

const jwt = require('jsonwebtoken');
const repo = require('../repositories/candidateRatingRepository');
const { pool } = require('../config/database');
const profileRepo = require('../repositories/candidateProfileRepository');
const sessionRepo = require('../repositories/sessionRepository');
const userRepo = require('../repositories/userRepository');

describe('SCRUM-215 - HTTP routes with real JWT middleware and mocked repositories', () => {
  let server;
  let baseUrl;
  let token;
  let consoleSpy;
  const previousSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'scrum215-test-only-secret';
    const app = require('../app');
    await new Promise((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/candidates`;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    pool.getConnection.mockResolvedValue({ beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() });
    profileRepo.findRequestDepartment.mockResolvedValue(2);
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    token = jwt.sign({ userId: 10, sessionToken: 'test-session' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    sessionRepo.findByToken.mockResolvedValue({ revoked_at: null, expires_at: new Date(Date.now() + 3600000) });
    userRepo.findById.mockResolvedValue({ user_id: 10, status: 'ACTIVE', department_id: 2 });
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: 'RECRUITER' }]);
    repo.findCandidateById.mockResolvedValue({ id: 1, status: 'NEW', recruitment_request_id: 8 });
    repo.upsertRating.mockResolvedValue(undefined);
    repo.getRatingsByCandidate.mockResolvedValue([]);
    repo.getRatingByReviewer.mockResolvedValue(null);
    repo.getSummary.mockResolvedValue({ average_rating: null, rating_count: 0 });
  });

  afterEach(() => consoleSpy.mockRestore());

  async function request(method, path, body, authToken = token) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    return { status: response.status, body: await response.json() };
  }

  it.each(['GET', 'PUT'])('returns 401 without authentication for %s', async method => {
    const response = await request(method, method === 'GET' ? '/1/ratings' : '/1/ratings/me', undefined, null);
    expect(response.status).toBe(401);
    expect(repo.findCandidateById).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    expect((await request('GET', '/1/ratings', undefined, 'invalid-token')).status).toBe(401);
  });

  it('returns the empty response envelope', async () => {
    expect(await request('GET', '/1/ratings')).toMatchObject({
      status: 200,
      body: { success: true, data: { average_rating: null, rating_count: 0, my_rating: null, ratings: [] } }
    });
  });

  it.each(['NEW', 'INTERVIEWING', 'OFFERED', 'HIRED'])('saves for %s with the authenticated identity and returns the saved rating and summary', async status => {
    repo.findCandidateById.mockResolvedValue({ id: 1, status });
    repo.getRatingByReviewer.mockResolvedValue({ rating: 5, comment: 'Phù hợp' });
    repo.getSummary.mockResolvedValue({ average_rating: 4, rating_count: 2 });
    expect(await request('PUT', '/1/ratings/me', { rating: 5, comment: ' Phù hợp ' })).toMatchObject({
      status: 200,
      body: { success: true, data: { average_rating: 4, rating_count: 2, my_rating: { rating: 5, comment: 'Phù hợp' } } }
    });
    expect(repo.upsertRating).toHaveBeenCalledWith(1, 10, 5, 'Phù hợp', expect.any(Object));
  });

  it.each(['RECRUITER', 'HR_MANAGER', 'ADMIN'])('rejects new ratings on REJECTED candidates for %s', async role => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: role }]);
    repo.findCandidateById.mockResolvedValue({ id: 1, status: 'REJECTED' });
    expect(await request('PUT', '/1/ratings/me', { rating: 5 })).toEqual({
      status: 409,
      body: { success: false, message: 'Không thể đánh giá hồ sơ đã bị đánh trượt.' }
    });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it('rejects updates after rejection while GET still returns the previous rating and history', async () => {
    repo.findCandidateById.mockResolvedValue({ id: 1, status: 'REJECTED' });
    const myRating = { rating: 3, comment: 'Nhận xét trước khi đánh trượt' };
    const ratings = [{ reviewer_id: 10, reviewer_name: 'Recruiter', ...myRating }];
    repo.getRatingByReviewer.mockResolvedValue(myRating);
    repo.getRatingsByCandidate.mockResolvedValue(ratings);
    repo.getSummary.mockResolvedValue({ average_rating: 3, rating_count: 1 });
    expect((await request('PUT', '/1/ratings/me', { rating: 5, comment: 'Thay đổi' })).status).toBe(409);
    expect(repo.upsertRating).not.toHaveBeenCalled();
    expect(await request('GET', '/1/ratings')).toMatchObject({
      status: 200,
      body: { success: true, data: { average_rating: 3, rating_count: 1, my_rating: myRating, ratings } }
    });
  });

  it('does not accept a forged reviewer identity', async () => {
    const response = await request('PUT', '/1/ratings/me', { rating: 5, reviewer_id: 20 });
    expect(response.status).toBe(400);
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER'])('returns 403 for %s on both endpoints', async role => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 2, role_code: role }]);
    expect((await request('GET', '/1/ratings')).status).toBe(403);
    expect((await request('PUT', '/1/ratings/me', { rating: 5 })).status).toBe(403);
    expect(repo.findCandidateById).not.toHaveBeenCalled();
  });

  it('permits HIRING_MANAGER reads only', async () => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 2, role_code: 'HIRING_MANAGER' }]);
    expect((await request('GET', '/1/ratings')).status).toBe(200);
    expect((await request('PUT', '/1/ratings/me', { rating: 5 })).status).toBe(403);
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it('returns 404 for a nonexistent candidate on both endpoints', async () => {
    repo.findCandidateById.mockResolvedValue(null);
    expect((await request('GET', '/999/ratings')).status).toBe(404);
    expect((await request('PUT', '/999/ratings/me', { rating: 5 })).status).toBe(404);
  });

  it('returns 400 for invalid input', async () => {
    expect((await request('GET', '/abc/ratings')).status).toBe(400);
    expect((await request('PUT', '/1/ratings/me', { rating: '5' })).status).toBe(400);
  });

  it.each(['findCandidateById', 'getRatingsByCandidate', 'getSummary', 'getRatingByReviewer'])('handles database failure in %s without exposing details', async method => {
    repo[method].mockRejectedValueOnce(new Error('sensitive SQL connection details'));
    const response = await request('GET', '/1/ratings');
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('sensitive SQL');
    expect((await request('GET', '/1/ratings')).status).toBe(200);
  });


  it.each([3, null])('denies Hiring Manager ratings outside department scope (%s)', async departmentId => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_code: 'HIRING_MANAGER' }]);
    profileRepo.findRequestDepartment.mockResolvedValue(departmentId);
    expect((await request('GET', '/1/ratings')).status).toBe(403);
    expect(repo.getRatingsByCandidate).not.toHaveBeenCalled();
  });
  it('denies Hiring Manager when candidate request scope is missing', async () => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_code: 'HIRING_MANAGER' }]);
    repo.findCandidateById.mockResolvedValue({ id: 1 });
    expect((await request('GET', '/1/ratings')).status).toBe(403);
    expect(repo.getRatingsByCandidate).not.toHaveBeenCalled();
  });
  it('keeps broad staff scope for Hiring Manager also assigned Recruiter', async () => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: 'HIRING_MANAGER' }, { role_id: 2, role_code: 'RECRUITER' }]);
    profileRepo.findRequestDepartment.mockResolvedValue(3);
    expect((await request('GET', '/1/ratings')).status).toBe(200);
    expect(profileRepo.findRequestDepartment).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER'])('denies Candidate mixed with %s', async role => {
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: 'CANDIDATE' }, { role_id: 2, role_code: role }]);
    expect((await request('GET', '/1/ratings')).status).toBe(403);
    expect((await request('PUT', '/1/ratings/me', { rating: 5 })).status).toBe(403);
    expect(repo.findCandidateById).not.toHaveBeenCalled();
  });
  it.each(['GET', 'PUT'])('rejects %s on merged secondary profiles', async method => {
    repo.findCandidateById.mockResolvedValue({ id: 1, merged_into_id: 2 });
    expect((await request(method, method === 'GET' ? '/1/ratings' : '/1/ratings/me', method === 'PUT' ? { rating: 5 } : undefined)).status).toBe(409);
    expect(repo.upsertRating).not.toHaveBeenCalled();
    expect(repo.getRatingsByCandidate).not.toHaveBeenCalled();
  });

  it.each(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'])('returns a business 409 and rolls back on %s', async code => {
    repo.upsertRating.mockRejectedValueOnce(Object.assign(new Error('private SQL lock details'), { code }));
    const response = await request('PUT', '/1/ratings/me', { rating: 5 });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('thử lại');
    expect(JSON.stringify(response.body)).not.toContain('private SQL');
    const connection = await pool.getConnection.mock.results[0].value;
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('handles write failures without crashing the app', async () => {
    repo.upsertRating.mockRejectedValueOnce(new Error('sensitive SQL write details'));
    const response = await request('PUT', '/1/ratings/me', { rating: 5 });
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('sensitive SQL');
    expect((await request('GET', '/1/ratings')).status).toBe(200);
  });
});
});

describe('develop2 regression suite', () => {

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
  require('../config/database').pool.query.mockResolvedValue([[{ id: 1, name: 'Test' }]]);
  candidates.create.mockResolvedValue(12);
  candidates.getAll.mockResolvedValue([{ id: 12, full_name: 'Test Candidate' }]);
  candidates.search.mockResolvedValue({ rows: [{ id: 12, full_name: 'Test Candidate' }], total: 1 });
  candidates.findById.mockResolvedValue({ id: 12, full_name: 'Test Candidate' });
  duplicates.findPotentialDuplicates.mockResolvedValue([]);
  parseCvBuffer.mockResolvedValue({ full_name: 'Test Candidate', email: 'test@example.test', phone: '', missing_fields: ['phone'] });
});
afterEach(() => errorLog.mockRestore());

async function request(operation, roles = ['RECRUITER'], options = {}) {
  users.getRolesAndPermissions.mockResolvedValue(roles.map((role_code, i) => ({ role_id: i + 1, role_code })));
  const headers = options.anonymous ? {} : { Authorization: `Bearer ${options.invalidToken ? 'invalid' : token}` };
  let method = 'POST', url = base, body;
  if (operation === 'list') {
    method = 'GET';
  } else if (operation === 'parse') {
    url += '/parse-cv';
    body = new FormData();
    if (!options.missing) body.append('cv', new Blob([Buffer.alloc(options.size || 16)], { type: options.type || 'application/pdf' }), options.filename || 'test.pdf');
  } else {
    headers['Content-Type'] = 'application/json';
    if (operation === 'status') { method = 'PUT'; url += '/12/status'; }
    body = JSON.stringify(operation === 'status'
      ? { status: options.status || 'REJECTED', rejection_reason_code: 'UNSUITABLE' }
      : { full_name: 'Test Candidate', email: 'test@example.test', phone: '0987654321', source_code: 'LINKEDIN', recruitment_request_id: 1, allow_duplicate: options.allowDuplicate || false });
  }
  const response = await fetch(url, { method, headers, body });
  return { status: response.status, body: await response.json() };
}

describe('GET /candidates authorization', () => {
  it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER', 'EMPLOYEE', 'UNKNOWN'])('denies %s before querying candidates', async role => {
    expect((await request('list', [role])).status).toBe(403);
    expect(candidates.getAll).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER'])('allows %s and passes authenticated department scope', async role => {
    expect(await request('list', [role])).toMatchObject({ status: 200, body: { data: { items: [{ id: 12 }] } } });
    expect(candidates.search).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ user_id: 7, department_id: 2 }) }));
  });
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER'])('denies CANDIDATE combined with %s', async role => {
    expect((await request('list', ['CANDIDATE', role])).status).toBe(403);
    expect(candidates.getAll).not.toHaveBeenCalled();
  });
  it.each([{ anonymous: true }, { invalidToken: true }])('requires valid authentication: %j', async options => {
    expect((await request('list', [], options)).status).toBe(401);
    expect(candidates.getAll).not.toHaveBeenCalled();
  });
  it('denies an authenticated user without roles', async () => {
    expect((await request('list', [])).status).toBe(403);
    expect(candidates.getAll).not.toHaveBeenCalled();
  });
  it('fails closed for Hiring Manager without a department', async () => {
    users.findById.mockResolvedValue({ user_id: 7, status: 'ACTIVE' });
    expect((await request('list', ['HIRING_MANAGER'])).status).toBe(403);
    expect(candidates.getAll).not.toHaveBeenCalled();
  });
  it.each([['INTERVIEWER', 'RECRUITER'], ['HIRING_MANAGER', 'HR_MANAGER']])('keeps legitimate broader staff access: %s + %s', async (first, second) => {
    expect((await request('list', [first, second])).status).toBe(200);
  });
});

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
  expect(candidates.updateStatus).toHaveBeenCalledWith('12', 'HIRED', 'UNSUITABLE', 'Test', 7, undefined);
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
});
