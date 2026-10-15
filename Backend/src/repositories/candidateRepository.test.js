jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), query: jest.fn() } }));


describe('SCRUM-129 regression suite', () => {

const { pool } = require('../config/database');
const repo = require('./candidateRepository');
const user = (...roles) => ({ department_id: 7, roles: roles.map(role_code => ({ role_code })) });
const missingTable = (table = 'recruitment_requests') => Object.assign(
  new Error(`Table 'internal_recruitment_system.${table}' doesn't exist`),
  { code: 'ER_NO_SUCH_TABLE', sqlMessage: `Table 'internal_recruitment_system.${table}' doesn't exist` }
);

describe('candidateRepository - missing recruitment_requests fallback', () => {
  beforeEach(() => jest.resetAllMocks());

  it('findById prefers the original join when available', async () => {
    const candidate = { id: 4, department_id: 7, position_id: 2 };
    pool.execute.mockResolvedValue([[candidate]]);
    expect(await repo.findById(4)).toEqual(candidate);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(pool.execute.mock.calls[0][0]).toContain('LEFT JOIN recruitment_requests');
    expect(pool.execute.mock.calls[0][1]).toEqual([4]);
  });

  it.each([true, false])('findById falls back with sqlMessage present = %s', async hasSqlMessage => {
    const error = missingTable();
    if (!hasSqlMessage) delete error.sqlMessage;
    pool.execute.mockRejectedValueOnce(error).mockResolvedValueOnce([[{ id: 4, full_name: 'Candidate' }]]);
    expect(await repo.findById(4)).toEqual({ id: 4, full_name: 'Candidate' });
    expect(pool.execute).toHaveBeenCalledTimes(2);
    const [sql, params] = pool.execute.mock.calls[1];
    expect(sql).toMatch(/SELECT c\.\*\s+FROM candidates c\s+WHERE c.id = \?\s+LIMIT 1/);
    expect(sql).not.toMatch(/JOIN/);
    expect(params).toEqual([4]);
  });

  it('findById returns null when fallback finds no candidate', async () => {
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([[]]);
    expect(await repo.findById(99)).toBeNull();
  });

  it('findById returns null without fallback for an empty successful query', async () => {
    pool.execute.mockResolvedValue([[]]);
    expect(await repo.findById(99)).toBeNull();
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it.each(['RECRUITER', 'HR_MANAGER', 'ADMIN'])('getAll allows %s fallback with null joined fields', async role => {
    const rows = [{ id: 4, job_reason: null, department_name: null, position_name: null }];
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([rows]);
    expect(await repo.getAll(user(role))).toEqual(rows);
    expect(pool.execute).toHaveBeenCalledTimes(2);
    expect(pool.execute.mock.calls[0][0]).toContain('LEFT JOIN recruitment_requests');
    const [sql] = pool.execute.mock.calls[1];
    expect(sql).toContain('NULL AS job_reason, NULL AS department_name, NULL AS position_name');
    expect(sql).toMatch(/FROM candidates c\s+ORDER BY c.created_at DESC/);
    expect(sql).not.toMatch(/JOIN/);
  });

  it('getAll fails closed for a department-scoped HIRING_MANAGER', async () => {
    pool.execute.mockRejectedValueOnce(missingTable());
    expect(await repo.getAll(user('HIRING_MANAGER'))).toEqual([]);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(pool.execute.mock.calls[0][0]).toContain('AND r.department_id = ?');
    expect(pool.execute.mock.calls[0][1]).toEqual([7]);
  });

  it.each(['RECRUITER', 'HR_MANAGER', 'ADMIN'])('preserves full access for HIRING_MANAGER also assigned %s', async role => {
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([[{ id: 4 }]]);
    expect(await repo.getAll(user('HIRING_MANAGER', role))).toEqual([{ id: 4 }]);
    expect(pool.execute.mock.calls[0][1]).toEqual([]);
  });

  it.each([undefined, {}, user(), user('CANDIDATE'), user('INTERVIEWER'), user('APPROVER')])('does not grant full fallback access to unsupported users %j', async account => {
    pool.execute.mockRejectedValueOnce(missingTable());
    expect(await repo.getAll(account)).toEqual([]);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it.each(['RECRUITER', 'HIRING_MANAGER'])('preserves the successful getAll join for %s', async role => {
    const rows = [{ id: 4, department_name: 'Engineering', position_name: 'Developer', job_reason: 'Tăng mới' }];
    pool.execute.mockResolvedValue([rows]);
    expect(await repo.getAll(user(role))).toEqual(rows);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.execute.mock.calls[0];
    for (const table of ['recruitment_requests', 'departments', 'job_positions']) {
      expect(sql).toContain(`LEFT JOIN ${table}`);
    }
    expect(params).toEqual(role === 'HIRING_MANAGER' ? [7] : []);
  });

  describe.each([
    ['findById', () => repo.findById(4)],
    ['getAll', () => repo.getAll(user('RECRUITER'))],
  ])('%s error propagation', (_name, call) => {
    it.each(['candidates', 'departments', 'job_positions', 'recruitment_requests_archive'])('rethrows missing %s instead of hiding it', async table => {
      const error = missingTable(table);
      error.sql = 'SELECT * FROM candidates LEFT JOIN recruitment_requests';
      pool.execute.mockRejectedValueOnce(error);
      await expect(call()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it.each(['ER_ACCESS_DENIED_ERROR', 'ER_BAD_FIELD_ERROR', 'ECONNREFUSED'])('rethrows %s', async code => {
      const error = Object.assign(new Error('Database unavailable'), { code });
      pool.execute.mockRejectedValueOnce(error);
      await expect(call()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('rethrows ER_NO_SUCH_TABLE without a diagnostic identifying the table', async () => {
      const error = Object.assign(new Error('Unknown missing table'), { code: 'ER_NO_SUCH_TABLE' });
      pool.execute.mockRejectedValueOnce(error);
      await expect(call()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the fallback query', async () => {
      const error = Object.assign(new Error('Connection lost'), { code: 'PROTOCOL_CONNECTION_LOST' });
      pool.execute.mockRejectedValueOnce(missingTable()).mockRejectedValueOnce(error);
      await expect(call()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(2);
    });
  });
});
});

describe('develop2 regression suite', () => {

const { pool } = require('../config/database');
const repository = require('./candidateRepository');
const user = role => ({ department_id: 2, roles: [{ role_code: role }] });
const missingTable = (table = 'recruitment_requests') => Object.assign(
  new Error(`Table 'internal_recruitment_system.${table}' doesn't exist`),
  { code: 'ER_NO_SUCH_TABLE', sqlMessage: `Table 'internal_recruitment_system.${table}' doesn't exist` }
);

beforeEach(() => jest.resetAllMocks());

describe('candidateRepository: missing recruitment_requests fallback', () => {
  it.each(['RECRUITER', 'HR_MANAGER', 'ADMIN'])('allows %s to read candidates with null job fields', async role => {
    const candidates = [{ id: 1, full_name: 'Candidate', job_reason: null, department_name: null, position_name: null }];
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([candidates]);

    await expect(repository.getAll(user(role))).resolves.toEqual(candidates);
    expect(pool.execute).toHaveBeenCalledTimes(2);
    expect(pool.execute.mock.calls[0][0]).toContain('LEFT JOIN recruitment_requests');
    const sql = pool.execute.mock.calls[1][0];
    expect(sql).toContain('SELECT c.*, NULL AS job_reason, NULL AS department_name, NULL AS position_name');
    expect(sql).toContain('FROM candidates c');
    expect(sql).toContain('ORDER BY c.created_at DESC');
    expect(sql).not.toContain('JOIN');
  });

  it('does not expose all candidates to Hiring Manager when scope is unavailable', async () => {
    pool.execute.mockRejectedValueOnce(missingTable());
    await expect(repository.getAll(user('HIRING_MANAGER'))).resolves.toEqual([]);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(pool.execute.mock.calls[0][0]).toContain('AND r.department_id = ?');
    expect(pool.execute.mock.calls[0][1]).toEqual([2]);
  });

  it.each([undefined, { roles: [] }, user('INTERVIEWER'), user('CANDIDATE')])('does not grant fallback access without a staff role: %j', async identity => {
    pool.execute.mockRejectedValueOnce(missingTable());
    await expect(repository.getAll(identity)).resolves.toEqual([]);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('retains existing broader staff access for a user who also has Hiring Manager role', async () => {
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([[{ id: 1 }]]);
    await expect(repository.getAll({ roles: [{ role_code: 'HIRING_MANAGER' }, { role_code: 'RECRUITER' }] }))
      .resolves.toEqual([{ id: 1 }]);
  });

  it('findById retries a parameterized candidates-only query', async () => {
    const candidate = { id: 7, full_name: 'Candidate' };
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([[candidate]]);
    await expect(repository.findById(7)).resolves.toEqual(candidate);
    expect(pool.execute.mock.calls[0][0]).toContain('LEFT JOIN recruitment_requests');
    expect(pool.execute.mock.calls[1][0].replace(/\s+/g, ' ').trim())
      .toBe('SELECT c.* FROM candidates c WHERE c.id = ? LIMIT 1');
    expect(pool.execute.mock.calls[1][1]).toEqual([7]);
  });

  it('findById returns null when the fallback finds no candidate', async () => {
    pool.execute.mockRejectedValueOnce(missingTable()).mockResolvedValueOnce([[]]);
    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it('accepts the standard unqualified diagnostic from error.message', async () => {
    pool.execute.mockRejectedValueOnce(Object.assign(new Error("Table 'recruitment_requests' doesn't exist"), { code: 'ER_NO_SUCH_TABLE' }))
      .mockResolvedValueOnce([[{ id: 1 }]]);
    await expect(repository.findById(1)).resolves.toEqual({ id: 1 });
  });
});

describe('primary queries and database errors', () => {
  const operations = [
    ['getAll', () => repository.getAll(user('RECRUITER'))],
    ['findById', () => repository.findById(1)]
  ];

  it('keeps successful primary list results without fallback', async () => {
    const rows = [{ id: 1, department_name: 'HR', position_name: 'Developer' }];
    pool.execute.mockResolvedValueOnce([rows]);
    await expect(repository.getAll(user('HIRING_MANAGER'))).resolves.toEqual(rows);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(pool.execute.mock.calls[0][0]).toContain('LEFT JOIN recruitment_requests');
    expect(pool.execute.mock.calls[0][1]).toEqual([2]);
  });

  it('keeps successful primary findById results without fallback', async () => {
    const candidate = { id: 1, department_id: 2, position_id: 3 };
    pool.execute.mockResolvedValueOnce([[candidate]]);
    await expect(repository.findById(1)).resolves.toEqual(candidate);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  describe.each(operations)('%s', (name, operation) => {
    it.each(['candidates', 'departments', 'job_positions', 'recruitment_requests_archive'])('rethrows missing %s even when query text mentions recruitment_requests', async table => {
      const error = missingTable(table);
      error.sql = 'SELECT * FROM candidates LEFT JOIN recruitment_requests';
      pool.execute.mockRejectedValueOnce(error);
      await expect(operation()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it.each(['ER_BAD_FIELD_ERROR', 'ER_PARSE_ERROR', 'ECONNRESET', 'ER_TABLEACCESS_DENIED_ERROR'])('rethrows %s regardless of diagnostic text', async code => {
      const error = Object.assign(missingTable(), { code });
      pool.execute.mockRejectedValueOnce(error);
      await expect(operation()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('rethrows a missing-table error whose table cannot be identified', async () => {
      const error = Object.assign(new Error('Missing table'), { code: 'ER_NO_SUCH_TABLE' });
      pool.execute.mockRejectedValueOnce(error);
      await expect(operation()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the fallback query', async () => {
      const error = missingTable('candidates');
      pool.execute.mockRejectedValueOnce(missingTable()).mockRejectedValueOnce(error);
      await expect(operation()).rejects.toBe(error);
      expect(pool.execute).toHaveBeenCalledTimes(2);
    });
  });
});
});
