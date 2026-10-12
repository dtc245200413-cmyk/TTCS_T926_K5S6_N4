jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../repositories/candidateRatingRepository', () => ({
  findCandidateById: jest.fn(),
  upsertRating: jest.fn(),
  getRatingsByCandidate: jest.fn(),
  getRatingByReviewer: jest.fn(),
  getSummary: jest.fn()
}));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));

const express = require('express');
const jwt = require('jsonwebtoken');
const repo = require('../repositories/candidateRatingRepository');
const sessionRepo = require('../repositories/sessionRepository');
const userRepo = require('../repositories/userRepository');
const routes = require('./candidateRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('SCRUM-215 - HTTP routes with real JWT middleware and mocked repositories', () => {
  let server;
  let baseUrl;
  let token;
  let consoleSpy;
  const previousSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'scrum215-test-only-secret';
    const app = express();
    app.use(express.json());
    app.use('/api/candidates', routes);
    app.use(errorHandler);
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
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    token = jwt.sign({ userId: 10, sessionToken: 'test-session' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    sessionRepo.findByToken.mockResolvedValue({ revoked_at: null, expires_at: new Date(Date.now() + 3600000) });
    userRepo.findById.mockResolvedValue({ user_id: 10, status: 'ACTIVE' });
    userRepo.getRolesAndPermissions.mockResolvedValue([{ role_id: 1, role_code: 'RECRUITER' }]);
    repo.findCandidateById.mockResolvedValue({ id: 1, status: 'NEW' });
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
    expect(repo.upsertRating).toHaveBeenCalledWith(1, 10, 5, 'Phù hợp');
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

  it('handles write failures without crashing the app', async () => {
    repo.upsertRating.mockRejectedValueOnce(new Error('sensitive SQL write details'));
    const response = await request('PUT', '/1/ratings/me', { rating: 5 });
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('sensitive SQL');
    expect((await request('GET', '/1/ratings')).status).toBe(200);
  });
});
