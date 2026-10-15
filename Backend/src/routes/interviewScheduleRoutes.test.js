jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), query: jest.fn() } }));
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    const role = req.headers['x-test-role'];
    if (!role) return res.status(401).json({ success: false });
    req.user = { user_id: 7, department_id: 2, roles: [{ role_code: role }] };
    next();
  },
  authorize: () => (req, res, next) => next(),
  authorizeRole: () => (req, res, next) => next()
}));
jest.mock('../repositories/interviewScheduleRepository', () => ({
  interviewerRoles: ['INTERVIEWER', 'HIRING_MANAGER', 'HR_MANAGER', 'RECRUITER', 'ADMIN'],
  withTransaction: jest.fn(), supportsDepartmentScope: jest.fn(), getAll: jest.fn(), findById: jest.fn(),
  findForUpdate: jest.fn(), candidateExists: jest.fn(), positionExists: jest.fn(), lockInterviewer: jest.fn(),
  lockRoom: jest.fn(), findConflicts: jest.fn(), insert: jest.fn(), update: jest.fn(), cancel: jest.fn(), getOptions: jest.fn()
}));
const repository = require('../repositories/interviewScheduleRepository');
const app = require('../app');
let server;
let baseUrl;
let errorLog;
const payload = { candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4,
  start_at: '2026-10-13T10:00:00+07:00', end_at: '2026-10-13T11:00:00+07:00' };
