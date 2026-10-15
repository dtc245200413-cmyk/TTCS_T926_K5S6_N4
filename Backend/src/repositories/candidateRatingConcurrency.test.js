jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const { saveMyRating } = require('../services/candidateService');
const { mergeCandidates } = require('./candidateMergeRepository');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const user = { user_id: 10, roles: [{ role_code: 'RECRUITER' }] };

// Run the real service/repositories/transaction helper on separate connection
// doubles. Model exclusive parent locks, committed reads and transaction-local
// writes. Gates force overlap; no timers, live MySQL, schema or fixture writes.
function database() {
  const candidates = new Map([1, 2].map(id => [id, { id, status: 'NEW', merged_into_id: null }]));
  const ratings = new Map();
  const owners = new Map();
  const connections = [];
  const waited = deferred();
  const commitReached = deferred();
  const resumeCommit = deferred();
  let nextId = 1;
  let pauseFirstCommit = true;
  let failSql = null;
  let failCode = null;
  let rollbackFails = false;
  let commitFails = false;

  pool.getConnection.mockImplementation(async () => {
    const done = deferred();
    const candidateWrites = new Map(), ratingWrites = new Map();
    const locks = [];
    const rows = () => [...new Map([...ratings, ...ratingWrites]).values()];
    const unlock = () => {
      for (const id of locks) if (owners.get(id) === connection) owners.delete(id);
      done.resolve();
    };
    const connection = {
      done, locks,
      beginTransaction: jest.fn(),
      execute: jest.fn(async (sql, params = []) => {
        if (failSql && sql.includes(failSql)) throw Object.assign(new Error('private SQL failure'), { code: failCode });
        if (sql === 'SELECT * FROM candidates WHERE id = ? FOR UPDATE') {
          const id = Number(params[0]);
          while (owners.has(id) && owners.get(id) !== connection) {
            waited.resolve();
            await owners.get(id).done.promise;
          }
          owners.set(id, connection);
          locks.push(id);
          return [[{ ...candidates.get(id) }]];
        }
        if (sql.includes('INSERT INTO candidate_ratings')) {
          const [candidate_id, reviewer_id, rating, comment] = params;
          if (owners.get(candidate_id) !== connection) throw new Error('Rating write without candidate lock');
          const existing = rows().find(row => row.candidate_id === candidate_id && row.reviewer_id === reviewer_id);
          const id = existing?.id || nextId++;
          ratingWrites.set(id, { id, candidate_id, reviewer_id, rating, comment });
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('SELECT rating, comment')) return [rows().filter(row => row.candidate_id === params[0] && row.reviewer_id === params[1])];
        if (sql.includes('AVG(rating)')) {
          const selected = rows().filter(row => row.candidate_id === params[0]);
          return [[{ average_rating: selected.length ? selected.reduce((sum, row) => sum + row.rating, 0) / selected.length : null, rating_count: selected.length }]];
        }
        if (sql.startsWith('UPDATE candidates SET merged_into_id')) {
          candidateWrites.set(params[1], { ...candidates.get(params[1]), merged_into_id: params[0] });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE candidates SET')) return [{ affectedRows: 1 }];
        if (sql.includes('information_schema.columns')) return [[{ table_name: 'candidate_ratings' }]];
        if (sql.startsWith('SELECT candidate_id, reviewer_id')) return [rows().filter(row => params.includes(row.candidate_id))];
        if (sql.startsWith('SELECT id FROM `candidate_ratings`')) return [rows().filter(row => row.candidate_id === params[0])];
        if (sql.startsWith('UPDATE `candidate_ratings`')) {
          for (const row of rows().filter(row => row.candidate_id === params[1])) ratingWrites.set(row.id, { ...row, candidate_id: params[0] });
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO candidate_merges')) return [{ insertId: 1 }];
        throw new Error(`Unhandled SQL in test: ${sql}`);
      }),
      commit: jest.fn(async () => {
        if (pauseFirstCommit) {
          pauseFirstCommit = false;
          commitReached.resolve();
          await resumeCommit.promise;
        }
        if (commitFails && connection === connections[0]) throw new Error('commit failed');
        for (const [id, row] of candidateWrites) candidates.set(id, row);
        for (const [id, row] of ratingWrites) ratings.set(id, row);
        unlock();
      }),
      rollback: jest.fn(async () => {
        if (rollbackFails) throw new Error('rollback failed');
        candidateWrites.clear(); ratingWrites.clear(); unlock();
      }),
      release: jest.fn(),
      destroy: jest.fn(() => { candidateWrites.clear(); ratingWrites.clear(); unlock(); })
    };
    connections.push(connection);
    return connection;
  });
  return {
    candidates, ratings, connections, waited, commitReached, resumeCommit,
    noPause: () => { pauseFirstCommit = false; },
    failCommit: () => { commitFails = true; },
    fail: (sql, code, badRollback = false) => { failSql = sql; failCode = code; rollbackFails = badRollback; }
  };
}

describe('rating and merge concurrency with transaction/lock doubles', () => {
  beforeEach(() => jest.resetAllMocks());

  it('merge locks first: rating waits, sees committed merged state, returns 409 and never inserts', async () => {
    const db = database();
    const merge = mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    await db.commitReached.promise;
    const rating = saveMyRating(2, { rating: 5 }, user);
    const rejected = expect(rating).rejects.toMatchObject({ statusCode: 409 });
    await db.waited.promise;
    expect(db.ratings.size).toBe(0);
    db.resumeCommit.resolve();
    await merge; await rejected;
    expect(db.candidates.get(2).merged_into_id).toBe(1);
    expect(db.ratings.size).toBe(0);
    expect(db.connections[1].rollback).toHaveBeenCalledTimes(1);
    expect(db.connections[1].execute.mock.calls.some(([sql]) => sql.includes('INSERT INTO candidate_ratings'))).toBe(false);
  });

  it('rating locks first: merge waits and moves the newly committed rating to the primary', async () => {
    const db = database();
    const rating = saveMyRating(2, { rating: 4, comment: 'Kept' }, user);
    await db.commitReached.promise;
    const merge = mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    await db.waited.promise;
    expect(db.candidates.get(2).merged_into_id).toBeNull();
    db.resumeCommit.resolve();
    expect(await rating).toMatchObject({ average_rating: 4, rating_count: 1 });
    await merge;
    expect([...db.ratings.values()]).toEqual([expect.objectContaining({ candidate_id: 1, reviewer_id: 10, rating: 4, comment: 'Kept' })]);
    expect(db.candidates.get(2).merged_into_id).toBe(1);
    expect(db.connections.every(connection => connection.commit.mock.calls.length === 1 && connection.release.mock.calls.length === 1)).toBe(true);
  });

  it('concurrent saves by the same reviewer serialize and keep a single rating', async () => {
    const db = database();
    const first = saveMyRating(2, { rating: 3 }, user);
    await db.commitReached.promise;
    const second = saveMyRating(2, { rating: 5 }, user);
    await db.waited.promise;
    db.resumeCommit.resolve();
    await first;
    expect(await second).toMatchObject({ average_rating: 5, rating_count: 1 });
    expect(db.ratings.size).toBe(1);
  });

  it('a rolled-back merge releases the waiting rating and leaves the secondary writable', async () => {
    const db = database(); db.failCommit();
    const merge = mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    const rejected = expect(merge).rejects.toThrow('commit failed');
    await db.commitReached.promise;
    const rating = saveMyRating(2, { rating: 5 }, user);
    await db.waited.promise;
    db.resumeCommit.resolve();
    await rejected;
    expect(await rating).toMatchObject({ rating_count: 1 });
    expect(db.candidates.get(2).merged_into_id).toBeNull();
    expect([...db.ratings.values()][0].candidate_id).toBe(2);
    expect(db.connections[0].rollback).toHaveBeenCalledTimes(1);
  });

  it('a newly saved rating conflicting with the primary reviewer makes merge roll back without losing either rating', async () => {
    const db = database();
    db.ratings.set(50, { id: 50, candidate_id: 1, reviewer_id: 10, rating: 3, comment: 'Primary' });
    const rating = saveMyRating(2, { rating: 5, comment: 'Secondary' }, user);
    await db.commitReached.promise;
    const merge = mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    const rejected = expect(merge).rejects.toMatchObject({ statusCode: 409 });
    await db.waited.promise;
    db.resumeCommit.resolve();
    await rating; await rejected;
    expect(db.candidates.get(2).merged_into_id).toBeNull();
    expect([...db.ratings.values()]).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidate_id: 1, rating: 3, comment: 'Primary' }),
      expect.objectContaining({ candidate_id: 2, rating: 5, comment: 'Secondary' })
    ]));
    expect(db.ratings.size).toBe(2);
    expect(db.connections[1].rollback).toHaveBeenCalledTimes(1);
  });

  it('opposite merges lock the same ascending IDs and the second fails cleanly', async () => {
    const db = database();
    const first = mergeCandidates({ primaryId: 2, secondaryId: 1, mergedBy: 10 });
    await db.commitReached.promise;
    const second = mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    const rejected = expect(second).rejects.toMatchObject({ statusCode: 409 });
    await db.waited.promise;
    db.resumeCommit.resolve();
    await first; await rejected;
    expect(db.connections.map(connection => connection.locks)).toEqual([[1, 2], [1, 2]]);
  });

  it('a summary error after upsert rolls back the rating and frees the lock', async () => {
    const db = database(); db.noPause(); db.fail('AVG(rating)', 'ER_BAD_FIELD_ERROR');
    await expect(saveMyRating(2, { rating: 5 }, user)).rejects.toMatchObject({ code: 'ER_BAD_FIELD_ERROR' });
    expect(db.ratings.size).toBe(0);
    expect(db.connections[0].commit).not.toHaveBeenCalled();
    expect(db.connections[0].rollback).toHaveBeenCalledTimes(1);
    expect(db.connections[0].release).toHaveBeenCalledTimes(1);
  });

  it.each(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'])('rolls back %s and returns a safe retryable 409', async code => {
    const db = database(); db.noPause(); db.fail('INSERT INTO candidate_ratings', code);
    await expect(saveMyRating(2, { rating: 5 }, user)).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('thử lại') });
    expect(db.ratings.size).toBe(0);
    expect(db.connections[0].rollback).toHaveBeenCalledTimes(1);
    expect(db.connections[0].release).toHaveBeenCalledTimes(1);
    expect(db.connections).toHaveLength(1); // No implicit retries or duplicate writes.
  });

  it('destroys an uncertain connection when rollback itself fails', async () => {
    const db = database(); db.noPause(); db.fail('AVG(rating)', 'ER_BAD_FIELD_ERROR', true);
    await expect(saveMyRating(2, { rating: 5 }, user)).rejects.toMatchObject({ code: 'ER_BAD_FIELD_ERROR' });
    expect(db.connections[0].destroy).toHaveBeenCalledTimes(1);
    expect(db.connections[0].release).not.toHaveBeenCalled();
    expect(db.ratings.size).toBe(0);
  });
});
