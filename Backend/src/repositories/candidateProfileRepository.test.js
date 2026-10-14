jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const repository = require('./candidateProfileRepository');

beforeEach(() => jest.resetAllMocks());

it('checks candidate existence without requiring the scope table', async () => {
  pool.execute.mockResolvedValue([[{ id: 1, recruitment_request_id: null }]]);
  await expect(repository.findCandidate(1)).resolves.toMatchObject({ id: 1 });
  expect(pool.execute.mock.calls[0][0]).not.toContain('JOIN');
  expect(pool.execute.mock.calls[0][1]).toEqual([1]);
});

it.each(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'])('fails closed for unavailable department schema: %s', async code => {
  pool.execute.mockRejectedValue({ code });
  await expect(repository.findRequestDepartment(8)).resolves.toBeNull();
});

it('propagates unrelated database errors instead of treating them as missing scope', async () => {
  const error = { code: 'ECONNRESET' };
  pool.execute.mockRejectedValue(error);
  await expect(repository.findRequestDepartment(8)).rejects.toBe(error);
});

it('reads assigned tags including inactive catalogue entries', async () => {
  const tags = [{ tag_id: 12, is_active: 0 }];
  pool.execute.mockResolvedValue([tags]);
  await expect(repository.getTags(1)).resolves.toEqual(tags);
  const [sql, params] = pool.execute.mock.calls[0];
  expect(sql).toContain('WHERE ct.candidate_id = ?');
  expect(sql.split('WHERE')[1]).not.toContain('is_active');
  expect(params).toEqual([1]);
});

it('removes only the specified candidate/tag pair', async () => {
  pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
  await expect(repository.removeTag(1, 12)).resolves.toBe(true);
  expect(pool.execute).toHaveBeenCalledWith(expect.stringContaining('candidate_id = ? AND tag_id = ?'), [1, 12]);
});

it('selects note authors and orders newest first with a stable tie breaker', async () => {
  pool.execute.mockResolvedValue([[]]);
  await repository.getNotes(1);
  const [sql, params] = pool.execute.mock.calls[0];
  expect(sql).toContain('u.full_name AS author_name');
  expect(sql).toContain('u.user_id = n.author_id');
  expect(sql).toContain('WHERE n.candidate_id = ?');
  expect(sql).toContain('ORDER BY n.created_at DESC, n.id DESC');
  expect(params).toEqual([1]);
});

describe('transaction handling', () => {
  let connection;
  beforeEach(() => {
    connection = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(), execute: jest.fn() };
    pool.getConnection.mockResolvedValue(connection);
  });

  it('locks catalogue validation and commits insertion using the same connection', async () => {
    connection.execute.mockResolvedValueOnce([[{ id: 12 }]]).mockResolvedValueOnce([{ affectedRows: 1 }]);
    await repository.withTransaction(async conn => {
      await repository.findTagForUpdate(12, conn);
      await repository.insertTag(1, 12, 7, conn);
    });
    expect(connection.execute.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(connection.execute.mock.calls[1][1]).toEqual([1, 12, 7]);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('inserts the supplied authenticated author and returns the persisted note', async () => {
    const note = { id: 5, author_id: 7, author_name: 'Recruiter', note_content: 'Hello', created_at: '2026-10-13' };
    connection.execute.mockResolvedValueOnce([{ insertId: 5 }]).mockResolvedValueOnce([[note]]);
    await expect(repository.withTransaction(conn => repository.insertNote(1, 7, 'Hello', conn))).resolves.toEqual(note);
    expect(connection.execute.mock.calls[0][1]).toEqual([1, 7, 'Hello']);
    expect(connection.execute.mock.calls[1][1]).toEqual([5]);
  });

  it.each(['ER_DUP_ENTRY', 'ER_NO_SUCH_TABLE', 'ECONNRESET'])('rolls back and releases after %s', async code => {
    const error = { code };
    connection.execute.mockRejectedValue(error);
    await expect(repository.withTransaction(conn => repository.insertTag(1, 12, 7, conn))).rejects.toBe(error);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('preserves the original error if rollback also fails', async () => {
    const error = new Error('connection lost');
    connection.rollback.mockRejectedValue(new Error('rollback failed'));
    await expect(repository.withTransaction(async () => { throw error; })).rejects.toBe(error);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});
