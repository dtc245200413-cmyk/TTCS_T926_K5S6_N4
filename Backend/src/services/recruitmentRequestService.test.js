jest.mock('../config/database', () => ({ pool: { getConnection: jest.fn(), query: jest.fn() } }));
jest.mock('../repositories/recruitmentRequestRepository');
jest.mock('../repositories/jobPositionRepository');
jest.mock('../repositories/auditRepository');
jest.mock('../repositories/recruitmentRequestApprovalRepository');
jest.mock('./departmentBudgetService');

const { pool } = require('../config/database');
const requestRepo = require('../repositories/recruitmentRequestRepository');
const jobRepo = require('../repositories/jobPositionRepository');
const auditRepo = require('../repositories/auditRepository');
const approvalRepo = require('../repositories/recruitmentRequestApprovalRepository');
const budgetService = require('./departmentBudgetService');
const service = require('./recruitmentRequestService');

const hr = {
  user_id: 7, roles: [{ role_code: 'HR_MANAGER' }],
  permissions: ['RECRUITMENT_REQUEST_APPROVE', 'RECRUITMENT_REQUEST_REJECT', 'RECRUITMENT_REQUEST_OVERRIDE']
};
const pending = {
  requisition_id: 1, department_id: 2, position_id: 3, headcount: 2, reason: 'Tăng mới',
  proposed_min_salary: 10000000, proposed_max_salary: 20000000,
  date_needed: '2099-06-15', job_description: 'Developer', requirements: 'JavaScript',
  status: 'PENDING', created_by: 8
};
let connection;

beforeEach(() => {
  jest.resetAllMocks();
  connection = {
    query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn()
  };
  pool.getConnection.mockResolvedValue(connection);
  requestRepo.findByIdForUpdate.mockResolvedValue({ ...pending });
  requestRepo.findById.mockResolvedValue({ ...pending, status: 'APPROVED' });
  requestRepo.create.mockResolvedValue(1);
  requestRepo.updateStatus.mockResolvedValue(1);
  jobRepo.findById.mockResolvedValue({ position_name: 'Developer', min_salary: 10000000, max_salary: 30000000 });
  budgetService.getAvailability.mockResolvedValue({
    total_headcount: 5, used_headcount: 3, remaining_headcount: 2,
    total_salary_budget: '1000000000.00', used_salary_budget: '520000000.00', remaining_salary_budget: '480000000.00'
  });
});

test('creates PENDING with server-derived year/cost even when budget is exceeded', async () => {
  await service.createRequest({ ...pending, budget_year: 2000, estimated_salary_cost: '1.00' }, 8);
  expect(requestRepo.create).toHaveBeenCalledWith(expect.objectContaining({ budget_year: 2099, estimated_salary_cost: '480000000.00', status: 'PENDING' }));
  expect(budgetService.getAvailability).not.toHaveBeenCalled();
  expect(requestRepo.updateStatus).not.toHaveBeenCalled();
});

test.each(['APPROVED', 'REJECTED', 'CLOSED', null])('rejects client-created status %s', async status => {
  await expect(service.createRequest({ ...pending, status }, 8)).rejects.toMatchObject({ code: 'INVALID_REQUEST_STATUS' });
  expect(requestRepo.create).not.toHaveBeenCalled();
});

test.each([
  { headcount: -1 }, { headcount: 1.5 }, { proposed_max_salary: null },
  { proposed_max_salary: -1 }, { proposed_min_salary: 30000000 }, { date_needed: '2099-02-30' }
])('validates submitted budget inputs %j', async changes => {
  await expect(service.createRequest({ ...pending, ...changes }, 8)).rejects.toMatchObject({ statusCode: 400 });
  expect(requestRepo.create).not.toHaveBeenCalled();
});

test.each(['ADMIN', 'APPROVER', 'RECRUITER', 'HIRING_MANAGER'])('denies %s even if HR permissions were assigned', async role => {
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, { ...hr, roles: [{ role_code: role }] })).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});

test('requires the decision permission even for HR_MANAGER', async () => {
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, { ...hr, permissions: [] })).rejects.toMatchObject({ statusCode: 403 });
});

