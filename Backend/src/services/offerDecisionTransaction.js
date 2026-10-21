'use strict';

const { loadVerifiedDecisionWriteScope } = require('./offerDecisionScopeReader');
const { createOfferDecisionSqlWriter } = require('./offerDecisionSqlWriter');
const { writeOfferDecisionAudit } = require('./offerDecisionAuditWriter');

function positiveId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function failure(statusCode, code, message) {
  return Object.assign(new Error(message), { statusCode, code });
}

const unavailable = () => failure(503, 'DECISION_WRITER_NOT_CONNECTED',
  'Nguon ghi quyet dinh va audit chua duoc tich hop an toan.');
const invalid = () => failure(400, 'INVALID_DECISION_REQUEST', 'Du lieu quyet dinh khong hop le.');

function databaseFailure(error) {
  if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', 'ER_DUP_ENTRY'].includes(error?.code) ||
      [1213, 1205, 1062].includes(error?.errno)) {
    return failure(409, 'DECISION_WRITE_CONFLICT', 'Du lieu da thay doi. Vui long tai lai ho so.');
  }
  if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code) ||
      [1146, 1054].includes(error?.errno)) return unavailable();
  return error;
}

// This is a transaction COORDINATOR, not an active HTTP handler or a DB writer.
// The provided writeDecision and writeAudit adapters MUST use only the passed
// transaction connection and must reject if their schema/lifecycle is unverified.
function createOfferDecisionTransaction({ pool, loadScope = loadVerifiedDecisionWriteScope, writeDecision, writeAudit } = {}) {
  async function record({ actorUserId, applicationId, candidateId, decision, comment, ipAddress } = {}) {
    const actorId = positiveId(actorUserId);
    const appId = positiveId(applicationId);
    const candId = positiveId(candidateId);
    const commentText = typeof comment === 'string' ? comment.trim() : '';

    if (!actorId || !appId || !candId || !['PASSED', 'FAILED'].includes(decision) ||
        commentText.length < 3 || commentText.length > 4000 ||
        (ipAddress != null && (typeof ipAddress !== 'string' || ipAddress.length > 45))) throw invalid();

    // Fail closed before any connection is acquired if real writers are missing.
    if (typeof pool?.getConnection !== 'function' || typeof loadScope !== 'function' ||
        typeof writeDecision !== 'function' || typeof writeAudit !== 'function') throw unavailable();

    const conn = await pool.getConnection();
    let transactionStarted = false;
    try {
      await conn.beginTransaction();
      transactionStarted = true;

      const scope = await loadScope({ conn, actorUserId: actorId, applicationId: appId, candidateId: candId });
      if (!scope || scope.policy?.application_id !== appId ||
          scope.policy?.candidate_id !== candId ||
          scope.policy?.decision_maker_id !== actorId ||
          scope.application?.mapping_verified !== true) {
        throw failure(403, 'DECISION_SCOPE_DENIED', 'Khong xac minh duoc pham vi quyet dinh.');
      }

      // Must lock/check any existing decision row, stage eligibility and version
      // in the adapter itself. A bare UPDATE candidates is NOT a safe adapter.
      const persisted = await writeDecision({
        conn, scope, actorUserId: actorId, applicationId: appId, candidateId: candId,
        decision, comment: commentText
      });
      if (!persisted || positiveId(persisted.id) === null ||
          positiveId(persisted.application_id) !== appId ||
          positiveId(persisted.candidate_id) !== candId ||
          persisted.decision !== decision) throw unavailable();

      const logged = await writeAudit({
        conn, scope, actorUserId: actorId, applicationId: appId, candidateId: candId,
        decision, comment: commentText, decisionRecord: persisted, ipAddress: ipAddress || null
      });
      if (!logged || positiveId(logged.id) === null) throw unavailable();

      await conn.commit();
      transactionStarted = false;
      return { decision_id: positiveId(persisted.id), audit_id: positiveId(logged.id),
        application_id: appId, candidate_id: candId, decision };
    } catch (error) {
      if (transactionStarted) {
        try { await conn.rollback(); } catch (_) { /* preserve the original error */ }
      }
      throw databaseFailure(error);
    } finally {
      conn.release();
    }
  }
  return { record };
}

// Composition entry point for a future server-side caller. No pool import,
// HTTP route or environment switch: importing this file cannot connect/write.
// Callbacks are trusted code dependencies, NEVER fields taken from HTTP input.
// Until both DB-backed verifiers exist, even connection acquisition is blocked.
function createVerifiedOfferDecisionTransaction({ pool, verifyLifecycle, verifyEvaluation } = {}) {
  const ready = typeof verifyLifecycle === 'function' && typeof verifyEvaluation === 'function';
  return createOfferDecisionTransaction({
    pool,
    writeDecision: ready ? createOfferDecisionSqlWriter({ verifyLifecycle, verifyEvaluation }) : undefined,
    writeAudit: writeOfferDecisionAudit
  });
}

module.exports = { createOfferDecisionTransaction, createVerifiedOfferDecisionTransaction };
