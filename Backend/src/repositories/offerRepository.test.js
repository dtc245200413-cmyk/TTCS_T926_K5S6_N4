jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const repo = require('./offerRepository');
let conn;

beforeEach(() => {
  jest.clearAllMocks();
  conn = { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(), query: jest.fn() };
  pool.getConnection.mockResolvedValue(conn);
});

it('does not expose a way to activate real writes through the readiness gate', () => {
  expect(repo.assertDraftWritesReady).toThrow('chưa được xác nhận');
  expect(pool.getConnection).not.toHaveBeenCalled();
});

it.each(['loadApplicationForUpdate', 'loadDecision', 'loadCatalog', 'findEffectiveOffers', 'insertDraft',
  'updateDraftIfEditable', 'recordSubmission', 'submitIfEditable'])('%s is closed without a verified persistence contract', async method => {
  await expect(repo[method](1, {}, conn)).rejects.toMatchObject({ statusCode: 503, code: 'OFFER_DRAFT_DEPENDENCY_UNAVAILABLE' });
  expect(conn.query).not.toHaveBeenCalled();
  expect(pool.getConnection).not.toHaveBeenCalled();
});

it('commits and releases a successful transaction', async () => {
  const work = jest.fn(async transaction => { expect(transaction).toBe(conn); return 7; });
  await expect(repo.withTransaction(work)).resolves.toBe(7);
  expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
  expect(conn.commit).toHaveBeenCalledTimes(1);
  expect(conn.rollback).not.toHaveBeenCalled();
  expect(conn.release).toHaveBeenCalledTimes(1);
});

it.each(['begin', 'work', 'commit'])('rolls back and releases on %s failure', async step => {
  const error = new Error(`${step} failed`);
  if (step === 'begin') conn.beginTransaction.mockRejectedValueOnce(error);
  if (step === 'commit') conn.commit.mockRejectedValueOnce(error);
  await expect(repo.withTransaction(async () => { if (step === 'work') throw error; })).rejects.toBe(error);
  expect(conn.rollback).toHaveBeenCalledTimes(1);
  expect(conn.release).toHaveBeenCalledTimes(1);
});

it('preserves the original error when rollback also fails', async () => {
  const original = new Error('write failed');
  conn.rollback.mockRejectedValueOnce(new Error('rollback failed'));
  await expect(repo.withTransaction(async () => { throw original; })).rejects.toBe(original);
  expect(conn.release).toHaveBeenCalledTimes(1);
});

it('does not invoke work if acquiring a connection fails', async () => {
  pool.getConnection.mockRejectedValueOnce(new Error('connection failed'));
  const work = jest.fn();
  await expect(repo.withTransaction(work)).rejects.toThrow('connection failed');
  expect(work).not.toHaveBeenCalled();
});

it('locks only the scoped Offer using bound parameters', async () => {
  conn.query.mockResolvedValueOnce([[{ id: 1 }]]);
  await expect(repo.findScopedOfferForUpdate(1, { sql: ' AND (o.created_by = ?)', params: [3] }, conn))
    .resolves.toEqual({ id: 1 });
  expect(conn.query).toHaveBeenCalledWith(expect.stringMatching(/WHERE o.id = \? AND \(o.created_by = \?\)\s+FOR UPDATE/), [1, 3]);
});
