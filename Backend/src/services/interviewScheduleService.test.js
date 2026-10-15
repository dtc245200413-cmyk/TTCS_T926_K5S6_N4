jest.mock('../repositories/interviewScheduleRepository', () => ({
  interviewerRoles: ['INTERVIEWER', 'HIRING_MANAGER', 'HR_MANAGER', 'RECRUITER', 'ADMIN'],
  withTransaction: jest.fn(), supportsDepartmentScope: jest.fn(), getAll: jest.fn(), findById: jest.fn(),
  findForUpdate: jest.fn(), candidateExists: jest.fn(), positionExists: jest.fn(),
  lockInterviewer: jest.fn(), lockRoom: jest.fn(), findConflicts: jest.fn(), insert: jest.fn(),
  update: jest.fn(), cancel: jest.fn(), getOptions: jest.fn()
}));
const repository = require('../repositories/interviewScheduleRepository');
const service = require('./interviewScheduleService');
const user = role => ({ user_id: 7, department_id: 2, roles: [{ role_code: role }] });
const manager = user('RECRUITER');
const connection = {};
const payload = () => ({ candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4,
  start_at: '2026-10-13T10:00:00+07:00', end_at: '2026-10-13T11:00:00+07:00' });
const stored = () => ({ id: 10, ...payload(), status: 'SCHEDULED', start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 04:00:00' });

beforeEach(() => {
  jest.resetAllMocks();
  repository.withTransaction.mockImplementation(work => work(connection));
  repository.candidateExists.mockResolvedValue(true);
  repository.positionExists.mockResolvedValue(true);
  repository.lockInterviewer.mockResolvedValue({ user_id: 3, status: 'ACTIVE', role_codes: ['INTERVIEWER'] });
  repository.lockRoom.mockResolvedValue({ id: 4, category_group: 'INTERVIEW_ROOM', is_active: 1 });
  repository.findConflicts.mockResolvedValue([]);
  repository.insert.mockResolvedValue(10);
  repository.findForUpdate.mockResolvedValue(stored());
  repository.findById.mockResolvedValue(stored());
  repository.supportsDepartmentScope.mockResolvedValue(true);
  repository.getAll.mockResolvedValue([]);
});

describe('create and validation', () => {
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER'])('allows %s to create with trusted creator and UTC times', async role => {
    await expect(service.create(payload(), user(role))).resolves.toMatchObject({ id: 10 });
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({
      candidate_id: 1, start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 04:00:00'
    }), 7, connection);
    expect(repository.lockInterviewer.mock.invocationCallOrder[0]).toBeLessThan(repository.lockRoom.mock.invocationCallOrder[0]);
    expect(repository.lockRoom.mock.invocationCallOrder[0]).toBeLessThan(repository.findConflicts.mock.invocationCallOrder[0]);
    expect(repository.findConflicts.mock.invocationCallOrder[0]).toBeLessThan(repository.insert.mock.invocationCallOrder[0]);
  });

  it.each(['2026-10-13T10:00:00+07:00', '2026-10-13T09:00:00+07:00'])('rejects end <= start (%s)', async end_at => {
    await expect(service.create({ ...payload(), end_at }, manager)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });

  it.each(['2026-02-30T10:00:00Z', '2026-10-13T25:00:00Z', '2026-10-13T10:61:00Z',
    '2026-10-13 10:00:00', '2026-10-13T10:00:00', '2026-10-13T10:00:00+14:30',
    '2026-10-13T10:00:00.001Z', 'not-a-date', null, 123])('rejects invalid/ambiguous datetime %j', async start_at => {
    await expect(service.create({ ...payload(), start_at }, manager)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('accepts a valid leap day and timezone offset across dates', async () => {
    await service.create({ ...payload(), start_at: '2028-02-29T23:30:00-02:00', end_at: '2028-03-01T03:00:00Z' }, manager);
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({ start_at: '2028-03-01 01:30:00' }), 7, connection);
  });

  it.each(['candidate_id', 'position_id', 'interviewer_id', 'room_id'])('rejects invalid %s', async field => {
    await expect(service.create({ ...payload(), [field]: '1 OR 1=1' }, manager)).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([
    ['candidateExists', false, 404], ['positionExists', false, 404], ['lockInterviewer', null, 404],
    ['lockInterviewer', { status: 'INACTIVE', role_codes: ['INTERVIEWER'] }, 400],
    ['lockInterviewer', { status: 'ACTIVE', role_codes: ['APPROVER'] }, 400],
    ['lockInterviewer', { status: 'ACTIVE', role_codes: ['ADMIN', 'CANDIDATE'] }, 400],
    ['lockRoom', null, 404], ['lockRoom', { category_group: 'CANDIDATE_TAG', is_active: 1 }, 400],
    ['lockRoom', { category_group: 'INTERVIEW_ROOM', is_active: 0 }, 400]
  ])('rejects invalid reference from %s: %j', async (method, result, statusCode) => {
    repository[method].mockResolvedValue(result);
    await expect(service.create(payload(), manager)).rejects.toMatchObject({ statusCode });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it.each(['created_by', 'updated_by', 'created_at', 'status'])('rejects client-supplied %s on create', async field => {
    await expect(service.create({ ...payload(), [field]: field === 'status' ? 'CANCELLED' : 999 }, manager))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe('conflicts and updates', () => {
  it.each([
    [[{ interviewer_id: 3, room_id: 9 }], 'Người phỏng vấn'],
    [[{ interviewer_id: 9, room_id: 4 }], 'Phòng phỏng vấn'],
    [[{ interviewer_id: 3, room_id: 4 }], 'Người phỏng vấn đã có lịch và phòng phỏng vấn'],
    [[{ interviewer_id: 3, room_id: 8 }, { interviewer_id: 9, room_id: 4 }], 'Người phỏng vấn đã có lịch và phòng phỏng vấn']
  ])('returns 409 identifying occupied resources: %j', async (conflicts, message) => {
    repository.findConflicts.mockResolvedValue(conflicts);
    await expect(service.create(payload(), manager)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining(message) });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('PATCH excludes itself, preserves unchanged fields and uses trusted updater', async () => {
    await service.update('10', { end_at: '2026-10-13T12:00:00+07:00' }, manager);
    expect(repository.findForUpdate).toHaveBeenCalledWith(10, connection);
    expect(repository.findConflicts).toHaveBeenCalledWith(expect.objectContaining({ start_at: '2026-10-13 03:00:00', end_at: '2026-10-13 05:00:00' }), 10, connection);
    expect(repository.update).toHaveBeenCalledWith(10, expect.objectContaining({ candidate_id: 1, room_id: 4 }), 7, connection);
  });

  it.each([
    [{ start_at: '2026-10-13T10:30:00+07:00' }, { interviewer_id: 3, room_id: 9 }],
    [{ room_id: 8 }, { interviewer_id: 9, room_id: 8 }]
  ])('rejects PATCH moving into conflict: %j', async (patch, conflict) => {
    repository.findConflicts.mockResolvedValue([conflict]);
    await expect(service.update(10, patch, manager)).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each(['created_by', 'updated_by', 'created_at', 'updated_at', 'candidate_id', 'status'])('rejects PATCH field %s', async field => {
    await expect(service.update(10, { [field]: 999 }, manager)).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an empty PATCH or a reversed merged time range', async () => {
    await expect(service.update(10, {}, manager)).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.update(10, { start_at: '2026-10-13T12:00:00+07:00' }, manager)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects editing a cancelled schedule', async () => {
    repository.findForUpdate.mockResolvedValue({ ...stored(), status: 'CANCELLED' });
    await expect(service.update(10, { room_id: 8 }, manager)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('cancels without revalidating inactive historical resources', async () => {
    await service.cancel(10, {}, manager);
    expect(repository.cancel).toHaveBeenCalledWith(10, 7, connection);
    expect(repository.lockRoom).not.toHaveBeenCalled();
    expect(repository.findConflicts).not.toHaveBeenCalled();
  });

  it('treats repeated cancel as idempotent without overwriting audit identity', async () => {
    repository.findForUpdate.mockResolvedValue({ ...stored(), status: 'CANCELLED' });
    await service.cancel(10, undefined, manager);
    expect(repository.cancel).not.toHaveBeenCalled();
  });

  it('rejects a forged updater in cancel', async () => {
    await expect(service.cancel(10, { updated_by: 999 }, manager)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 404 for missing schedules on PATCH/cancel', async () => {
    repository.findForUpdate.mockResolvedValue(null);
    await expect(service.update(10, { room_id: 8 }, manager)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.cancel(10, {}, manager)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('authorization and reads', () => {
  const calls = [
    actor => service.getAll({}, actor), actor => service.getById(10, actor), actor => service.getOptions(actor),
    actor => service.create(payload(), actor), actor => service.update(10, { room_id: 8 }, actor), actor => service.cancel(10, {}, actor)
  ];
  it.each(['CANDIDATE', 'APPROVER', 'UNKNOWN'])('denies %s on all endpoints', async role => {
    for (const call of calls) await expect(call(user(role))).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });
  it('denies Candidate even when also assigned ADMIN', async () => {
    const actor = { ...manager, roles: [{ role_code: 'CANDIDATE' }, { role_code: 'ADMIN' }] };
    for (const call of calls) await expect(call(actor)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('requires authentication', async () => {
    for (const call of calls) await expect(call(null)).rejects.toMatchObject({ statusCode: 401 });
  });
  it.each(['INTERVIEWER', 'HIRING_MANAGER'])('denies %s writes and global options', async role => {
    for (const call of calls.slice(2)) await expect(call(user(role))).rejects.toMatchObject({ statusCode: 403 });
  });
  it('scopes INTERVIEWER reads by authenticated ID, even with conflicting filters', async () => {
    await service.getAll({ interviewer_id: '999' }, user('INTERVIEWER'));
    expect(repository.getAll).toHaveBeenCalledWith({ interviewer_id: 999 }, { type: 'interviewer', userId: 7 });
    await service.getById(10, user('INTERVIEWER'));
    expect(repository.findById).toHaveBeenCalledWith(10, { type: 'interviewer', userId: 7 });
  });
  it('rejects out-of-scope detail as not found', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getById(10, user('INTERVIEWER'))).rejects.toMatchObject({ statusCode: 404 });
  });
  it('applies Hiring Manager department on list and detail', async () => {
    await service.getAll({}, user('HIRING_MANAGER'));
    await service.getById(10, user('HIRING_MANAGER'));
    expect(repository.getAll).toHaveBeenCalledWith({}, { type: 'department', departmentId: 2 });
    expect(repository.findById).toHaveBeenCalledWith(10, { type: 'department', departmentId: 2 });
  });
  it('denies Hiring Manager if recruitment scope schema is absent', async () => {
    repository.supportsDepartmentScope.mockResolvedValue(false);
    await expect(service.getAll({}, user('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.getById(10, user('HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.getAll).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
  });
  it('denies Hiring Manager without department, while managers do not need recruitment_requests', async () => {
    await expect(service.getAll({}, { ...user('HIRING_MANAGER'), department_id: null })).rejects.toMatchObject({ statusCode: 403 });
    await service.getAll({}, manager);
    expect(repository.supportsDepartmentScope).not.toHaveBeenCalled();
  });
  it('normalizes valid list filters', async () => {
    await service.getAll({ candidate_id: '1', room_id: '4', status: 'CANCELLED', from: '2026-10-13T10:00:00+07:00', to: '2026-10-13T12:00:00+07:00' }, manager);
    expect(repository.getAll).toHaveBeenCalledWith({ candidate_id: 1, room_id: 4, status: 'CANCELLED', from: '2026-10-13 03:00:00', to: '2026-10-13 05:00:00' }, { type: 'all' });
  });
  it.each([{ status: 'INVALID' }, { room_id: '-1' }, { from: '2026-10-13' }, { from: '2026-10-13T12:00:00Z', to: '2026-10-13T11:00:00Z' }])('rejects invalid filter %j', async filters => {
    await expect(service.getAll(filters, manager)).rejects.toMatchObject({ statusCode: 400 });
  });
});
