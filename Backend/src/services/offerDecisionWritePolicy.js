'use strict';

// Policy-only helper. Inputs must be loaded and locked by a future trusted
// decision writer. This is NOT an authority audit proof or a write gate.
const POLICY_CODE = 'HIRING_MANAGER_ASSIGNED_DEPARTMENT_V1';

function positiveId(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function denied() {
  const err = new Error('Chua xac minh duoc quyen ra quyet dinh cho ho so nay.');
  err.statusCode = 403;
  err.code = 'OFFER_DECISION_WRITE_SCOPE_DENIED';
  return err;
}

function assertHiringManagerDecisionScope({ actor, application, applicationId, candidateId } = {}) {
  const actorId = positiveId(actor?.user_id);
  const managerId = positiveId(application?.department_manager_user_id);
  const appId = positiveId(application?.id);
  const candidate = positiveId(application?.candidate_id);
  const requestId = positiveId(application?.recruitment_request_id);
  const departmentId = positiveId(application?.department_id);

  const hasManagerRole = Array.isArray(actor?.roles) &&
    actor.roles.some(role => role?.role_code === 'HIRING_MANAGER');

  if (actor?.status !== 'ACTIVE' || !hasManagerRole || actorId === null ||
      managerId === null || actorId !== managerId || appId === null ||
      candidate === null || requestId === null || departmentId === null ||
      application?.mapping_verified !== true ||
      appId !== positiveId(applicationId) || candidate !== positiveId(candidateId)) {
    throw denied();
  }

  // This result is a scoped policy check, NOT verified audit evidence.
  return {
    policy_code: POLICY_CODE,
    application_id: appId,
    candidate_id: candidate,
    recruitment_request_id: requestId,
    department_id: departmentId,
    decision_maker_id: actorId
  };
}

module.exports = { assertHiringManagerDecisionScope, POLICY_CODE };
