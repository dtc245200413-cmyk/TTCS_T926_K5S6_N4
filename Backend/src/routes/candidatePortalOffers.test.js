jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));

const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const repository = require('../repositories/candidatePortalRepository');
const router = require('./candidatePortalRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

const secret = 'candidate-portal-offer-test-secret';
const previousSecret = process.env.JWT_SECRET;
const hiddenStatuses = ['DRAFT', 'PENDING_APPROVAL', 'CHANGE_REQUESTED', 'APPROVED', 'REJECTED', 'SENT', 'EXPIRED', 'CANCELLED', 'UNKNOWN'];
let server, baseUrl, offers, authSpy, errorSpy;

// SQL contract double for these two repository queries; no real MySQL is used.
// The separate repository tests pin the ownership/status predicates and projection.
function executeOfferQuery(sql, params) {
  if (/^\s*SELECT/.test(sql) && /FROM candidate_offers o/.test(sql)) {
    const statuses = sql.match(/o\.status IN \(([^)]+)\)/)?.[1].match(/'([^']+)'/g)?.map(s => s.slice(1, -1));
    const scoped = /WHERE a\.candidate_id = \?/.test(sql);
    const projection = sql.split(/\bFROM\b/)[0];
    const fields = [...projection.matchAll(/o\.(\w+)/g)].map(match => match[1]);
    return [offers.filter(row => (!scoped || row.owner === Number(params[0])) && (!statuses || statuses.includes(row.status)))
      .map(row => projection.includes('o.*') ? { ...row } : {
        ...Object.fromEntries(fields.map(key => [key, row[key]])), job_title: 'Developer', department_name: 'IT'
      })];
  }
  if (/^\s*UPDATE candidate_offers o/.test(sql)) {
    const [status, response, id, candidateId] = params;
    const scoped = /a\.candidate_id = \?/.test(sql);
    const pendingOnly = /o\.status = 'PENDING_RESPONSE'/.test(sql);
    const row = offers.find(item => item.id === Number(id) && (!scoped || item.owner === Number(candidateId))
      && (!pendingOnly || item.status === 'PENDING_RESPONSE'));
    if (!row) return [{ affectedRows: 0 }];
    row.status = status;
    row.candidate_response = response;
    return [{ affectedRows: 1 }];
  }
  throw new Error('Unexpected query in Offer security test');
}

