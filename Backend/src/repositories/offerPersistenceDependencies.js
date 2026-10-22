'use strict';
const validation = require('../services/offerValidation');
const { loadVerifiedDecisionWriteScope } = require('../services/offerDecisionScopeReader');
const { verifyLifecycle, verifyEvaluation } = require('../services/offerDecisionEvidenceReaders');
const { POLICY_CODE } = require('../services/offerDecisionWritePolicy');

function pos(value) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) return null;
  const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// Replays the DB-backed Hiring Manager authorization, application lifecycle,
// actual linked completed interview evidence and the persisted audit receipt.
// Historical candidates.interview_decision='PASSED' is NEVER an authority proof.
async function verifyDecisionAuthority(decision, application, conn) {
  if (!conn || typeof conn.query !== 'function' || typeof conn.execute !== 'function' ||
      decision?.authority_policy !== POLICY_CODE || decision.validity_status !== 'CURRENT' ||
      decision.decision !== 'PASSED' || decision.revoked_at || decision.superseded_at ||
      !pos(decision.id) || !pos(decision.row_version) || !pos(decision.decided_by) ||
      !pos(application?.id) || pos(decision.application_id) !== pos(application?.id) ||
      pos(decision.candidate_id) !== pos(application?.candidate_id) ||
      pos(decision.recruitment_request_id) !== pos(application?.recruitment_request_id) ||
      pos(decision.department_id) !== pos(application?.department_id)) return false;
  const scope = await loadVerifiedDecisionWriteScope({ conn,
    actorUserId: decision.decided_by, applicationId: application.id, candidateId: application.candidate_id });
  if (pos(scope.application.recruitment_request_id) !== pos(application.recruitment_request_id) ||
      pos(scope.application.department_id) !== pos(application.department_id)) return false;
  const lifecycle = await verifyLifecycle({conn, scope, applicationId: application.id,
    candidateId: application.candidate_id});
  const evaluation = await verifyEvaluation({conn, scope, applicationId: application.id,
    candidateId: application.candidate_id});
  const expectedRef = `app:${application.id};lifecycle:${lifecycle.reference};version:${lifecycle.status_version};eval:${evaluation.reference}`;
  if (expectedRef !== decision.authority_reference ||
      Number(decision.total_rounds_evaluated) !== evaluation.total_rounds_evaluated ||
      Number(decision.average_score) !== evaluation.average_score) return false;
  const description = [
    'SCRUM-103', `application_id=${application.id}`, `candidate_id=${application.candidate_id}`,
    `decision=${decision.decision}`, `row_version=${decision.row_version}`,
    `policy=${POLICY_CODE}`
  ].join('; ');
  const [audit] = await conn.execute(`SELECT performed_by, user_id, description
    FROM audit_logs WHERE entity_type = 'candidate_hiring_decisions'
      AND action = 'HIRING_DECISION_RECORDED' AND entity_id = ?
      AND performed_by = ? AND user_id = ? AND description = ? LIMIT 2`,
  [String(decision.id), decision.decided_by, decision.decided_by, description]);
  return Array.isArray(audit) && audit.length === 1 &&
    Number(audit[0].performed_by) === Number(decision.decided_by);
}

// An explicit Offer-specific mandate and matching audit receipt are required.
// Neither role membership nor legacy recruitment-request workflow authorizes an Offer.
async function resolveSubmissionAssignments(offer, user, decision, conn) {
  return require('../services/offerApprovalMandate').resolveSubmissionAssignments(offer,user,decision,conn);
}
module.exports = { verifyDecisionAuthority, resolveSubmissionAssignments };