test('approves exactly at the limit and atomically records the decision', async () => {
  await service.updateRequestStatus(1, { status: 'APPROVED' }, hr);
  expect(connection.query).toHaveBeenCalledWith('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
  expect(budgetService.getAvailability).toHaveBeenCalledWith(2, 2099, connection, true);
  expect(requestRepo.updateStatus).toHaveBeenCalledWith(1, expect.objectContaining({
    status: 'APPROVED', decided_by: 7, budget_year: 2099, estimated_salary_cost: '480000000.00'
  }), connection);
  expect(approvalRepo.create).toHaveBeenCalledWith(expect.objectContaining({
    is_override: false, exceeded_headcount: 0, exceeded_salary_budget: '0.00'
  }), connection);
  expect(auditRepo.createLog).toHaveBeenCalledWith(expect.any(Object), connection);
  expect(connection.commit).toHaveBeenCalledTimes(1);
  expect(connection.rollback).not.toHaveBeenCalled();
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test.each([
  [4, '1000000000.00', 1, '0.00'],
  [5, '999999999.99', 0, '0.01'],
  [4, '999999999.99', 1, '0.01']
])('blocks excess headcount/budget without override (%s, %s)', async (totalHeadcount, totalSalary, excessHeadcount, excessSalary) => {
  budgetService.getAvailability.mockResolvedValue({ total_headcount: totalHeadcount, used_headcount: 3, total_salary_budget: totalSalary, used_salary_budget: '520000000.00' });
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, hr)).rejects.toMatchObject({
    code: 'BUDGET_EXCEEDED', statusCode: 409,
    details: { exceeded_headcount: excessHeadcount, exceeded_salary_budget: excessSalary }
  });
  expect(requestRepo.updateStatus).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledTimes(1);
});

test('records a trimmed override reason and exact exceeded amounts', async () => {
  budgetService.getAvailability.mockResolvedValue({ total_headcount: 1, used_headcount: 0, total_salary_budget: '100000000.00', used_salary_budget: '0.00' });
  await service.updateRequestStatus(1, { status: 'APPROVED', is_override: true, override_reason: '  Urgent replacement  ' }, hr);
  expect(approvalRepo.create).toHaveBeenCalledWith(expect.objectContaining({
    is_override: true, override_reason: 'Urgent replacement', exceeded_headcount: 1, exceeded_salary_budget: '380000000.00'
  }), connection);
});

test.each(['', '   ', null, 123])('rejects missing/invalid override reason %j', async override_reason => {
  await expect(service.updateRequestStatus(1, { status: 'APPROVED', is_override: true, override_reason }, hr)).rejects.toMatchObject({ code: 'OVERRIDE_REASON_REQUIRED' });
});

test('requires explicit boolean confirmation and override permission', async () => {
  await expect(service.updateRequestStatus(1, { status: 'APPROVED', is_override: 'true', override_reason: 'Urgent' }, hr)).rejects.toMatchObject({ statusCode: 400 });
  await expect(service.updateRequestStatus(1, { status: 'APPROVED', is_override: true, override_reason: 'Urgent' },
    { ...hr, permissions: ['RECRUITMENT_REQUEST_APPROVE'] })).rejects.toMatchObject({ statusCode: 403 });
});

test('rejects with history without requiring or consuming a budget', async () => {
  await service.updateRequestStatus(1, { status: 'REJECTED', rejection_reason: '  Not needed  ' }, hr);
  expect(budgetService.getAvailability).not.toHaveBeenCalled();
  expect(approvalRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'REJECTED', comments: 'Not needed', is_override: false }), connection);
  expect(connection.commit).toHaveBeenCalledTimes(1);
});

test.each(['', '  ', null, 123])('rejects empty/invalid rejection reason %j', async rejection_reason => {
  await expect(service.updateRequestStatus(1, { status: 'REJECTED', rejection_reason }, hr)).rejects.toMatchObject({ statusCode: 400 });
});

test.each(['DRAFT', 'APPROVED', 'REJECTED'])('does not decide request already %s', async status => {
  requestRepo.findByIdForUpdate.mockResolvedValue({ ...pending, status });
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, hr)).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' });
  expect(requestRepo.updateStatus).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalled();
});

test.each(['DRAFT', 'PENDING', 'CLOSED'])('disallows decision target %s', async status => {
  await expect(service.updateRequestStatus(1, { status }, hr)).rejects.toMatchObject({ code: 'INVALID_REQUEST_STATUS' });
});

test.each(['history', 'audit'])('rolls back when %s fails', async target => {
  (target === 'history' ? approvalRepo.create : auditRepo.createLog).mockRejectedValue(new Error('write failed'));
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, hr)).rejects.toThrow('write failed');
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test('does not approve when no budget has been configured', async () => {
  budgetService.getAvailability.mockRejectedValue(Object.assign(new Error('Missing budget'), { code: 'BUDGET_NOT_CONFIGURED' }));
  await expect(service.updateRequestStatus(1, { status: 'APPROVED' }, hr)).rejects.toMatchObject({ code: 'BUDGET_NOT_CONFIGURED' });
  expect(requestRepo.updateStatus).not.toHaveBeenCalled();
});
