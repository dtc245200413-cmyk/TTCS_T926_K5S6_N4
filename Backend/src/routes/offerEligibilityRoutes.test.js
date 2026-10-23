jest.mock('../config/database', () => ({ pool: { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../repositories/sessionRepository', () => ({ findByToken: jest.fn() }));
jest.mock('../repositories/userRepository', () => ({ findById: jest.fn(), getRolesAndPermissions: jest.fn() }));
const { IncomingMessage, ServerResponse } = require('node:http');
const { PassThrough } = require('node:stream');
const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const users = require('../repositories/userRepository');
const sessions = require('../repositories/sessionRepository');
const service = require('../services/offerService');
const router = require('./offerRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');
const app = express(); app.use('/api/offers', router); app.use(errorHandler);
const oldSecret = process.env.JWT_SECRET;
beforeAll(() => { process.env.JWT_SECRET = 'eligibility-tests'; });
afterAll(() => { if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; });
beforeEach(() => {
  jest.clearAllMocks(); pool.query.mockResolvedValue([[]]);
  sessions.findByToken.mockResolvedValue({ user_id: 3, revoked_at: null, expires_at: '2099-01-01' });
  users.findById.mockResolvedValue({ user_id: 3, status: 'ACTIVE' });
});
afterEach(() => { jest.restoreAllMocks(); expect(pool.getConnection).not.toHaveBeenCalled(); expect(pool.execute).not.toHaveBeenCalled(); });
function token(role) {
  users.getRolesAndPermissions.mockResolvedValue([{ role_code: role }]);
  return jwt.sign({ userId: 3, sessionToken: 'session' }, process.env.JWT_SECRET);
}
function request(auth, query = '') {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough(); const req = new IncomingMessage(socket);
    req.method = 'GET'; req.url = '/api/offers/eligibility' + query;
    req.headers = auth ? { authorization: `Bearer ${auth}` } : {};
    const res = new ServerResponse(req);
    res.end = body => { socket.destroy(); resolve({ status: res.statusCode, body: JSON.parse(String(body)) }); return res; };
    app.handle(req, res, error => { socket.destroy(); reject(error || Error('Missing route')); });
  });
}
it('401 without authentication', async () => { expect((await request()).status).toBe(401); expect(pool.query).not.toHaveBeenCalled(); });
it('401 for candidate Portal token', async () => {
  expect((await request(jwt.sign({ tokenType: 'candidate', candidateAccountId: 9 }, process.env.JWT_SECRET))).status).toBe(401);
  expect(pool.query).not.toHaveBeenCalled();
});
it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER', 'HIRING_MANAGER'])('%s cannot expose eligibility data without scope', async role => {
  const result = await request(token(role));
  expect(result).toMatchObject({ status: 403, body: { success: false, data: { eligible: false, applications: [], permissions: { can_create: false } } } });
  expect(pool.query).not.toHaveBeenCalled();
});
it('unassigned Recruiter gets 403 with no application data', async () => {
  const result = await request(token('RECRUITER'), '?application_id=11');
  expect(result).toMatchObject({ status: 403, body: { data: { eligible: false, applications: [] } } });
  expect(pool.query.mock.calls[0][0]).toContain('r.recruiter_id = ?');
  expect(pool.query.mock.calls[0][1]).toEqual([3, 11]);
});
it('static eligibility route precedes :id and preserves successful empty envelope', async () => {
  const spy = jest.spyOn(service, 'getOfferById');
  const result = await request(token('ADMIN'));
  expect(result).toMatchObject({ status: 200, body: { success: true, data: { eligible: false, reason_code: 'NO_APPLICATIONS_IN_SCOPE', applications: [] } } });
  expect(spy).not.toHaveBeenCalled();
});
it('403 for out-of-scope or mismatched candidate/application returns no names or salary', async () => {
  const result = await request(token('HR_MANAGER'), '?application_id=11&candidate_id=99');
  expect(result.status).toBe(403); expect(result.body.data.applications).toEqual([]);
  expect(JSON.stringify(result.body)).not.toMatch(/salary|candidate_name|SELECT/);
});
it('400 for client-supplied decision evidence', async () => {
  expect((await request(token('ADMIN'), '?application_id=11&decision=PASSED')).status).toBe(400);
  expect(pool.query).not.toHaveBeenCalled();
});
it('503 for missing dependency has a stable reason and hides SQL', async () => {
  pool.query.mockRejectedValue(Object.assign(new Error('SELECT secret FROM private_table'), { code: 'ER_BAD_FIELD_ERROR' }));
  const result = await request(token('ADMIN'));
  expect(result).toMatchObject({ status: 503, body: { success: false, data: { eligible: false, reason_code: 'OFFER_ELIGIBILITY_DEPENDENCY_UNAVAILABLE', applications: [] } } });
  expect(JSON.stringify(result.body)).not.toMatch(/SELECT|secret|private_table/);
});
