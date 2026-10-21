'use strict';

// Adapter for createOfferDecisionTransaction({ writeAudit }). It MUST be
// called with the same mysql2 connection inside the active transaction.
// This file does NOT connect a live route or bypass the closed Offer gates.
function positiveId(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function notReady() {
  return Object.assign(new Error('Khong du bang chung de ghi audit quyet dinh.'), {
    statusCode: 503,
    code: 'DECISION_AUDIT_NOT_READY'
  });
}

async function writeOfferDecisionAudit({
  conn, scope, actorUserId, applicationId, candidateId,
  decision, comment, decisionRecord, ipAddress
} = {}) {
  const actorId = positiveId(actorUserId);
  const appId = positiveId(applicationId);
  const candId = positiveId(candidateId);
  const decisionId = positiveId(decisionRecord?.id);
  const policy = scope?.policy;
  const address = ipAddress == null ? null : ipAddress;
  if (typeof conn?.execute !== 'function' || !actorId || !appId || !candId || !decisionId ||
      !['PASSED', 'FAILED'].includes(decision) ||
      typeof comment !== 'string' || comment.trim().length < 3 || comment.length > 4000 ||
      (address !== null && (typeof address !== 'string' || address.length > 45)) ||
      scope?.application?.mapping_verified !== true ||
      positiveId(scope.application.id) !== appId ||
      positiveId(scope.application.candidate_id) !== candId ||
      policy?.policy_code !== 'HIRING_MANAGER_ASSIGNED_DEPARTMENT_V1' ||
      positiveId(policy.decision_maker_id) !== actorId ||
      positiveId(policy.application_id) !== appId ||
      positiveId(policy.candidate_id) !== candId ||
      positiveId(decisionRecord.application_id) !== appId ||
      positiveId(decisionRecord.candidate_id) !== candId ||
      positiveId(decisionRecord.decision_maker_id) !== actorId ||
      decisionRecord.decision !== decision ||
      decisionRecord.validity_status !== 'CURRENT' ||
      positiveId(decisionRecord.row_version) === null) {
    throw notReady();
  }

  const description = [
    'SCRUM-103',
    `application_id=${appId}`,
    `candidate_id=${candId}`,
    `decision=${decision}`,
    `row_version=${decisionRecord.row_version}`,
    `policy=${policy.policy_code}`
  ].join('; ');

  // audit_logs PK is audit_log_id, returned as mysql2 result.insertId.
  // Do NOT call auditRepository.createLog here: it uses pool.execute() and
  // would write OUTSIDE the coordinator transaction.
  const [result] = await conn.execute(`
    INSERT INTO audit_logs
      (user_id, performed_by, action, entity_type, entity_id, description, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [actorId, actorId, 'HIRING_DECISION_RECORDED',
    'candidate_hiring_decisions', String(decisionId), description, address]);

  const id = positiveId(result?.insertId);
  if (!id) throw notReady();
  return { id };
}

module.exports = { writeOfferDecisionAudit };
