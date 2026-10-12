jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
jest.mock('../repositories/departmentBudgetRepository');
jest.mock('../repositories/auditRepository');
const { pool } = require('../config/database');
const repo = require('../repositories/departmentBudgetRepository');
const audit = require('../repositories/auditRepository');
const service = require('./departmentBudgetService');
const hr = { user_id: 7, roles: [{ role_code: 'HR_MANAGER' }], permissions: ['DEPARTMENT_BUDGET_MANAGE'] };
let connection;

beforeEach(() => {
  jest.resetAllMocks();
  connection = { query: jest.fn(), execute: jest.fn().mockResolvedValue([[{ department_id: 2 }]]),
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  pool.getConnection.mockResolvedValue(connection);
  repo.findByDepartmentYear.mockResolvedValue({ total_headcount: 5, total_salary_budget: '1000.10' });
  repo.getUsage.mockResolvedValue({ used_headcount: '2', used_salary_budget: '400.09' });
});

test('returns the six availability fields with exact monetary subtraction', async () => {
  await expect(service.getAvailability('2', '2099')).resolves.toEqual({
    department_id: 2, budget_year: 2099, total_headcount: 5, used_headcount: 2, remaining_headcount: 3,
    total_salary_budget: '1000.10', used_salary_budget: '400.09', remaining_salary_budget: '600.01'
  });
  expect(repo.getUsage).toHaveBeenCalledWith(2, 2099, pool);
});

test('shows negative availability after an override', async () => {
  repo.getUsage.mockResolvedValue({ used_headcount: 7, used_salary_budget: '1000.11' });
  await expect(service.getAvailability(2, 2099)).resolves.toMatchObject({ remaining_headcount: -2, remaining_salary_budget: '-0.01' });
});

test.each([null, { total_headcount: 5, total_salary_budget: null }])('blocks missing/incomplete budget %j', async budget => {
  repo.findByDepartmentYear.mockResolvedValue(budget);
  await expect(service.getAvailability(2, 2099)).rejects.toMatchObject({ code: 'BUDGET_NOT_CONFIGURED' });
});

test('blocks invalid legacy commitments without rewriting requests', async () => {
  repo.getUsage.mockResolvedValue({ invalid_requisition_id: 42 });
  await expect(service.getAvailability(2, 2099)).rejects.toMatchObject({ code: 'LEGACY_BUDGET_DATA_INVALID', details: { requisition_id: 42 } });
  expect(repo.upsert).not.toHaveBeenCalled();
});

test('saves the budget with audit in one transaction', async () => {
  await service.saveBudget(2, 2099, { total_headcount: 5, total_salary_budget: '1000.10' }, hr);
  expect(repo.upsert).toHaveBeenCalledWith(2, 2099, { total_headcount: 5, total_salary_budget: '1000.10' }, 7, connection);
  expect(audit.createLog).toHaveBeenCalledWith(expect.any(Object), connection);
  expect(connection.commit).toHaveBeenCalledTimes(1);
});

test('does not reduce the budget below approved commitments', async () => {
  repo.getUsage.mockResolvedValue({ used_headcount: 6, used_salary_budget: '1200.00' });
  await expect(service.saveBudget(2, 2099, { total_headcount: 5, total_salary_budget: '1000.10' }, hr)).rejects.toMatchObject({ code: 'BUDGET_BELOW_COMMITMENTS' });
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.commit).not.toHaveBeenCalled();
});

test('rejects ADMIN even when it has the budget manage permission', async () => {
  await expect(service.saveBudget(2, 2099, { total_headcount: 5, total_salary_budget: 1000 },
    { ...hr, roles: [{ role_code: 'ADMIN' }] })).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});

test.each([
  [2, undefined, 5, 1000], [2, 99, 5, 1000], [-1, 2099, 5, 1000],
  [2, 2099, -1, 1000], [2, 2099, 1.5, 1000], [2, 2099, 5, -1], [2, 2099, 5, null]
])('validates budget parameters (%j)', async (departmentId, year, headcount, salary) => {
  await expect(service.saveBudget(departmentId, year, { total_headcount: headcount, total_salary_budget: salary }, hr)).rejects.toMatchObject({ statusCode: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
