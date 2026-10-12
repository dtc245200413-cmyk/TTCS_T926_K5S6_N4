jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));
jest.mock('../repositories/candidateRatingRepository', () => ({
  findCandidateById: jest.fn(),
  upsertRating: jest.fn(),
  getRatingsByCandidate: jest.fn(),
  getRatingByReviewer: jest.fn(),
  getSummary: jest.fn()
}));

const repo = require('../repositories/candidateRatingRepository');
const { saveMyRating, getCandidateRatings } = require('./candidateService');
const user = (id = 10, role = 'RECRUITER') => ({ user_id: id, roles: [{ role_code: role }] });

describe('SCRUM-215/216 - candidate ratings service', () => {
  let records;

  beforeEach(() => {
    jest.resetAllMocks();
    // Stateful repository double tests the service workflow, not MySQL constraints.
    records = new Map();
    repo.findCandidateById.mockResolvedValue({ id: 1 });
    repo.upsertRating.mockImplementation(async (candidateId, reviewerId, rating, comment) => {
      const key = `${candidateId}:${reviewerId}`;
      records.set(key, { candidate_id: candidateId, reviewer_id: reviewerId, rating, comment });
    });
    repo.getRatingByReviewer.mockImplementation(async (candidateId, reviewerId) => {
      const row = records.get(`${candidateId}:${reviewerId}`);
      return row ? { rating: row.rating, comment: row.comment } : null;
    });
    repo.getRatingsByCandidate.mockImplementation(async candidateId =>
      [...records.values()].filter(row => row.candidate_id === candidateId));
    repo.getSummary.mockImplementation(async candidateId => {
      const rows = [...records.values()].filter(row => row.candidate_id === candidateId);
      return {
        average_rating: rows.length ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length : null,
        rating_count: rows.length
      };
    });
  });

  it.each([1, 2, 3, 4, 5])('accepts integer rating %s', async rating => {
    const result = await saveMyRating('1', { rating }, user());
    expect(result).toEqual({ average_rating: rating, rating_count: 1, my_rating: { rating, comment: null } });
  });

  it.each([0, 6, 3.5, '5', null, undefined, true, NaN, Infinity])('rejects invalid rating %s', async rating => {
    await expect(saveMyRating('1', { rating }, user())).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', 'abc', '1abc', '1e2', ' 1', '2147483648', undefined])('rejects invalid candidate ID %s', async id => {
    await expect(saveMyRating(id, { rating: 3 }, user())).rejects.toMatchObject({ statusCode: 400 });
    await expect(getCandidateRatings(id, user())).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.findCandidateById).not.toHaveBeenCalled();
  });

  it('rejects comments longer than 2000 characters', async () => {
    await expect(saveMyRating('1', { rating: 5, comment: 'a'.repeat(2001) }, user()))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it('accepts 2000 Unicode characters and trims surrounding whitespace', async () => {
    const comment = '🙂'.repeat(2000);
    await saveMyRating('1', { rating: 5, comment: `  ${comment}\n` }, user());
    expect(repo.upsertRating).toHaveBeenCalledWith(1, 10, 5, comment);
  });

  it.each([undefined, null, '', ' \n\t '])('normalizes optional comment %s to null', async comment => {
    await saveMyRating('1', { rating: 4, comment }, user());
    expect(repo.upsertRating).toHaveBeenCalledWith(1, 10, 4, null);
  });

  it.each([23, false, {}, []])('rejects non-string comment %j', async comment => {
    await expect(saveMyRating('1', { rating: 4, comment }, user())).rejects.toMatchObject({ statusCode: 400 });
  });

  it.each([undefined, null, [], 'invalid'])('rejects invalid request body %j', async body => {
    await expect(saveMyRating('1', body, user())).rejects.toMatchObject({ statusCode: 400 });
  });

  it('saves the first rating and trims the internal comment', async () => {
    const result = await saveMyRating('1', { rating: 3, comment: '  Phù hợp  ' }, user());
    expect(records.size).toBe(1);
    expect(result.my_rating).toEqual({ rating: 3, comment: 'Phù hợp' });
    expect(repo.upsertRating).toHaveBeenCalledWith(1, 10, 3, 'Phù hợp');
  });

  it('updates the same reviewer rating and comment, then clears the comment', async () => {
    await saveMyRating('1', { rating: 3, comment: 'Ban đầu' }, user());
    const updated = await saveMyRating('1', { rating: 5, comment: ' Cập nhật ' }, user());
    expect(records.size).toBe(1);
    expect(updated).toEqual({ average_rating: 5, rating_count: 1, my_rating: { rating: 5, comment: 'Cập nhật' } });
    const cleared = await saveMyRating('1', { rating: 5, comment: '' }, user());
    expect(cleared.my_rating.comment).toBeNull();
    expect(records.size).toBe(1);
  });

  it('keeps two reviewers separate; average 3 and 5 = 4, then 1 and 5 = 3', async () => {
    await saveMyRating('1', { rating: 3 }, user(10));
    const second = await saveMyRating('1', { rating: 5, comment: 'Giữ nguyên' }, user(20));
    expect(second).toMatchObject({ average_rating: 4, rating_count: 2 });
    const updated = await saveMyRating('1', { rating: 1 }, user(10));
    expect(updated).toMatchObject({ average_rating: 3, rating_count: 2 });
    const list = await getCandidateRatings('1', user(20));
    expect(list.my_rating).toEqual({ rating: 5, comment: 'Giữ nguyên' });
    expect(list.ratings).toHaveLength(2);
    expect(records.size).toBe(2);
  });

  it('isolates ratings for different candidates', async () => {
    await saveMyRating('1', { rating: 1 }, user());
    await saveMyRating('2', { rating: 5 }, user());
    expect(await getCandidateRatings('1', user())).toMatchObject({ average_rating: 1, rating_count: 1 });
  });

  it('returns the specified empty response', async () => {
    expect(await getCandidateRatings('1', user())).toEqual({
      average_rating: null, rating_count: 0, my_rating: null, ratings: []
    });
  });

  it('returns null my_rating when only another reviewer has rated', async () => {
    await saveMyRating('1', { rating: 4 }, user(20));
    expect(await getCandidateRatings('1', user(10))).toMatchObject({ average_rating: 4, rating_count: 1, my_rating: null });
  });

  it.each([99, 10, null])('rejects reviewer_id %s from the body', async reviewerId => {
    await expect(saveMyRating('1', { rating: 5, reviewer_id: reviewerId }, user()))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it.each(['RECRUITER', 'HR_MANAGER', 'ADMIN'])('allows %s to write and read their own rating', async role => {
    await saveMyRating('1', { rating: 5 }, user(10, role));
    expect((await getCandidateRatings('1', user(10, role))).my_rating.rating).toBe(5);
  });

  it('allows HIRING_MANAGER to read but not write', async () => {
    await expect(getCandidateRatings('1', user(10, 'HIRING_MANAGER'))).resolves.toMatchObject({ ratings: [] });
    await expect(saveMyRating('1', { rating: 4 }, user(10, 'HIRING_MANAGER'))).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it.each(['CANDIDATE', 'INTERVIEWER', 'APPROVER', 'UNKNOWN'])('denies role %s', async role => {
    await expect(getCandidateRatings('1', user(10, role))).rejects.toMatchObject({ statusCode: 403 });
    await expect(saveMyRating('1', { rating: 4 }, user(10, role))).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.findCandidateById).not.toHaveBeenCalled();
  });

  it('denies a user without roles', async () => {
    await expect(getCandidateRatings('1', { user_id: 10 })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('requires authentication for reads and writes', async () => {
    await expect(getCandidateRatings('1', null)).rejects.toMatchObject({ statusCode: 401 });
    await expect(saveMyRating('1', { rating: 4 }, null)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns 404 for a missing candidate', async () => {
    repo.findCandidateById.mockResolvedValue(null);
    await expect(getCandidateRatings('1', user())).rejects.toMatchObject({ statusCode: 404 });
    await expect(saveMyRating('1', { rating: 4 }, user())).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.upsertRating).not.toHaveBeenCalled();
  });

  it('propagates database failures to the controller error handler', async () => {
    const error = new Error('Database unavailable');
    repo.upsertRating.mockRejectedValue(error);
    await expect(saveMyRating('1', { rating: 4 }, user())).rejects.toBe(error);
  });
});
