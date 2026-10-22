jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const repository = require('./candidatePortalRepository');

const pendingOffer = { id: 4, status: 'SENT', application_id: 8, candidate_id: 17,
  created_by: 3, response_deadline: '2099-11-20', expected_start_date: '2099-12-01' };
let conn;
beforeEach(() => {
  jest.resetAllMocks();
  conn = {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    execute: jest.fn(async (sql) => {
      if (/SELECT o\.id, o\.status/.test(sql)) return [[{ ...pendingOffer }]];
      if (/UPDATE candidate_offers/.test(sql)) return [{ affectedRows: 1 }];
      return [{ affectedRows: 1, insertId: 1 }];
    })
  };
  pool.getConnection.mockResolvedValue(conn);
});

describe('Candidate Portal Offer data and response contract', () => {
  test('public listing is owner-scoped, includes SENT, but never drafts or private approval', async () => {
    pool.execute.mockResolvedValue([[]]);
    await expect(repository.getOffers(17)).resolves.toEqual([]);
    const [sql, params] = pool.execute.mock.calls[0];
    expect(params).toEqual([17, 17]);
    expect(sql).toMatch(/JOIN candidate_applications a ON a\.id = o\.application_id/);
    expect(sql).toMatch(/a\.candidate_id = \? AND o\.candidate_id = \?/);
    expect(sql).toMatch(/o\.status IN \('SENT', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'EXPIRED'\)/);
    expect(sql).not.toMatch(/o\.\*/);
    expect(sql).not.toMatch(/'DRAFT'|'APPROVED'|'PENDING_APPROVAL'/);
  });
  test('SENT Offer is public and flags expiry only when deadline has passed', async () => {
    pool.execute.mockResolvedValue([[{...pendingOffer}]]);
    const result=await repository.getOffers(17);
    expect(result).toEqual([{...pendingOffer,is_expired:false}]);
  });
  test('ownership and row lock are verified inside response transaction', async () => {
    expect(await repository.respondToOffer(17, 4, {status:'DECLINED', response:'No'})).toBe(true);
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.execute.mock.calls[0];
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql).toMatch(/o\.candidate_id = \? AND a\.candidate_id = \?/);
    expect(params).toEqual([4,17,17]);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
  test('acceptance and onboarding cannot be partially committed', async () => {
    await expect(repository.respondToOffer(17,4,{status:'ACCEPTED', response:'Yes'})).resolves.toBe(true);
    const sql=conn.execute.mock.calls.map(call=>call[0]).join('\n');
    expect(sql).toMatch(/INSERT INTO candidate_onboardings/);
    expect(sql).toMatch(/UPDATE candidate_applications/);
    expect(sql).toMatch(/UPDATE candidates/);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
  });
  test('invalid or already answered Offer does not mutate DB', async () => {
    conn.execute.mockImplementation(async (sql) => {
      if (/SELECT o\.id, o\.status/.test(sql)) return [[{ ...pendingOffer,status:'APPROVED' }]];
      return [{affectedRows:1}];
    });
    await expect(repository.respondToOffer(17,4,{status:'ACCEPTED'})).rejects.toMatchObject({statusCode:409});
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.execute).toHaveBeenCalledTimes(1);
  });
  test('foreign Offer is indistinguishable from missing Offer', async () => {
    conn.execute.mockResolvedValueOnce([[]]);
    await expect(repository.respondToOffer(17,99,{status:'ACCEPTED'})).rejects.toMatchObject({statusCode:404});
    expect(conn.rollback).toHaveBeenCalledTimes(1);
  });
  test('a failed onboarding insert rolls back the entire response', async () => {
    conn.execute.mockImplementation(async sql => {
      if (/SELECT o\.id, o\.status/.test(sql)) return [[{...pendingOffer}]];
      if (/INSERT INTO candidate_onboardings/.test(sql)) throw new Error('Missing schema');
      return [{affectedRows:1}];
    });
    await expect(repository.respondToOffer(17,4,{status:'ACCEPTED'})).rejects.toThrow('Missing schema');
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
  });
  test('SQL errors on list do not fall back to broad queries', async () => {
    pool.execute.mockRejectedValue(new Error('database unavailable'));
    await expect(repository.getOffers(17)).rejects.toThrow('database unavailable');
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });
});
