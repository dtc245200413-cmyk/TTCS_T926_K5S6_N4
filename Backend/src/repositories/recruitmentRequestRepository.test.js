jest.mock('../config/database', () => ({ pool: { execute: jest.fn() } }));
const { pool } = require('../config/database');
const repo = require('./recruitmentRequestRepository');
const approvals = require('./recruitmentRequestApprovalRepository');
const budgets = require('./departmentBudgetRepository');

beforeEach(() => jest.resetAllMocks());

test('insert uses only actual job_requisitions columns and generated requisition code', async () => {
  pool.execute.mockResolvedValue([{ insertId: 12 }]);
  await expect(repo.create({ requisition_code: 'REQ-test', department_id: 2, position_id: 3, headcount: 1,
    proposed_max_salary: '200.00', date_needed: '2099-01-01', status: 'PENDING', created_by: 7,
    budget_year: 2099, estimated_salary_cost: '2400.00' })).resolves.toBe(12);
  const [sql, values] = pool.execute.mock.calls[0];
  expect(sql).toMatch(/INSERT INTO job_requisitions/);
  expect(sql).not.toMatch(/recruitment_requests|salary_explanation|work_location_code|work_type_code|rejection_reason/);
  expect(values).toHaveLength(14);
  expect(values[0]).toBe('REQ-test');
});

test('detail reads rejection reason from history comments using requisition_id', async () => {
  pool.execute.mockResolvedValue([[{ requisition_id: 12, rejection_reason: 'Not needed' }]]);
  await expect(repo.findById(12)).resolves.toMatchObject({ requisition_id: 12, rejection_reason: 'Not needed' });
  expect(pool.execute.mock.calls[0][0]).toMatch(/a\.comments/);
  expect(pool.execute.mock.calls[0][0]).toMatch(/WHERE r\.requisition_id = \?/);
});

test('decision updates only real columns and appends a history record on the same connection', async () => {
  const connection = { execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
  await repo.updateStatus(12, { status: 'REJECTED', decided_by: 7, budget_year: 2099, estimated_salary_cost: '2400.00' }, connection);
  await approvals.create({ requisition_id: 12, user_id: 7, status: 'REJECTED', comments: 'Not needed',
    is_override: false, override_reason: null, exceeded_headcount: 0, exceeded_salary_budget: '0.00' }, connection);
  const [update, insert] = connection.execute.mock.calls;
  expect(update[0]).toMatch(/UPDATE job_requisitions/);
  expect(update[0]).not.toMatch(/rejection_reason/);
  expect(update[0]).toMatch(/WHERE requisition_id = \? AND status = 'PENDING'/);
  expect(insert[0]).toMatch(/\(requisition_id, approver_id, action, comments,/);
  expect(insert[1]).toEqual([12, 7, 'REJECTED', 'Not needed', false, null, 0, '0.00']);
});

test('usage counts only approved requisitions scoped by department/year, including computed legacy cost without updates', async () => {
  pool.execute.mockResolvedValueOnce([[]]).mockResolvedValueOnce([[{ used_headcount: 2, used_salary_budget: '4800.00' }]]);
  await expect(budgets.getUsage(2, 2099)).resolves.toMatchObject({ used_headcount: 2, used_salary_budget: '4800.00' });
  const [sql, params] = pool.execute.mock.calls[1];
  expect(sql).toMatch(/FROM job_requisitions/);
  expect(sql).toMatch(/status = 'APPROVED'/);
  expect(sql).toMatch(/COALESCE\(budget_year, YEAR\(date_needed\)\) = \?/);
  expect(params).toEqual([2, 2099]);
  expect(pool.execute.mock.calls.every(([query]) => query.trim().startsWith('SELECT'))).toBe(true);
});
