jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const repository = require('./candidateMergeRepository');

describe('SCRUM-129 / SCRUM-337 merge compatibility (mock transaction)', () => {
  let connection, tags, ratings, moved, undo;
  beforeEach(() => {
    tags = [{ candidate_id: 1, tag_id: 7 }, { candidate_id: 2, tag_id: 7 }, { candidate_id: 2, tag_id: 8 }];
    ratings = [{ candidate_id: 1, reviewer_id: 10 }, { candidate_id: 2, reviewer_id: 20 }];
    moved = null;
    undo = false;
    connection = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn().mockResolvedValue([[{ id: 1 }, { id: 2 }]]),
      execute: jest.fn(async (sql, params) => {
        if (sql === 'SELECT * FROM candidates WHERE id = ? FOR UPDATE') return [[{ id: params[0] }]];
        if (sql.includes('information_schema.columns')) return [[{ table_name: 'candidate_tags' }, { table_name: 'candidate_ratings' }, { table_name: 'candidate_notes' }]];
        if (sql.startsWith('SELECT candidate_id, tag_id')) return [tags];
        if (sql.startsWith('SELECT candidate_id, reviewer_id')) return [ratings];
        if (sql.startsWith('SELECT id FROM `candidate_ratings`')) return [[{ id: 21 }]];
        if (sql.startsWith('SELECT id FROM `candidate_notes`')) return [[{ id: 31 }]];
        if (sql.includes('INSERT INTO candidate_merges')) {
          moved = JSON.parse(params[5]);
          return [{ insertId: 4 }];
        }
        if (sql.includes('seconds_since_merge')) return [[{
          id: 4, status: 'ACTIVE', seconds_since_merge: 100, primary_id: 1, secondary_id: 2,
          primary_snapshot: { id: 1 }, secondary_snapshot: { id: 2 }, moved_children: JSON.stringify(moved)
        }]];
        // Model the unique reviewer constraint during movement as well as a race.
        if (sql.startsWith('UPDATE `candidate_ratings`') && undo) {
          throw Object.assign(new Error('duplicate reviewer'), { code: 'ER_DUP_ENTRY' });
        }
        return [{ affectedRows: 1 }];
      })
    };
    pool.getConnection.mockResolvedValue(connection);
  });

  it('moves distinct ratings, notes and unique tags; keeps overlapping tags intact', async () => {
    expect(await repository.mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 })).toBe(4);
    expect(moved).toEqual([
      { table: 'candidate_tags', tag_ids: [8] },
      { table: 'candidate_ratings', ids: [21] },
      { table: 'candidate_notes', ids: [31] }
    ]);
    expect(connection.execute).toHaveBeenCalledWith(
      'UPDATE candidate_tags SET candidate_id = ? WHERE candidate_id = ? AND tag_id IN (?)', [1, 2, 8]
    );
    expect(connection.execute).not.toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM `candidate_tags`'), expect.anything());
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back with 409 when the same reviewer rated both profiles, never deletes or overwrites ratings', async () => {
    ratings[1].reviewer_id = 10;
    await expect(repository.mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(connection.execute).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE `candidate_ratings`'), expect.anything());
    expect(connection.execute.mock.calls.some(([sql]) => /DELETE|REPLACE INTO/.test(sql))).toBe(false);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  it('undo returns moved rating/note ids and tag keys to their original profile', async () => {
    await repository.mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    connection.execute.mockClear();
    expect(await repository.undoMerge(4, 10)).toEqual({ primary_id: 1, secondary_id: 2 });
    expect(connection.execute).toHaveBeenCalledWith(
      'UPDATE candidate_tags SET candidate_id = ? WHERE candidate_id = ? AND tag_id IN (?)', [2, 1, 8]
    );
    expect(connection.execute).toHaveBeenCalledWith(
      'UPDATE `candidate_ratings` SET candidate_id = ? WHERE candidate_id = ? AND id IN (?)', [2, 1, 21]
    );
    expect(connection.execute).toHaveBeenCalledWith(
      'UPDATE `candidate_notes` SET candidate_id = ? WHERE candidate_id = ? AND id IN (?)', [2, 1, 31]
    );
    expect(connection.commit).toHaveBeenCalledTimes(2);
    const calls = connection.execute.mock.calls;
    const lockedIds = calls.filter(([sql]) => sql === 'SELECT * FROM candidates WHERE id = ? FOR UPDATE').map(([, params]) => params[0]);
    expect(lockedIds).toEqual([1, 2]);
    expect(calls.findIndex(([sql]) => sql.startsWith('UPDATE candidates')))
      .toBeGreaterThan(calls.findLastIndex(([sql]) => sql === 'SELECT * FROM candidates WHERE id = ? FOR UPDATE'));
  });

  it('rolls back the entire undo on a child-table constraint failure', async () => {
    await repository.mergeCandidates({ primaryId: 1, secondaryId: 2, mergedBy: 10 });
    connection.commit.mockClear();
    undo = true;
    await expect(repository.undoMerge(4, 10)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(2);
  });
});
