jest.mock('../config/database', () => ({ pool: { query: jest.fn(), execute: jest.fn(), getConnection: jest.fn() } }));
const { pool } = require('../config/database');
const service = require('./offerService');
const repo = require('../repositories/offerRepository');
const admin = { user_id: 1, roles: [{ role_code: 'ADMIN' }] };
const hr = { user_id: 2, roles: [{ role_code: 'HR_MANAGER' }] };
const row = {
  application_id: 11, application_code: 'APP-11', candidate_id: 7, candidate_name: 'Candidate',
  recruitment_request_id: 20, request_id: 20, posting_request_id: 20, candidate_request_id: 20,
  department_id: 3, department_name: 'Engineering', department_status: 'ACTIVE',
  position_id: 4, position_name: 'Developer', position_status: 'ACTIVE',
  interview_decision: 'PASSED', interview_decision_by: 9, interview_decision_at: '2026-10-20',
  has_effective_offer: 0, has_offer_history: 0, has_unmapped_offer: 0,
};
beforeEach(() => { jest.clearAllMocks(); pool.query.mockResolvedValue([[row]]); });
afterEach(() => { expect(pool.execute).not.toHaveBeenCalled(); expect(pool.getConnection).not.toHaveBeenCalled(); });

it('returns only scoped verified candidate/application fields; candidate PASSED alone cannot enable creation', async () => {
  pool.query.mockResolvedValue([[{ ...row, basic_salary: 999999, email: 'secret', password_hash: 'secret' }]]);
  const data = await service.getEligibility({ candidate_id: '7', application_id: '11' }, admin);
  expect(data).toMatchObject({ eligible: false, permissions: { can_create: false }, reason_code: 'DECISION_APPLICATION_UNVERIFIED',
    applications: [{ candidate: { id: 7, name: 'Candidate' }, application: { id: 11 }, prefill: { job_title: 'Developer', position_id: 4 } }] });
  expect(JSON.stringify(data)).not.toMatch(/basic_salary|999999|secret|password_hash|interview_decision_by/);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('JOIN candidates c ON c.id = a.candidate_id');
  expect(sql).toContain('AND a.id = ?'); expect(sql).toContain('AND a.candidate_id = ?');
  expect(params).toEqual([11, 7]);
  expect(sql).not.toMatch(/SELECT\s+\w+\.\*|salary|email|password/i);
});

it('HR scope uses assigned department manager, not department membership', async () => {
  await service.getEligibility({}, { ...hr, department_id: 99 });
  expect(pool.query.mock.calls[0][0]).toContain('AND (d.manager_user_id = ?)');
  expect(pool.query.mock.calls[0][1]).toEqual([2]);
});

it.each(['CANDIDATE', 'INTERVIEWER', 'HIRING_MANAGER', 'APPROVER', 'DIRECTOR'])(
  '%s without verified creation scope is denied before reading any application', async role => {
    await expect(service.getEligibility({}, { user_id: 3, roles: [{ role_code: role }] })).rejects.toMatchObject({ statusCode: 403 });
    expect(pool.query).not.toHaveBeenCalled();
  }
);
it('Recruiter reads only applications of requests where they are the primary assigned recruiter', async () => {
  const user = { user_id: 3, department_id: 8, roles: [{ role_code: 'RECRUITER' }] };
  const data = await service.getEligibility({ application_id: 11 }, user);
  expect(data.applications[0].application.id).toBe(11);
  const [sql, params] = pool.query.mock.calls[0];
  expect(sql).toContain('AND (r.recruiter_id = ?)'); expect(params).toEqual([3, 11]);
  expect(sql).not.toMatch(/assistant_recruiter_id|c\.created_by/);
});
it('unassigned Recruiter cannot inspect an application even when they created the candidate', async () => {
  pool.query.mockResolvedValue([[]]);
  await expect(service.getEligibility({ application_id: 11 }, { user_id: 3, roles: [{ role_code: 'RECRUITER' }] })).rejects.toMatchObject({ statusCode: 403 });
});
it('combined Recruiter/HR roles keep both verified assignment scopes', async () => {
  await service.getEligibility({}, { user_id: 3, roles: [{ role_code: 'RECRUITER' }, { role_code: 'HR_MANAGER' }] });
  expect(pool.query.mock.calls[0][0]).toContain('AND (r.recruiter_id = ? OR d.manager_user_id = ?)');
  expect(pool.query.mock.calls[0][1]).toEqual([3, 3]);
});
it('candidate role cannot be overridden by ADMIN', async () => {
  await expect(service.getEligibility({}, { ...admin, roles: [...admin.roles, { role_code: 'CANDIDATE' }] })).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.query).not.toHaveBeenCalled();
});
it('requires an authenticated internal user', async () => {
  await expect(service.getEligibility({}, null)).rejects.toMatchObject({ statusCode: 401 });
  expect(pool.query).not.toHaveBeenCalled();
});
it('mismatched candidate/application or out-of-scope application is indistinguishable', async () => {
  pool.query.mockResolvedValue([[]]);
  await expect(service.getEligibility({ application_id: 11, candidate_id: 999 }, hr)).rejects.toMatchObject({ statusCode: 403 });
  expect(pool.query.mock.calls[0][1]).toEqual([2, 11, 999]);
});

