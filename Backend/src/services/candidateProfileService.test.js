jest.mock('../repositories/candidateProfileRepository', () => ({
  findCandidate: jest.fn(), findRequestDepartment: jest.fn(),
  withTransaction: jest.fn(), findTagForUpdate: jest.fn(), insertTag: jest.fn(),
  getTags: jest.fn(), removeTag: jest.fn(), insertNote: jest.fn(), getNotes: jest.fn()
}));

const repository = require('../repositories/candidateProfileRepository');
const service = require('./candidateProfileService');
const staff = role => ({ user_id: 7, department_id: 2, roles: [{ role_code: role }] });
const recruiter = staff('RECRUITER');
const connection = {};

beforeEach(() => {
  jest.resetAllMocks();
  repository.findCandidate.mockResolvedValue({ id: 1, recruitment_request_id: 10 });
  repository.findRequestDepartment.mockResolvedValue(2);
  repository.withTransaction.mockImplementation(work => work(connection));
  repository.findTagForUpdate.mockResolvedValue({ id: 12, category_group: 'CANDIDATE_TAG', is_active: 1 });
  repository.getTags.mockResolvedValue([]);
  repository.getNotes.mockResolvedValue([]);
});

describe('candidate profile tags', () => {
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER'])('allows %s to attach a configured tag', async role => {
    await expect(service.addTag('1', { tag_id: 12, created_by: 999 }, staff(role)))
      .resolves.toEqual({ candidate_id: 1, tag_id: 12 });
    expect(repository.insertTag).toHaveBeenCalledWith(1, 12, 7, connection);
  });

  it('returns 409 on duplicate without hiding other database errors', async () => {
    repository.insertTag.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    await expect(service.addTag(1, { tag_id: 12 }, recruiter)).rejects.toMatchObject({ statusCode: 409 });
    const error = new Error('database unavailable');
    repository.insertTag.mockRejectedValueOnce(error);
    await expect(service.addTag(1, { tag_id: 12 }, recruiter)).rejects.toBe(error);
  });

  it.each([
    [null, 404],
    [{ category_group: 'CANDIDATE_SOURCE', is_active: 1 }, 400],
    [{ category_group: 'CANDIDATE_TAG', is_active: 0 }, 400]
  ])('rejects an unavailable or invalid catalogue tag: %j', async (tag, statusCode) => {
    repository.findTagForUpdate.mockResolvedValue(tag);
    await expect(service.addTag(1, { tag_id: 12 }, recruiter)).rejects.toMatchObject({ statusCode });
    expect(repository.insertTag).not.toHaveBeenCalled();
  });

  it('returns previously attached inactive tags', async () => {
    const tags = [{ tag_id: 12, name: 'Java', is_active: 0 }];
    repository.getTags.mockResolvedValue(tags);
    await expect(service.getTags(1, recruiter)).resolves.toEqual(tags);
  });

  it('removes an inactive tag without requiring catalogue activation', async () => {
    repository.removeTag.mockResolvedValue(true);
    await expect(service.removeTag('1', '12', recruiter)).resolves.toMatchObject({ removed: true });
    expect(repository.removeTag).toHaveBeenCalledWith(1, 12);
    expect(repository.findTagForUpdate).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.2, '1 OR 1=1', null, {}, true, 2147483648])('rejects invalid tag ID %j', async id => {
    await expect(service.addTag(1, { tag_id: id }, recruiter)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.insertTag).not.toHaveBeenCalled();
  });
});

