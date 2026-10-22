const { assertHiringManagerDecisionScope, POLICY_CODE } = require('./offerDecisionWritePolicy');

const fixture = () => ({
  actor: { user_id: 8, status: 'ACTIVE', roles: [{ role_code: 'HIRING_MANAGER' }] },
  application: { id: 11, candidate_id: 17, recruitment_request_id: 21,
    department_id: 31, department_manager_user_id: 8, mapping_verified: true },
  applicationId: 11,
  candidateId: 17
});

const denied = input => {
  let error;
  try { assertHiringManagerDecisionScope(input); } catch (caught) { error = caught; }
  expect(error).toMatchObject({ statusCode: 403, code: 'OFFER_DECISION_WRITE_SCOPE_DENIED' });
};

describe('SCRUM-103 hiring decision write policy (offline)', () => {
  it('accepts active assigned hiring manager for the exact application', () => {
    const proof = assertHiringManagerDecisionScope(fixture());
    expect(proof).toEqual({ policy_code: POLICY_CODE, application_id: 11,
      candidate_id: 17, recruitment_request_id: 21, department_id: 31, decision_maker_id: 8 });
    expect(proof).not.toHaveProperty('verified');
  });
  it('accepts numeric IDs from DB drivers without changing scope', () => {
    const data = fixture();
    data.actor.user_id = '8'; data.application.department_manager_user_id = '8';
    data.application.id = '11'; data.applicationId = '11';
    expect(assertHiringManagerDecisionScope(data).decision_maker_id).toBe(8);
  });
  it.each(['ADMIN', 'HR_MANAGER', 'RECRUITER', 'APPROVER'])('rejects %s without hiring-manager role', role => {
    const data = fixture(); data.actor.roles = [{ role_code: role }]; denied(data);
  });
  it('requires the hiring-manager role even when an account has other roles', () => {
    const data = fixture(); data.actor.roles.push({ role_code: 'ADMIN' });
    expect(assertHiringManagerDecisionScope(data).decision_maker_id).toBe(8);
  });
  it('rejects same department but different assigned manager', () => {
    const data = fixture(); data.actor.user_id = 9; denied(data);
  });
  it('rejects an inactive manager', () => {
    const data = fixture(); data.actor.status = 'INACTIVE'; denied(data);
  });
  it('rejects a mismatched application ID', () => {
    const data = fixture(); data.applicationId = 12; denied(data);
  });
  it('rejects a mismatched candidate ID', () => {
    const data = fixture(); data.candidateId = 18; denied(data);
  });
  it('rejects unverified application mapping', () => {
    const data = fixture(); data.application.mapping_verified = false; denied(data);
  });
  it('rejects missing real department manager assignment', () => {
    const data = fixture(); data.application.department_manager_user_id = null; denied(data);
  });
  it('rejects an absent request/department anchor', () => {
    const data = fixture(); data.application.recruitment_request_id = null; denied(data);
  });
  it('rejects ambiguous/fractional identifiers', () => {
    const data = fixture(); data.actor.user_id = '8.0'; denied(data);
  });
});
