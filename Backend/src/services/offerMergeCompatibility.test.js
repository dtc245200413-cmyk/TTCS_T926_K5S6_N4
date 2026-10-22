jest.mock('../config/database', () => ({ pool: { query: jest.fn() } }));
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pool } = require('../config/database');
const service = require('./offerService');
const user = { user_id: 3, roles: [{ role_code: 'RECRUITER' }] };
beforeEach(() => jest.clearAllMocks());

test('PR35 ALL filter keeps creator scope instead of querying literal ALL', async () => {
  pool.query.mockResolvedValue([[]]);
  await service.getAllOffers({ status: 'ALL' }, user);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('o.created_by = ?');
  expect(sql).not.toContain('o.status = ?');
  expect(params).toEqual([3]);
});
test('publish/onboarding compatibility endpoints cannot activate writes or expose data', () => {
  expect(() => service.unavailableApprovalExtension(user)).toThrow();
  try { service.unavailableApprovalExtension(user); } catch (error) { expect(error.statusCode).toBe(503); }
  try { service.unavailableApprovalExtension({ user_id: 3, roles: [{role_code:'CANDIDATE'}] }); }
  catch (error) { expect(error.statusCode).toBe(403); }
  expect(pool.query).not.toHaveBeenCalled();
});
test('incoming Offer DDL and seeds remain dormant, outside exported startup migration', () => {
  const source = fs.readFileSync(path.join(__dirname, '../config/schemaMigrations.js'), 'utf8');
  const query = jest.fn();
  const context = { module: { exports: {} }, require: () => ({ pool: { query } }) };
  vm.runInNewContext(source, context);
  expect(query).not.toHaveBeenCalled();
  expect(Object.keys(context.module.exports)).toEqual(['runSchemaMigrations']);
  expect(Object.keys(context.module.exports)).toEqual(['runSchemaMigrations']);
  const startup = context.module.exports.runSchemaMigrations.toString();
  expect(startup).not.toMatch(/pendingOfferApprovalMigrations|pendingCandidateEvaluationMigrations|INSERT INTO candidate_offers|CREATE TABLE IF NOT EXISTS candidate_onboardings/);
  expect(startup).toContain('application_id INT NOT NULL UNIQUE');
});
test('both legacy Evaluation write routes retain their disabled handler', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/candidateEvaluationRoutes.js'), 'utf8');
  expect(source).toMatch(/router.post\('\/seed-sample', legacyWriteDisabled\)/);
  expect(source).toMatch(/router.post\('\/:id\/offer',[^\n]+legacyWriteDisabled\)/);
});