describe('candidate profile notes', () => {
  it('trims content and takes the author only from the authenticated user', async () => {
    const note = { id: 8, note_content: 'Nội dung', author_id: 7, author_name: 'Recruiter', created_at: '2026-10-13' };
    repository.insertNote.mockResolvedValue(note);
    await expect(service.addNote(1, { note_content: '  Nội dung \n' }, recruiter)).resolves.toEqual(note);
    expect(repository.insertNote).toHaveBeenCalledWith(1, 7, 'Nội dung', connection);
  });

  it.each([999, 7, null])('rejects an author_id body field (%j) without inserting', async author_id => {
    await expect(service.addNote(1, { note_content: 'Test', author_id }, recruiter))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.insertNote).not.toHaveBeenCalled();
  });

  it.each(['', ' \n\t ', null, 42, {}, 'a'.repeat(5001), '😀'.repeat(5001)])('rejects invalid note content (case %#)', async note_content => {
    await expect(service.addNote(1, { note_content }, recruiter)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.insertNote).not.toHaveBeenCalled();
  });

  it('accepts exactly 5000 Unicode characters after trimming', async () => {
    const content = '😀'.repeat(5000);
    await service.addNote(1, { note_content: ` ${content} ` }, recruiter);
    expect(repository.insertNote).toHaveBeenCalledWith(1, 7, content, connection);
  });

  it('preserves author_name and database ordering on read', async () => {
    const notes = [{ id: 2, author_name: 'B' }, { id: 1, author_name: 'A' }];
    repository.getNotes.mockResolvedValue(notes);
    await expect(service.getNotes(1, recruiter)).resolves.toEqual(notes);
  });
});

describe('candidate profile access', () => {
  const calls = [
    user => service.getTags(1, user),
    user => service.addTag(1, { tag_id: 12 }, user),
    user => service.removeTag(1, 12, user),
    user => service.getNotes(1, user),
    user => service.addNote(1, { note_content: 'Test' }, user)
  ];

  it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER', 'UNKNOWN'])('denies all operations to %s before querying data', async role => {
    for (const call of calls) await expect(call(staff(role))).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.findCandidate).not.toHaveBeenCalled();
  });

  it('denies Candidate even if the account also has ADMIN', async () => {
    const user = { ...recruiter, roles: [{ role_code: 'ADMIN' }, { role_code: 'CANDIDATE' }] };
    for (const call of calls) await expect(call(user)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('denies unauthenticated requests', async () => {
    for (const call of calls) await expect(call(null)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns 404 for missing candidate on every operation', async () => {
    repository.findCandidate.mockResolvedValue(null);
    for (const call of calls) await expect(call(recruiter)).rejects.toMatchObject({ statusCode: 404 });
  });

  it.each(['0', '-1', '1.5', '1abc', '2147483648'])('rejects invalid candidate ID %s', async id => {
    await expect(service.getNotes(id, recruiter)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.findCandidate).not.toHaveBeenCalled();
  });

  it('allows Hiring Manager to read tags/notes in own department', async () => {
    await service.getTags(1, staff('HIRING_MANAGER'));
    await service.getNotes(1, staff('HIRING_MANAGER'));
    expect(repository.findRequestDepartment).toHaveBeenCalledWith(10);
  });

  it.each([null, 3])('denies Hiring Manager when department is %j', async department => {
    repository.findRequestDepartment.mockResolvedValue(department);
    await expect(service.getTags(1, staff('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.getNotes(1, staff('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.getTags).not.toHaveBeenCalled();
    expect(repository.getNotes).not.toHaveBeenCalled();
  });

  it('denies unassigned candidates and users without a department', async () => {
    await expect(service.getNotes(1, { ...staff('HIRING_MANAGER'), department_id: null }))
      .rejects.toMatchObject({ statusCode: 403 });
    repository.findCandidate.mockResolvedValue({ id: 1, recruitment_request_id: null });
    await expect(service.getTags(1, staff('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.findRequestDepartment).not.toHaveBeenCalled();
  });

  it('denies every Hiring Manager write even within own department', async () => {
    for (const index of [1, 2, 4]) {
      await expect(calls[index](staff('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(repository.findCandidate).not.toHaveBeenCalled();
  });

  it('does not require recruitment_requests for staff', async () => {
    await service.getNotes(1, recruiter);
    expect(repository.findRequestDepartment).not.toHaveBeenCalled();
  });
});
