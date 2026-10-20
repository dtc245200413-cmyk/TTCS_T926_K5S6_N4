jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));

const { pool } = require('../config/database');
const repository = require('./candidatePortalRepository');

beforeEach(() => jest.resetAllMocks());

describe('Candidate Portal Offer SQL contract', () => {
  it('filters by authenticated candidate and a closed list of legacy public statuses', async () => {
    pool.execute.mockResolvedValue([[]]);
    await expect(repository.getOffers(17)).resolves.toEqual([]);
    const [sql, params] = pool.execute.mock.calls[0];
    expect(params).toEqual([17]);
    expect(sql).toMatch(/JOIN candidate_applications a ON a\.id = o\.application_id/);
    expect(sql).toMatch(/WHERE a\.candidate_id = \?\s+AND o\.status IN \('PENDING_RESPONSE', 'ACCEPTED', 'DECLINED'\)\s+ORDER BY/);
    expect(sql).not.toMatch(/\bOR\b/i);
  });

  it('selects only the existing public DTO, never wildcard or internal approval fields', async () => {
    pool.execute.mockResolvedValue([[]]);
    await repository.getOffers(17);
    const [sql] = pool.execute.mock.calls[0];
    const projection = sql.split(/\bFROM\b/)[0].replace(/^\s*SELECT\s+/, '');
    expect(projection.split(',').map(field => field.trim())).toEqual([
      'o.id', 'o.application_id', 'o.salary_amount', 'o.currency', 'o.start_date',
      'o.response_deadline', 'o.message', 'o.status', 'o.candidate_response',
      'o.responded_at', 'o.created_at', 'jp.title AS job_title', 'd.department_name'
    ]);
    expect(projection).not.toContain('*');
  });

  it('keeps the legacy public response unchanged', async () => {
    const row = { id: 4, application_id: 8, salary_amount: '25000000.00',
      currency: 'VND', start_date: '2026-12-01', response_deadline: '2026-11-20',
      message: 'Public offer', status: 'PENDING_RESPONSE', candidate_response: null,
      responded_at: null, created_at: '2026-10-20', job_title: 'Developer', department_name: 'IT' };
    pool.execute.mockResolvedValue([[row]]);
    await expect(repository.getOffers(17)).resolves.toEqual([row]);
  });

  it('atomically restricts responses to the same candidate and PENDING_RESPONSE', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    await expect(repository.respondToOffer(17, 4, { status: 'ACCEPTED', response: 'Yes' })).resolves.toBe(true);
    const [sql, params] = pool.execute.mock.calls[0];
    expect(params).toEqual(['ACCEPTED', 'Yes', 4, 17]);
    expect(sql).toMatch(/WHERE o\.id = \? AND a\.candidate_id = \? AND o\.status = 'PENDING_RESPONSE'/);
    expect(sql).not.toMatch(/\bOR\b/i);
  });

  it('reports no change when the Offer is hidden, already answered or belongs to another candidate', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 0 }]);
    await expect(repository.respondToOffer(17, 4, { status: 'ACCEPTED' })).resolves.toBe(false);
  });

  it('propagates SQL errors instead of falling back to an unfiltered list', async () => {
    pool.execute.mockRejectedValue(new Error('database unavailable'));
    await expect(repository.getOffers(17)).rejects.toThrow('database unavailable');
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });
});
