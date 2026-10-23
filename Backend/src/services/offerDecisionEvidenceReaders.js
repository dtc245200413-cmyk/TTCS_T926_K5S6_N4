'use strict';
// Authoritative application-specific readers. Never trust the HTTP request's
// interviewer, round results, completion time or application status.
const { createHash } = require('node:crypto');

function id(v) {
  if ((typeof v !== 'number' && typeof v !== 'string') || !/^[1-9]\d*$/.test(String(v))) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
function proofUnavailable() {
  return Object.assign(new Error('Application-specific interview evidence is not verified.'), {
    statusCode: 422, code: 'APPLICATION_EVIDENCE_NOT_VERIFIED'
  });
}
function identity(scope, applicationId, candidateId) {
  const appId = id(applicationId);
  const candId = id(candidateId);
  const requestId = id(scope?.application?.recruitment_request_id);
  if (!appId || !candId || !requestId || id(scope.application?.id) !== appId ||
      id(scope.application?.candidate_id) !== candId || scope.application.mapping_verified !== true) throw proofUnavailable();
  return { appId, candId, requestId };
}
const ALLOWED_APPLICATION_STATES = new Set(['SUBMITTED', 'SCREENING', 'INTERVIEWING', 'IN_REVIEW', 'PASSED']);
async function verifyLifecycle({ conn, scope, applicationId, candidateId } = {}) {
  const { appId, candId, requestId } = identity(scope, applicationId, candidateId);
  if (typeof conn?.execute !== 'function') throw proofUnavailable();
  const [rows] = await conn.execute(`
    SELECT a.id, a.candidate_id, a.recruitment_request_id, a.status,
           UNIX_TIMESTAMP(a.updated_at) AS lifecycle_version,
           (SELECT COUNT(*) FROM candidate_applications other WHERE other.candidate_id = a.candidate_id) AS candidate_application_count
    FROM candidate_applications a
    JOIN job_postings j ON j.id = a.job_posting_id AND j.recruitment_request_id = a.recruitment_request_id
    WHERE a.id = ? AND a.candidate_id = ? AND a.recruitment_request_id = ? FOR UPDATE`, [appId, candId, requestId]);
  if (!Array.isArray(rows) || rows.length !== 1 ||
      id(rows[0].id) !== appId || id(rows[0].candidate_id) !== candId ||
      id(rows[0].recruitment_request_id) !== requestId ||
      Number(rows[0].candidate_application_count) !== 1 ||
      !ALLOWED_APPLICATION_STATES.has(rows[0].status) ||
      !id(rows[0].lifecycle_version)) throw proofUnavailable();
  return { verified: true, application_id: appId, candidate_id: candId,
    recruitment_request_id: requestId, status_version: Number(rows[0].lifecycle_version),
    reference: `application-${appId}` };
}
async function verifyEvaluation({ conn, scope, applicationId, candidateId } = {}) {
  const { appId, candId, requestId } = identity(scope, applicationId, candidateId);
  if (typeof conn?.execute !== 'function') throw proofUnavailable();
  // A candidate-level evaluation is NOT sufficient. Only completed scheduled
  // interviews, linked to the assigned interviewer and the application's
  // position, can serve as evidence. An unlinked legacy evaluation fails closed.
  const [rows] = await conn.execute(`
    SELECT e.id AS evaluation_id, e.interview_schedule_id AS schedule_id,
           e.overall_score, e.status AS evaluation_status, s.end_at,
           s.status AS schedule_status, e.round_id
    FROM candidate_applications a
    JOIN recruitment_requests r ON r.id = a.recruitment_request_id
    JOIN interview_schedules s ON s.candidate_id = a.candidate_id AND s.position_id = r.position_id
    JOIN interview_evaluations e ON e.interview_schedule_id = s.id
      AND e.candidate_id = a.candidate_id AND e.interviewer_id = s.interviewer_id
    JOIN interview_rounds ir ON ir.id = e.round_id AND ir.candidate_id = a.candidate_id
    WHERE a.id = ? AND a.candidate_id = ? AND a.recruitment_request_id = ?
      AND s.status = 'COMPLETED' AND s.end_at <= CURRENT_TIMESTAMP
      AND e.status = 'COMPLETED' AND ir.status = 'COMPLETED'
    ORDER BY e.id FOR UPDATE`, [appId, candId, requestId]);
  if (!Array.isArray(rows) || !rows.length) throw proofUnavailable();
  const seen = new Set();
  let total = 0;
  const references = [];
  for (const row of rows) {
    const evaluationId = id(row.evaluation_id), scheduleId = id(row.schedule_id), roundId = id(row.round_id);
    const score = Number(row.overall_score);
    if (!evaluationId || !scheduleId || !roundId || seen.has(evaluationId) ||
        row.schedule_status !== 'COMPLETED' || row.evaluation_status !== 'COMPLETED' ||
        !Number.isFinite(score) || score < 0 || score > 10 || !row.end_at) throw proofUnavailable();
    seen.add(evaluationId);
    total += score;
    references.push(`${evaluationId}:${scheduleId}:${roundId}:${score}:${new Date(row.end_at).toISOString()}`);
  }
  const average = Math.round(total * 100 / rows.length) / 100;
  const reference = createHash('sha256').update(`${appId}|${references.join('|')}`).digest('hex');
  return { verified: true, application_id: appId, candidate_id: candId,
    recruitment_request_id: requestId, total_rounds_evaluated: new Set(rows.map(x => Number(x.round_id))).size,
    average_score: average, reference };
}
module.exports = { verifyLifecycle, verifyEvaluation, proofUnavailable };