const row = { ...payload, id: 10, status: 'SCHEDULED', start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 04:00:00' };

beforeAll(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/interview-schedules`;
});
afterAll(async () => {
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});
beforeEach(() => {
  jest.resetAllMocks();
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  repository.withTransaction.mockImplementation(work => work({}));
  repository.candidateExists.mockResolvedValue(true);
  repository.positionExists.mockResolvedValue(true);
  repository.lockInterviewer.mockResolvedValue({ user_id: 3, status: 'ACTIVE', role_codes: ['INTERVIEWER'] });
  repository.lockRoom.mockResolvedValue({ id: 4, category_group: 'INTERVIEW_ROOM', is_active: 1 });
  repository.findConflicts.mockResolvedValue([]);
  repository.insert.mockResolvedValue(10);
  repository.findForUpdate.mockResolvedValue(row);
  repository.findById.mockResolvedValue(row);
  repository.supportsDepartmentScope.mockResolvedValue(false);
  repository.getAll.mockResolvedValue([row]);
  repository.getOptions.mockResolvedValue({ candidates: [{ id: 1, full_name: 'Candidate' }], job_positions: [], interviewers: [{ user_id: 3, full_name: 'Interviewer', employee_code: 'EMP003' }], rooms: [] });
});
afterEach(() => errorLog.mockRestore());

async function request(path = '', method = 'GET', body, role = 'RECRUITER') {
  const headers = { 'Content-Type': 'application/json' };
  if (role) headers['x-test-role'] = role;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

it('mounts POST, PATCH, list and detail with the normal response envelope', async () => {
  const created = await request('', 'POST', payload);
  expect(created.status).toBe(201);
  expect(created.body).toMatchObject({ success: true, data: { id: 10 } });
  expect(repository.insert).toHaveBeenCalledWith(expect.any(Object), 7, expect.any(Object));
  expect((await request('/10', 'PATCH', { room_id: 8 })).status).toBe(200);
  expect(repository.update).toHaveBeenCalledWith(10, expect.objectContaining({ room_id: 8 }), 7, expect.any(Object));
  expect((await request()).body.data).toEqual([row]);
  expect((await request('/10')).body.data.id).toBe(10);
});

it('routes /options before /:id and returns only safe interviewer fields', async () => {
  const result = await request('/options');
  expect(result.status).toBe(200);
  expect(Object.keys(result.body.data.interviewers[0]).sort()).toEqual(['employee_code', 'full_name', 'user_id']);
  expect(repository.findById).not.toHaveBeenCalled();
});

it.each([
  [[{ interviewer_id: 3, room_id: 9 }], 'Người phỏng vấn'],
  [[{ interviewer_id: 9, room_id: 4 }], 'Phòng phỏng vấn'],
  [[{ interviewer_id: 3, room_id: 4 }], 'Người phỏng vấn đã có lịch và phòng phỏng vấn']
])('returns HTTP 409 with an actionable conflict message', async (conflicts, message) => {
  repository.findConflicts.mockResolvedValue(conflicts);
  const result = await request('', 'POST', payload);
  expect(result.status).toBe(409);
  expect(result.body.message).toContain(message);
  expect(repository.insert).not.toHaveBeenCalled();
});

it('cancel and repeated cancel return 200 with no physical removal', async () => {
  repository.findById.mockResolvedValue({ ...row, status: 'CANCELLED' });
  const result = await request('/10/cancel', 'PATCH');
  expect(result.status).toBe(200);
  expect(result.body.data.status).toBe('CANCELLED');
  expect(repository.cancel).toHaveBeenCalledWith(10, 7, expect.any(Object));
  repository.findForUpdate.mockResolvedValue({ ...row, status: 'CANCELLED' });
  expect((await request('/10/cancel', 'PATCH')).status).toBe(200);
  expect(repository.cancel).toHaveBeenCalledTimes(1);
});

it('rejects forged actor fields and invalid intervals at HTTP boundary', async () => {
  expect((await request('', 'POST', { ...payload, created_by: 999 })).status).toBe(400);
  expect((await request('/10', 'PATCH', { room_id: 4, updated_by: 999 })).status).toBe(400);
  expect((await request('', 'POST', { ...payload, end_at: payload.start_at })).status).toBe(400);
  expect(repository.insert).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
});

it.each(['CANDIDATE', 'APPROVER', 'UNKNOWN'])('returns 403 to %s for every endpoint', async role => {
  for (const [path, method, body] of [['', 'GET'], ['/options', 'GET'], ['/10', 'GET'], ['', 'POST', payload], ['/10', 'PATCH', { room_id: 4 }], ['/10/cancel', 'PATCH']]) {
    expect((await request(path, method, body, role)).status).toBe(403);
  }
  expect(repository.withTransaction).not.toHaveBeenCalled();
});

it('requires authentication', async () => {
  expect((await request('', 'GET', undefined, null)).status).toBe(401);
});

it('INTERVIEWER scope cannot be overridden by query parameters', async () => {
  repository.getAll.mockImplementation(async (filters, scope) => {
    expect(scope).toEqual({ type: 'interviewer', userId: 7 });
    return scope.userId === filters.interviewer_id ? [row] : [];
  });
  expect((await request('?interviewer_id=999', 'GET', undefined, 'INTERVIEWER')).body.data).toEqual([]);
  repository.findById.mockResolvedValue(null);
  expect((await request('/10', 'GET', undefined, 'INTERVIEWER')).status).toBe(404);
  expect(repository.findById).toHaveBeenCalledWith(10, { type: 'interviewer', userId: 7 });
  expect((await request('/options', 'GET', undefined, 'INTERVIEWER')).status).toBe(403);
});

it('HIRING_MANAGER is denied when recruitment_requests scope is unavailable', async () => {
  expect((await request('', 'GET', undefined, 'HIRING_MANAGER')).status).toBe(403);
  expect((await request('/10', 'GET', undefined, 'HIRING_MANAGER')).status).toBe(403);
  expect(repository.getAll).not.toHaveBeenCalled();
});

it('returns 404 for missing references or schedules', async () => {
  repository.candidateExists.mockResolvedValue(false);
  expect((await request('', 'POST', payload)).status).toBe(404);
  repository.findById.mockResolvedValue(null);
  expect((await request('/999')).status).toBe(404);
});

it('handles missing-table database errors without crashing or leaking SQL', async () => {
  repository.getAll.mockRejectedValueOnce(Object.assign(new Error('private SQL diagnostic'), { code: 'ER_NO_SUCH_TABLE' }));
  const failed = await request();
  expect(failed.status).toBe(500);
  expect(JSON.stringify(failed.body)).not.toContain('private SQL diagnostic');
  expect((await request()).status).toBe(200);
});