it.each([
  [{ interview_decision: null, status: 'PASSED', rating: 5, recommendation: 'RECOMMENDED' }, 'DECISION_NOT_PASSED'],
  [{ interview_decision: 'FAILED', status: 'PASSED', previous_decision: 'PASSED' }, 'DECISION_NOT_PASSED'],
  [{ candidate_request_id: 88 }, 'DECISION_SCOPE_MISMATCH'],
  [{ interview_decision_by: null }, 'DECISION_AUTHORITY_UNVERIFIED'],
  [{ interview_decision_at: null }, 'DECISION_AUTHORITY_UNVERIFIED'],
  [{ authority_verified: true, is_current: true }, 'DECISION_APPLICATION_UNVERIFIED'],
  [{ is_current: false }, 'DECISION_APPLICATION_UNVERIFIED'],
  [{ posting_request_id: 88 }, 'APPLICATION_MAPPING_UNVERIFIED'],
  [{ request_id: null }, 'APPLICATION_MAPPING_UNVERIFIED'],
  [{ department_status: 'INACTIVE' }, 'CATALOG_UNAVAILABLE'],
  [{ has_effective_offer: 1 }, 'OFFER_ALREADY_EXISTS'],
  [{ has_offer_history: 1 }, 'OFFER_HISTORY_REVIEW_REQUIRED'],
  [{ has_unmapped_offer: 1 }, 'LEGACY_OFFER_MAPPING_UNVERIFIED'],
])('fails closed for %j with %s', async (overrides, reason_code) => {
  pool.query.mockResolvedValue([[{ ...row, ...overrides }]]);
  const data = await service.getEligibility({}, admin);
  expect(data).toMatchObject({ eligible: false, reason_code, permissions: { can_create: false } });
  expect(data.applications[0]).toMatchObject({ eligible: false, reason_code });
});

it('does not apply one candidate decision to multiple applications for the same request', async () => {
  pool.query.mockResolvedValue([[row, { ...row, application_id: 12 }]]);
  const data = await service.getEligibility({}, admin);
  expect(data.applications.map(item => item.reason_code)).toEqual(['DECISION_APPLICATION_UNVERIFIED', 'DECISION_APPLICATION_UNVERIFIED']);
  expect(data.eligible).toBe(false);
});
it.each(['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ECONNREFUSED'])(
  '%s becomes a safe dependency error', async code => {
    pool.query.mockRejectedValue(Object.assign(new Error('private table or credential details'), { code }));
    await expect(service.getEligibility({}, admin)).rejects.toMatchObject({ statusCode: 503, code: 'OFFER_ELIGIBILITY_DEPENDENCY_UNAVAILABLE' });
  }
);
it.each([{ decision: 'PASSED' }, { authority_verified: 'true' }, { created_by: 1 }, { application_id: ['1','2'] }, { application_id: '1 OR 1=1' }])(
  'rejects forged or malformed query %j before SQL', async query => {
    await expect(service.getEligibility(query, admin)).rejects.toMatchObject({ statusCode: 400 });
    expect(pool.query).not.toHaveBeenCalled();
  }
);
it('limits results and returns a cursor only for another page', async () => {
  pool.query.mockResolvedValue([Array.from({ length: 51 }, (_, i) => ({ ...row, application_id: i + 1 }))]);
  const data = await service.getEligibility({ after_id: '5' }, hr);
  expect(data.applications).toHaveLength(50); expect(data.next_cursor).toBe(50);
  expect(pool.query.mock.calls[0][1]).toEqual([2, 5]);
  expect(pool.query.mock.calls[0][0]).toContain('ORDER BY a.id ASC LIMIT 51');
});
it('queries duplicate existence by application without retrieving another creator’s Offer content', async () => {
  await service.getEligibility({}, admin);
  const sql = pool.query.mock.calls[0][0];
  expect(sql).toContain('WHERE o.application_id = a.id');
  expect(sql).toContain('o.application_id IS NULL');
  expect(sql).toContain("'PENDING_APPROVAL'");
  expect(sql).not.toMatch(/o\.basic_salary|o\.salary_amount|o\.created_by|o\.\*/);
});
it('does not unlock the existing write gate', () => {
  expect(repo.assertDraftWritesReady).toThrow();
  expect(pool.query).not.toHaveBeenCalled();
});
