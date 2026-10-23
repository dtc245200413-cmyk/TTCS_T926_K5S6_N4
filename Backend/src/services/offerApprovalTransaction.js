'use strict';

// Review-only, fail-closed coordinator. No HTTP route, startup hook or pool
// import is registered by this file. All effects run on one InnoDB connection.
// See migrations/SCRUM103_APPROVAL_TRANSACTION_REVIEW.md.
const { createOfferApprovalAssignmentReader } = require('./offerApprovalAssignmentReader');

function positiveId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function failure(statusCode, code, message) {
  return Object.assign(new Error(message), { statusCode, code });
}
const unavailable = () => failure(503, 'OFFER_APPROVAL_WRITER_NOT_CONNECTED',
  'Quy trinh duyet Offer chua duoc ket noi day du audit va outbox.');
const invalid = () => failure(400, 'OFFER_APPROVAL_INVALID_INPUT', 'Du lieu yeu cau duyet Offer khong hop le.');
const denied = () => failure(403, 'OFFER_APPROVAL_DENIED', 'Khong co quyen duyet Offer trong lan gui hien tai.');
const conflict = () => failure(409, 'OFFER_APPROVAL_CONFLICT', 'Offer da thay doi. Vui long tai lai.');

function mapSqlError(error) {
  if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code) || [1146, 1054].includes(error?.errno)) return unavailable();
  if (['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error?.code) ||
      [1062, 1213, 1205].includes(error?.errno)) return conflict();
  return error;
}

// Trusted adapters only: NEVER pass the request body's "assignment", "proof",
// role, audit or notification data as one of these callbacks.
// writeAudit and enqueueOutbox MUST use the SAME conn, return
// { acknowledged: true, offer_id, submission_id, actor_user_id, id: positive }
// after durable SQL writes (not in-memory promises or logging).
// enqueueOutbox must persist a retryable event; it must not directly send email.
function createOfferApprovalTransaction({ pool, verifyProvenance, writeAudit, enqueueOutbox } = {}) {
  const reader = createOfferApprovalAssignmentReader({ verifyProvenance });
  async function decide({ offerId, actorUserId, expectedRowVersion, action, reason } = {}) {
    const id = positiveId(offerId);
    const actorId = positiveId(actorUserId);
    const version = positiveId(expectedRowVersion);
    const allowed = ['APPROVED', 'REJECTED', 'REQUEST_CHANGE'];
    const note = typeof reason === 'string' ? reason.trim() : '';
    if (!id || !actorId || !version || !allowed.includes(action) ||
        (reason !== undefined && typeof reason !== 'string') || note.length > 4000 ||
        (action !== 'APPROVED' && !note)) throw invalid();

    // Missing production components are a hard 503 BEFORE acquiring a
    // connection or performing any write.
    if (typeof pool?.getConnection !== 'function' ||
        typeof verifyProvenance !== 'function' ||
        typeof writeAudit !== 'function' ||
        typeof enqueueOutbox !== 'function') throw unavailable();

    const conn = await pool.getConnection();
    let started = false;
    try {
      if (typeof conn?.beginTransaction !== 'function' || typeof conn?.execute !== 'function' ||
          typeof conn?.commit !== 'function' || typeof conn?.rollback !== 'function') throw unavailable();
      await conn.beginTransaction();
      started = true;

      // The Offer is locked before assignment/provenance replay; unrelated or
      // stale candidates cannot disclose the Offer's salary in the response.
      const [rows] = await conn.execute(
        `SELECT id, application_id, row_version, status, created_by
         FROM candidate_offers WHERE id = ? FOR UPDATE`, [id]);
      if (!Array.isArray(rows) || rows.length !== 1) throw denied();
      const offer = rows[0];
      if (positiveId(offer.id) !== id || !positiveId(offer.application_id)) throw unavailable();
      if (offer.status !== 'PENDING_APPROVAL' || positiveId(offer.row_version) !== version) throw conflict();

      const assignment = await reader.loadAssignedApprover({
        conn, offerId: id, actorUserId: actorId, rowVersion: version
      });
      if (assignment?.provenance_verified !== true ||
          positiveId(assignment.offer_id) !== id ||
          positiveId(assignment.application_id) !== positiveId(offer.application_id) ||
          positiveId(assignment.approver_id) !== actorId ||
          positiveId(assignment.offer_row_version) !== version ||
          !positiveId(assignment.submission_id)) throw denied();

      const submissionId = positiveId(assignment.submission_id);
      const newStatus = action === 'REQUEST_CHANGE' ? 'CHANGE_REQUESTED' : action;
      const [update] = await conn.execute(
        `UPDATE candidate_offers
         SET status = ?, approved_at = CASE WHEN ? = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE NULL END,
             row_version = row_version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'PENDING_APPROVAL' AND row_version = ?`,
        [newStatus, action, id, version]);
      if (update?.affectedRows !== 1) throw conflict();

      // This legacy history table has no submission_id FK. The trusted audit
      // and outbox adapters MUST persist submission_id, allowing later replay.
      const [history] = await conn.execute(
        `INSERT INTO offer_approvals (offer_id, approver_id, action, reason, action_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, actorId, action, note || null]);
      if (!positiveId(history?.insertId)) throw unavailable();

      const event = Object.freeze({
        offer_id: id, application_id: positiveId(offer.application_id),
        submission_id: submissionId, actor_user_id: actorId,
        previous_row_version: version, new_row_version: version + 1,
        action, status: newStatus, reason: note || null,
        approval_history_id: positiveId(history.insertId)
      });
      for (const adapter of [writeAudit, enqueueOutbox]) {
        const ack = await adapter({ conn, event, assignment });
        if (ack?.acknowledged !== true || !positiveId(ack.id) ||
            positiveId(ack.offer_id) !== id ||
            positiveId(ack.submission_id) !== submissionId ||
            positiveId(ack.actor_user_id) !== actorId) throw unavailable();
      }
      await conn.commit();
      started = false;
      return {
        offer_id: id, submission_id: submissionId, row_version: version + 1,
        status: newStatus, action, notification_status: 'QUEUED_NOT_DELIVERED'
      };
    } catch (error) {
      if (started) {
        try { await conn.rollback(); } catch { /* Preserve original failure. */ }
      }
      throw mapSqlError(error);
    } finally {
      conn.release();
    }
  }
  return { decide };
}

module.exports = { createOfferApprovalTransaction };
