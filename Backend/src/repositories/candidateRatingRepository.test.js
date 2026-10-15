jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));
const { pool } = require('../config/database');
const repo = require('./candidateRatingRepository');

describe('SCRUM-215 - candidate rating SQL contracts (mock database)', () => {
  beforeEach(() => jest.resetAllMocks());

  it('checks candidate existence and status without recruitment_requests', async () => {
    pool.execute.mockResolvedValue([[{ id: 7, status: 'REJECTED' }]]);
    expect(await repo.findCandidateById(7)).toEqual({ id: 7, status: 'REJECTED' });
    expect(pool.execute).toHaveBeenCalledWith('SELECT id, status, recruitment_request_id, merged_into_id FROM candidates WHERE id = ? LIMIT 1', [7]);
    pool.execute.mockResolvedValue([[]]);
    expect(await repo.findCandidateById(8)).toBeNull();
  });

  it('uses one parameterized upsert and never overwrites identity or created_at', async () => {
    pool.execute.mockResolvedValue([{ affectedRows: 1 }]);
    const comment = "Nội dung ' ?";
    await repo.upsertRating(7, 10, 4, comment, pool);
    expect(pool.execute).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO candidate_ratings/);
    expect(sql).toMatch(/ON DUPLICATE KEY UPDATE rating = \?, comment = \?/);
    expect(params).toEqual([7, 10, 4, comment, 4, comment]);
    expect(sql).not.toContain(comment);
  });

  it('selects only the required reviewer fields', async () => {
    const rows = [{ reviewer_id: 10, reviewer_name: 'Reviewer', rating: 5, comment: null }];
    pool.execute.mockResolvedValue([rows]);
    expect(await repo.getRatingsByCandidate(7)).toEqual(rows);
    const [sql, params] = pool.execute.mock.calls[0];
    expect(sql).toMatch(/SELECT cr.reviewer_id, u.full_name AS reviewer_name,\s+cr.rating, cr.comment, cr.created_at, cr.updated_at/);
    expect(sql).not.toMatch(/SELECT\s+\*|password|token|company_email/);
    expect(params).toEqual([7]);
  });

  it('looks up the current rating by both candidate and reviewer', async () => {
    pool.execute.mockResolvedValue([[{ rating: 5, comment: null }]]);
    expect(await repo.getRatingByReviewer(7, 10)).toMatchObject({ rating: 5 });
    expect(pool.execute.mock.calls[0][0]).toMatch(/candidate_id = \? AND reviewer_id = \?/);
    expect(pool.execute.mock.calls[0][1]).toEqual([7, 10]);
    pool.execute.mockResolvedValue([[]]);
    expect(await repo.getRatingByReviewer(7, 20)).toBeNull();
  });

  it('returns numeric aggregates instead of mysql decimal strings', async () => {
    pool.execute.mockResolvedValue([[{ average_rating: '4.0000', rating_count: 2 }]]);
    expect(await repo.getSummary(7)).toEqual({ average_rating: 4, rating_count: 2 });
    expect(pool.execute.mock.calls[0][0]).toMatch(/AVG\(rating\).*COUNT\(\*\)/);
    expect(pool.execute.mock.calls[0][1]).toEqual([7]);
  });

  it('preserves null average for candidates without ratings', async () => {
    pool.execute.mockResolvedValue([[{ average_rating: null, rating_count: 0 }]]);
    expect(await repo.getSummary(7)).toEqual({ average_rating: null, rating_count: 0 });
  });
});
