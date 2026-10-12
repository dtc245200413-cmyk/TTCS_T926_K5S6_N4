jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn() } }));
jest.mock('../repositories/recruitmentRequestRepository');
jest.mock('../repositories/departmentBudgetRepository');
jest.mock('../repositories/recruitmentRequestApprovalRepository');
jest.mock('../repositories/auditRepository');
jest.mock('../repositories/jobPositionRepository');
jest.mock('../middleware/authMiddleware', () => ({
  ...jest.requireActual('../middleware/authMiddleware'),
  // Test-only identity injection; production authenticate is unchanged.
  authenticate: (req, res, next) => {
    if (!req.headers['x-test-user']) return res.status(401).json({ success: false });
    req.user = JSON.parse(req.headers['x-test-user']);
    next();
  }
}));

const express = require('express');
const { pool } = require('../config/database');
const requestRepo = require('../repositories/recruitmentRequestRepository');
const budgetRepo = require('../repositories/departmentBudgetRepository');
const jobRepo = require('../repositories/jobPositionRepository');
const { errorHandler } = require('../middleware/errorMiddleware');
let server;
let base;
let logSpy;
const hr = { user_id: 7, roles: [{ role_code: 'HR_MANAGER' }], permissions: [
  'DEPARTMENT_BUDGET_VIEW', 'DEPARTMENT_BUDGET_MANAGE', 'RECRUITMENT_REQUEST_VIEW_ALL',
  'RECRUITMENT_REQUEST_APPROVE', 'RECRUITMENT_REQUEST_REJECT', 'RECRUITMENT_REQUEST_OVERRIDE'
] };

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/department-budgets', require('./departmentBudgetRoutes'));
  app.use('/api/recruitment-requests', require('./recruitmentRequestRoutes'));
  app.use(errorHandler);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
  logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(async () => {
  logSpy.mockRestore();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

beforeEach(() => {
  jest.clearAllMocks();
  pool.getConnection.mockResolvedValue({
    query: jest.fn(), execute: jest.fn().mockResolvedValue([[{ department_id: 2 }]]),
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn()
  });
  budgetRepo.findByDepartmentYear.mockResolvedValue({ total_headcount: 1, total_salary_budget: '240000000.00' });
  budgetRepo.getUsage.mockResolvedValue({ used_headcount: 0, used_salary_budget: '0.00' });
  budgetRepo.getAll.mockResolvedValue([]);
  requestRepo.findByIdForUpdate.mockResolvedValue({
    requisition_id: 1, department_id: 2, status: 'PENDING', created_by: 8,
    date_needed: '2099-06-15', headcount: 2, proposed_max_salary: 20000000
  });
  requestRepo.findById.mockResolvedValue({ requisition_id: 1, created_by: 8, status: 'APPROVED' });
  requestRepo.updateStatus.mockResolvedValue(1);
  requestRepo.create.mockResolvedValue(1);
  jobRepo.findById.mockResolvedValue({ position_name: 'Developer' });
});

async function call(path, method = 'GET', body, user = hr) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': JSON.stringify(user) } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
}

test('budget endpoints require authentication and VIEW permission', async () => {
  expect((await call('/department-budgets?year=2099', 'GET', null, null)).status).toBe(401);
  expect((await call('/department-budgets/2/2099/availability', 'GET', null, { ...hr, permissions: [] })).status).toBe(403);
  expect((await call('/department-budgets?year=2099')).status).toBe(200);
});

test('availability endpoint exposes all six requested values', async () => {
  const response = await call('/department-budgets/2/2099/availability');
  expect(response.status).toBe(200);
  expect(response.body.data).toEqual({
    department_id: 2, budget_year: 2099, total_headcount: 1, used_headcount: 0, remaining_headcount: 1,
    total_salary_budget: '240000000.00', used_salary_budget: '0.00', remaining_salary_budget: '240000000.00'
  });
});

test('budget PUT requires HR role even if ADMIN has the manage permission', async () => {
  const response = await call('/department-budgets/2/2099', 'PUT', { total_headcount: 1, total_salary_budget: 240000000 },
    { ...hr, roles: [{ role_code: 'ADMIN' }] });
  expect(response.status).toBe(403);
  expect(pool.getConnection).not.toHaveBeenCalled();
});

test('decision endpoint rejects an unauthorized direct PATCH', async () => {
  const response = await call('/recruitment-requests/1/status', 'PATCH', { status: 'APPROVED' },
    { ...hr, roles: [{ role_code: 'APPROVER' }] });
  expect(response.status).toBe(403);
  expect(requestRepo.updateStatus).not.toHaveBeenCalled();
});

test('decision endpoint returns a structured excess and accepts a valid override', async () => {
  const blocked = await call('/recruitment-requests/1/status', 'PATCH', { status: 'APPROVED' });
  expect(blocked.status).toBe(409);
  expect(blocked.body).toMatchObject({ code: 'BUDGET_EXCEEDED', details: { exceeded_headcount: 1, exceeded_salary_budget: '240000000.00' } });
  const approved = await call('/recruitment-requests/1/status', 'PATCH', {
    status: 'APPROVED', is_override: true, override_reason: 'Urgent hiring'
  });
  expect(approved.status).toBe(200);
});

test('request viewing requires ownership or VIEW_ALL', async () => {
  const otherUser = { user_id: 9, roles: [], permissions: [] };
  expect((await call('/recruitment-requests/1', 'GET', null, otherUser)).status).toBe(403);
  expect((await call('/recruitment-requests/approvals', 'GET', null, otherUser)).status).toBe(403);
});

test.each([false, true])('POST accepts canonical or legacy HTTP names (legacy=%s), persists canonical fields', async legacy => {
  const input = {
    department_id: 2, position_id: 3, headcount: 2, reason: 'Tăng mới',
    job_description: 'Developer', status: 'PENDING',
    ...(legacy
      ? { needed_by_date: '2099-06-15', proposed_salary_min: 100, proposed_salary_max: 200, candidate_requirements: 'Node.js' }
      : { date_needed: '2099-06-15', proposed_min_salary: 100, proposed_max_salary: 200, requirements: 'Node.js' })
  };
  requestRepo.findById.mockResolvedValue({ requisition_id: 1, ...input, date_needed: '2099-06-15', proposed_min_salary: 100, proposed_max_salary: 200, requirements: 'Node.js' });
  const response = await call('/recruitment-requests', 'POST', input);
  expect(response.status).toBe(201);
  expect(requestRepo.create).toHaveBeenCalledWith(expect.objectContaining({
    requisition_code: expect.stringMatching(/^REQ-/), date_needed: '2099-06-15',
    proposed_max_salary: 200, requirements: 'Node.js', budget_year: 2099, estimated_salary_cost: '4800.00'
  }));
  expect(response.body.data).toMatchObject({ requisition_id: 1, id: 1, needed_by_date: '2099-06-15', proposed_salary_max: 200, candidate_requirements: 'Node.js' });
});