function offer(id, status, owner = 17) {
  return { id, owner, application_id: id + 100, salary_amount: '25000000.00', currency: 'VND',
    start_date: '2026-12-01', response_deadline: '2026-11-20', message: 'Public message',
    status, candidate_response: null, responded_at: null, created_at: '2026-10-20',
    created_by: 3, hiring_decision_id: 9, submitted_at: 'internal', approved_at: 'internal', special_terms: 'internal' };
}

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use(express.json());
  app.use('/api/candidate-portal', router);
  app.use((req, res) => res.status(404).json({ success: false }));
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/candidate-portal`;
});

afterAll(async () => {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

beforeEach(() => {
  offers = [offer(1, 'PENDING_RESPONSE'), offer(2, 'ACCEPTED'), offer(3, 'DECLINED'),
    ...hiddenStatuses.map((status, i) => offer(10 + i, status)), offer(99, 'PENDING_RESPONSE', 18)];
  pool.execute.mockReset().mockImplementation(async (sql, params) => executeOfferQuery(sql, params));
  authSpy = jest.spyOn(repository, 'findAuthById').mockResolvedValue({ account_id: 7, candidate_id: 17, account_status: 'ACTIVE' });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { authSpy.mockRestore(); errorSpy.mockRestore(); });

async function request(path = '/offers', { method = 'GET', body, token } = {}) {
  const credential = token === undefined ? jwt.sign({ tokenType: 'candidate', candidateAccountId: 7 }, secret) : token;
  const headers = { 'Content-Type': 'application/json' };
  if (credential) headers.Authorization = `Bearer ${credential}`;
  const response = await fetch(baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

it.each([null, 'invalid-token'])('requires a valid candidate login (%s)', async token => {
  expect((await request('/offers', { token })).status).toBe(401);
  expect((await request('/offers/1/respond', { token, method: 'PATCH', body: { status: 'ACCEPTED' } })).status).toBe(401);
  expect(pool.execute).not.toHaveBeenCalled();
});

it('rejects a staff JWT and an inactive candidate account', async () => {
  const staff = jwt.sign({ userId: 3, sessionToken: 'staff-session' }, secret);
  expect((await request('/offers', { token: staff })).status).toBe(401);
  authSpy.mockResolvedValue({ candidate_id: 17, account_status: 'INACTIVE' });
  expect((await request()).status).toBe(401);
  expect(pool.execute).not.toHaveBeenCalled();
});

it.each(hiddenStatuses)('does not expose %s, even if the client requests that status', async status => {
  const result = await request(`/offers?status=${status}`);
  expect(result.status).toBe(200);
  expect(result.body.data.map(row => row.status)).toEqual(['PENDING_RESPONSE', 'ACCEPTED', 'DECLINED']);
  expect(result.body.data.some(row => row.status === status)).toBe(false);
});

it('returns the legacy DTO without internal fields and ignores forged candidate identity', async () => {
  const result = await request('/offers?candidate_id=18&application_id=199');
  expect(result.body).toMatchObject({ success: true, data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  expect(pool.execute.mock.calls[0][1]).toEqual([17]);
  expect(Object.keys(result.body.data[0]).sort()).toEqual([
    'id', 'application_id', 'salary_amount', 'currency', 'start_date', 'response_deadline', 'message',
    'status', 'candidate_response', 'responded_at', 'created_at', 'job_title', 'department_name'
  ].sort());
  expect(JSON.stringify(result.body)).not.toContain('internal');
});

it('does not introduce a candidate detail endpoint that bypasses the list filter', async () => {
  expect((await request('/offers/10')).status).toBe(404);
  expect(pool.execute).not.toHaveBeenCalled();
});

it.each(hiddenStatuses)('cannot respond to %s', async status => {
  const row = offers.find(item => item.status === status);
  const result = await request(`/offers/${row.id}/respond`, { method: 'PATCH', body: { status: 'ACCEPTED' } });
  expect(result.status).toBe(404);
  expect(row.status).toBe(status);
});

it('cannot respond to another candidate Offer using a forged body', async () => {
  const result = await request('/offers/99/respond', { method: 'PATCH', body: { status: 'ACCEPTED', candidate_id: 18 } });
  expect(result.status).toBe(404);
  expect(offers.find(row => row.id === 99).status).toBe('PENDING_RESPONSE');
  expect(pool.execute.mock.calls[0][1]).toEqual(['ACCEPTED', null, '99', 17]);
});

it.each(['ACCEPTED', 'DECLINED'])('still permits a valid %s response exactly once', async status => {
  const result = await request('/offers/1/respond', { method: 'PATCH', body: { status, response: '  Candidate reply  ' } });
  expect(result).toMatchObject({ status: 200, body: { success: true, data: { success: true } } });
  expect(offers[0]).toMatchObject({ status, candidate_response: 'Candidate reply' });
  expect((await request('/offers/1/respond', { method: 'PATCH', body: { status, response: 'Again' } })).status).toBe(404);
});

it('retains response validation before any write', async () => {
  for (const body of [{ status: 'DRAFT' }, { status: 'SENT' }, { status: 'DECLINED', response: '   ' }]) {
    expect((await request('/offers/1/respond', { method: 'PATCH', body })).status).toBe(400);
  }
  expect(pool.execute).not.toHaveBeenCalled();
});

it('fails closed when loading public Offers fails', async () => {
  pool.execute.mockRejectedValue(new Error('sensitive SQL diagnostic'));
  const result = await request();
  expect(result.status).toBe(500);
  expect(JSON.stringify(result.body)).not.toContain('sensitive SQL diagnostic');
  expect(pool.execute).toHaveBeenCalledTimes(1);
});
