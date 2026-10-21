'use strict';

// SCRUM-103 review-only adapter for createOfferDecisionTransaction({ writeDecision }).
// This is a real parameterized INSERT for the 010 SQL.review schema, but it is
// FAIL-CLOSED until the owners supply trusted, database-backed lifecycle and
// evaluation verification callbacks. It is NOT mounted on an HTTP route.
const { POLICY_CODE } = require('./offerDecisionWritePolicy');

function positiveId(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function failure(statusCode, code, message) {
  return Object.assign(new Error(message), { statusCode, code });
}

const unavailable = () => failure(503, 'DECISION_EVIDENCE_NOT_READY',
  'Chua co bang chung vong phong van va vong doi Application duoc xac minh.');
const denied = () => failure(403, 'DECISION_SCOPE_DENIED',
  'Nguoi dung khong co tham quyen ra quyet dinh cho Application.');
const conflict = () => failure(409, 'DECISION_ALREADY_EXISTS',
  'Application hoac cap ung vien/yeu cau da co quyet dinh. Khong duoc ghi de.');

// The callbacks must read authoritative DB records using *this* conn;
// they may not rely on request JSON or a candidate-wide PASSED summary.
// verifyLifecycle returns { verified:true, application_id, candidate_id,
//   recruitment_request_id, status_version, reference }.
// verifyEvaluation returns { verified:true, application_id, candidate_id,
//   recruitment_request_id, total_rounds_evaluated, average_score, reference }.
function createOfferDecisionSqlWriter({ verifyLifecycle, verifyEvaluation } = {}) {
  async function writeDecision({ conn, scope, actorUserId, applicationId, candidateId,
    decision, comment } = {}) {
    const actorId = positiveId(actorUserId);
    const appId = positiveId(applicationId);
    const candId = positiveId(candidateId);
    const p = scope?.policy;
    const app = scope?.application;
    const requestId = positiveId(app?.recruitment_request_id);
    const deptId = positiveId(app?.department_id);
    const text = typeof comment === 'string' ? comment.trim() : '';

    if (typeof conn?.execute !== 'function' || !actorId || !appId || !candId ||
        !requestId || !deptId || !['PASSED', 'FAILED'].includes(decision) ||
        text.length < 3 || text.length > 4000) throw unavailable();
    if (app?.mapping_verified !== true || positiveId(app.id) !== appId ||
        positiveId(app.candidate_id) !== candId ||
        p?.policy_code !== POLICY_CODE ||
        positiveId(p.application_id) !== appId ||
        positiveId(p.candidate_id) !== candId ||
        positiveId(p.recruitment_request_id) !== requestId ||
        positiveId(p.department_id) !== deptId ||
        positiveId(p.decision_maker_id) !== actorId) throw denied();

    // This gate is intentionally CLOSED in this review branch: no real
    // application-stage or application-specific interview verifier is wired.
    if (typeof verifyLifecycle !== 'function' ||
        typeof verifyEvaluation !== 'function') throw unavailable();

    const identityMatches = (proof) => proof?.verified === true &&
      positiveId(proof.application_id) === appId &&
      positiveId(proof.candidate_id) === candId &&
      positiveId(proof.recruitment_request_id) === requestId;

    // Must query/lock the underlying state inside this transaction. The
    // caller-provided scope.application.status is informational, not proof.
    const lifecycle = await verifyLifecycle({ conn, scope, applicationId: appId,
      candidateId: candId, actorUserId: actorId, decision });
    if (!identityMatches(lifecycle) ||
        positiveId(lifecycle.status_version) === null ||
        typeof lifecycle.reference !== 'string' ||
        lifecycle.reference.length === 0 || lifecycle.reference.length > 80) {
      throw unavailable();
    }

    const evaluation = await verifyEvaluation({ conn, scope, applicationId: appId,
      candidateId: candId, actorUserId: actorId, decision });
    const rounds = positiveId(evaluation?.total_rounds_evaluated);
    const average = evaluation?.average_score;
    if (!identityMatches(evaluation) || !rounds || rounds > 999999 ||
        !(average === null || (typeof average === 'number' &&
           Number.isFinite(average) && average >= 0 && average <= 10)) ||
        typeof evaluation.reference !== 'string' ||
        evaluation.reference.length === 0 || evaluation.reference.length > 80) {
      throw unavailable();
    }

    // Same connection already has transaction and scope-reader row locks.
    // This query must check BOTH indexes in 010_hiring_decisions.sql.review.
    const [existing] = await conn.execute(`
      SELECT id, application_id, candidate_id, recruitment_request_id
      FROM candidate_hiring_decisions
      WHERE application_id = ? OR (candidate_id = ? AND recruitment_request_id = ?)
      LIMIT 2 FOR UPDATE
    `, [appId, candId, requestId]);
    if (!Array.isArray(existing)) throw unavailable();
    if (existing.length !== 0) throw conflict();

    const authorityReference = `app:${appId};lifecycle:${lifecycle.reference};eval:${evaluation.reference}`;
    if (authorityReference.length > 255) throw unavailable();

    let result;
    try {
      [result] = await conn.execute(`
        INSERT INTO candidate_hiring_decisions
        (candidate_id, recruitment_request_id, department_id, decision_maker_id,
         decision, comments, total_rounds_evaluated, average_score,
         application_id, row_version, validity_status,
         authority_policy, authority_reference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'CURRENT', ?, ?)
      `, [candId, requestId, deptId, actorId, decision, text, rounds, average,
        appId, POLICY_CODE, authorityReference]);
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) throw conflict();
      throw error;
    }
    const id = positiveId(result?.insertId);
    if (result?.affectedRows !== 1 || !id) throw unavailable();

    return { id, application_id: appId, candidate_id: candId,
      recruitment_request_id: requestId, department_id: deptId,
      decision_maker_id: actorId, decision, row_version: 1,
      validity_status: 'CURRENT', authority_policy: POLICY_CODE,
      authority_reference: authorityReference };
  }
  return writeDecision;
}

module.exports = { createOfferDecisionSqlWriter };
