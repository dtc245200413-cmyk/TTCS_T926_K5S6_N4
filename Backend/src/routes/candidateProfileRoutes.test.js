// HTTP tests exercise the mounted app, controller and real service. Only authentication
// and persistence are substituted: no test writes to the user's database.
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
jest.mock('../repositories/candidateProfileRepository', () => ({
  findCandidate: jest.fn(), findRequestDepartment: jest.fn(), withTransaction: jest.fn(),
  findTagForUpdate: jest.fn(), insertTag: jest.fn(), getTags: jest.fn(),
  removeTag: jest.fn(), insertNote: jest.fn(), getNotes: jest.fn()
}));

const repository = require('../repositories/candidateProfileRepository');
const app = require('../app');
let server;
let baseUrl;
let catalogue;
let assignments;
let notes;
let errorLog;

beforeAll(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/candidates`;
});

afterAll(async () => {
  await new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  });
});

beforeEach(() => {
  jest.resetAllMocks();
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  catalogue = new Map([
    [12, { id: 12, category_group: 'CANDIDATE_TAG', name: 'Java', is_active: 1 }],
    [13, { id: 13, category_group: 'CANDIDATE_TAG', name: 'React', is_active: 1 }],
    [14, { id: 14, category_group: 'CANDIDATE_SOURCE', name: 'Referral', is_active: 1 }]
  ]);
  assignments = new Map();
  notes = [];
  repository.findCandidate.mockImplementation(async id => id === 1 || id === 2 ? { id, recruitment_request_id: 10 } : null);
  repository.findRequestDepartment.mockResolvedValue(2);
  repository.withTransaction.mockImplementation(work => work({}));
  repository.findTagForUpdate.mockImplementation(async id => catalogue.get(id) || null);
  repository.insertTag.mockImplementation(async (candidateId, tagId, createdBy) => {
    const key = `${candidateId}:${tagId}`;
    if (assignments.has(key)) throw Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY' });
    assignments.set(key, { candidate_id: candidateId, tag_id: tagId, created_by: createdBy });
  });
  repository.getTags.mockImplementation(async candidateId => [...assignments.values()]
    .filter(tag => tag.candidate_id === candidateId)
    .map(tag => ({ ...catalogue.get(tag.tag_id), ...tag })));
  repository.removeTag.mockImplementation(async (candidateId, tagId) => assignments.delete(`${candidateId}:${tagId}`));
  repository.insertNote.mockImplementation(async (candidateId, authorId, content) => {
    const note = { id: notes.length + 1, candidate_id: candidateId, author_id: authorId,
      author_name: 'Recruiter Test', note_content: content, created_at: '2026-10-13T10:00:00.000Z' };
    notes.unshift(note);
    return note;
  });
  repository.getNotes.mockImplementation(async candidateId => notes.filter(note => note.candidate_id === candidateId));
});

afterEach(() => errorLog.mockRestore());

async function request(path, { method = 'GET', body, role = 'RECRUITER' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (role) headers['x-test-role'] = role;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

it('attaches multiple tags, rejects a duplicate, reloads inactive tags and removes only the chosen assignment', async () => {
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 12 } })).status).toBe(201);
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 13 } })).status).toBe(201);
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 12 } })).status).toBe(409);
  expect(assignments.size).toBe(2);
  catalogue.get(12).is_active = 0;
  const reopened = await request('/1/tags');
  expect(reopened.status).toBe(200);
  expect(reopened.body.data).toEqual(expect.arrayContaining([
    expect.objectContaining({ tag_id: 12, is_active: 0 }), expect.objectContaining({ tag_id: 13 })
  ]));
  expect((await request('/2/tags')).body.data).toEqual([]);
  expect((await request('/1/tags/12', { method: 'DELETE' })).body.data.removed).toBe(true);
  expect((await request('/1/tags')).body.data.map(tag => tag.tag_id)).toEqual([13]);
  expect((await request('/1/tags/12', { method: 'DELETE' })).body.data.removed).toBe(false);
});

it('handles concurrent duplicate requests with one assignment', async () => {
  const results = await Promise.all([1, 2].map(() => request('/1/tags', { method: 'POST', body: { tag_id: 12 } })));
  expect(results.map(result => result.status).sort()).toEqual([201, 409]);
  expect(assignments.size).toBe(1);
});

it('rejects wrong-group, inactive and nonexistent tags', async () => {
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 14 } })).status).toBe(400);
  catalogue.get(12).is_active = 0;
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 12 } })).status).toBe(400);
  expect((await request('/1/tags', { method: 'POST', body: { tag_id: 999 } })).status).toBe(404);
  expect(assignments.size).toBe(0);
});

it('saves and reopens notes with trusted author, trimmed content, timestamp and newest-first ordering', async () => {
  const first = await request('/1/profile-notes', { method: 'POST', body: { note_content: '  Ghi chú đầu  ' } });
  expect(first.status).toBe(201);
  expect(first.body.data).toMatchObject({ author_id: 7, author_name: 'Recruiter Test', note_content: 'Ghi chú đầu' });
  expect(first.body.data.created_at).toBeTruthy();
  await request('/1/profile-notes', { method: 'POST', body: { note_content: 'Ghi chú sau' } });
  expect((await request('/1/profile-notes')).body.data.map(note => note.note_content)).toEqual(['Ghi chú sau', 'Ghi chú đầu']);
  expect((await request('/2/profile-notes')).body.data).toEqual([]);
});

it('rejects forged author, empty note and overlong note without writing', async () => {
  for (const body of [
    { note_content: 'Hello', author_id: 999 },
    { note_content: ' \n ' },
    { note_content: 'x'.repeat(5001) }
  ]) expect((await request('/1/profile-notes', { method: 'POST', body })).status).toBe(400);
  expect(notes).toHaveLength(0);
});

it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER'])('returns 403 for %s on every new endpoint', async role => {
  for (const [path, method, body] of [
    ['/1/tags', 'GET'], ['/1/tags', 'POST', { tag_id: 12 }], ['/1/tags/12', 'DELETE'],
    ['/1/profile-notes', 'GET'], ['/1/profile-notes', 'POST', { note_content: 'Secret' }]
  ]) expect((await request(path, { method, body, role })).status).toBe(403);
  expect(repository.findCandidate).not.toHaveBeenCalled();
});

it('authenticates requests before reaching the service', async () => {
  expect((await request('/1/profile-notes', { role: null })).status).toBe(401);
  expect(repository.findCandidate).not.toHaveBeenCalled();
});

it('returns 404 for a missing candidate', async () => {
  expect((await request('/999/profile-notes')).status).toBe(404);
  expect((await request('/999/tags', { method: 'POST', body: { tag_id: 12 } })).status).toBe(404);
});

it('enforces Hiring Manager department scope and denies writes', async () => {
  expect((await request('/1/profile-notes', { role: 'HIRING_MANAGER' })).status).toBe(200);
  expect((await request('/1/tags', { role: 'HIRING_MANAGER', method: 'POST', body: { tag_id: 12 } })).status).toBe(403);
  repository.findRequestDepartment.mockResolvedValue(null);
  expect((await request('/1/profile-notes', { role: 'HIRING_MANAGER' })).status).toBe(403);
  expect((await request('/1/tags', { role: 'HIRING_MANAGER' })).status).toBe(403);
});

it('returns a safe 500 on database errors and continues serving subsequent requests', async () => {
  repository.getNotes.mockRejectedValueOnce(Object.assign(new Error('sensitive SQL diagnostic'), { code: 'ER_NO_SUCH_TABLE' }));
  const failed = await request('/1/profile-notes');
  expect(failed.status).toBe(500);
  expect(JSON.stringify(failed.body)).not.toContain('sensitive SQL diagnostic');
  expect((await request('/1/profile-notes')).status).toBe(200);
});
