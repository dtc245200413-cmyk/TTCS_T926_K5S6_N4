'use strict';

const { loadVerifiedDecisionWriteScope } = require('./offerDecisionScopeReader');

const validRow = Object.freeze({
  id: 101, candidate_id: 201, recruitment_request_id: 301,
  application_status: 'INTERVIEWING', department_id: 401,
  department_manager_user_id: 7, department_status: 'ACTIVE',
  actor_user_id: 7, actor_status: 'ACTIVE'
});
const args = { actorUserId: 7, applicationId: 101, candidateId: 201 };
function connFor(rows) { return { query: jest.fn().mockResolvedValue([rows]) }; }

async function denied(conn, options = args) {
  await expect(loadVerifiedDecisionWriteScope({ conn, ...options }))
    .rejects.toMatchObject({ statusCode: 403, code: 'OFFER_DECISION_WRITE_SCOPE_DENIED' });
}

describe('SCRUM-103 trusted decision scope reader (read-only SQL, no database)', () => {
  test('resolves correct linked application with a locked Hiring Manager assignment', async () => {
    const conn = connFor([{ ...validRow }]);
    const result = await loadVerifiedDecisionWriteScope({ conn, ...args });
    expect(result.policy).toMatchObject({
      policy_code: 'HIRING_MANAGER_ASSIGNED_DEPARTMENT_V1',
      application_id: 101, candidate_id: 201, recruitment_request_id: 301,
      department_id: 401, decision_maker_id: 7
    });
    expect(result.application.mapping_verified).toBe(true);
    expect(result.application.status).toBe('INTERVIEWING');
    expect(conn.query).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.query.mock.calls[0];
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql).toMatch(/JOIN user_roles ur/);
    expect(sql).toMatch(/role\.role_code = 'HIRING_MANAGER'/);
    expect(sql).toMatch(/jp\.recruitment_request_id = a\.recruitment_request_id/);
    expect(sql).toMatch(/d\.manager_user_id = u\.user_id/);
    expect(params).toEqual([7, 101, 201]);
  });

  test.each([
    ['no matching application, manager or role', []],
    ['ambiguous multiple rows', [validRow, validRow]],
    ['actor inactive', [{ ...validRow, actor_status: 'INACTIVE' }]],
    ['department inactive', [{ ...validRow, department_status: 'INACTIVE' }]],
    ['different assigned manager', [{ ...validRow, department_manager_user_id: 8 }]],
    ['different actor identity', [{ ...validRow, actor_user_id: 8 }]],
    ['different application ID', [{ ...validRow, id: 102 }]],
    ['different candidate ID', [{ ...validRow, candidate_id: 202 }]],
    ['no recruitment request', [{ ...validRow, recruitment_request_id: null }]],
    ['no department', [{ ...validRow, department_id: null }]]
  ])('rejects %s', async (_name, rows) => { await denied(connFor(rows)); });

  test.each([
    ['missing connection', { conn: null, ...args }],
    ['missing actor', { conn: connFor([validRow]), actorUserId: null, applicationId: 101, candidateId: 201 }],
    ['fractional ID', { conn: connFor([validRow]), actorUserId: 7.5, applicationId: 101, candidateId: 201 }],
    ['invalid application ID', { conn: connFor([validRow]), actorUserId: 7, applicationId: '01', candidateId: 201 }],
    ['missing candidate ID', { conn: connFor([validRow]), actorUserId: 7, applicationId: 101, candidateId: undefined }]
  ])('rejects %s', async (_name, input) => {
    await expect(loadVerifiedDecisionWriteScope(input)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('does not hide database failures or claim authority when the query fails', async () => {
    const error = Object.assign(new Error('DB failure'), { code: 'ER_NO_SUCH_TABLE' });
    const conn = { query: jest.fn().mockRejectedValue(error) };
    await expect(loadVerifiedDecisionWriteScope({ conn, ...args })).rejects.toBe(error);
  });
});
