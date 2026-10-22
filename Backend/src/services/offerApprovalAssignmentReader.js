'use strict';

// Integration building block ONLY. Do not mount this on routes or replace the
// existing fail-closed getApprovalScope/processApproval. Production still needs
// an approved, database-backed provenance verifier and atomic approval writer.
function positiveId(value) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function failure(statusCode, code, message) {
  return Object.assign(new Error(message), { statusCode, code });
}
const unavailable = () => failure(503, 'OFFER_APPROVAL_ASSIGNMENT_DEPENDENCY_UNAVAILABLE',
  'Nguon xac minh phan cong phe duyet Offer chua san sang.');
const denied = () => failure(403, 'OFFER_APPROVAL_ASSIGNMENT_DENIED',
  'Khong xac minh duoc quyen duyet Offer trong lan gui hien tai.');

// Caller starts a transaction, passes its SAME conn, and locks the Offer row
// before using this reader. Provenance must be independently checked from
// immutable authoritative workflow evidence, not merely assignment metadata.
function createOfferApprovalAssignmentReader({ verifyProvenance } = {}) {
  async function loadAssignedApprover({ conn, offerId, actorUserId, rowVersion } = {}) {
    const id = positiveId(offerId);
    const actorId = positiveId(actorUserId);
    const version = positiveId(rowVersion);
    if (!id || !actorId || !version || typeof conn?.execute !== 'function') throw denied();
    // Deliberately do not even access SQL without trusted provenance verifier.
    if (typeof verifyProvenance !== 'function') throw unavailable();
    let rows;
    try {
      [rows] = await conn.execute(`
        SELECT o.id AS offer_id, o.application_id, o.row_version,
               s.id AS submission_id, s.submission_number,
               s.offer_row_version, s.decision_source, s.decision_reference,
               s.decision_version, a.approver_id, a.assigned_by,
               a.assignment_source, a.assignment_reference, a.assignment_version
        FROM candidate_offers o
        JOIN offer_submissions s ON s.offer_id = o.id
          AND s.offer_row_version = o.row_version
        JOIN offer_submission_assignments a ON a.submission_id = s.id
          AND a.approver_id = ? AND a.revoked_at IS NULL
        JOIN users u ON u.user_id = a.approver_id AND u.status = 'ACTIVE'
        WHERE o.id = ? AND o.row_version = ? AND o.status = 'PENDING_APPROVAL'
          AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.role_id = ur.role_id
            WHERE ur.user_id = u.user_id AND r.role_code IN
              ('APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN')
          )
          AND s.submission_number = (
            SELECT MAX(last_sub.submission_number)
            FROM offer_submissions last_sub WHERE last_sub.offer_id = o.id
          )
        FOR UPDATE`, [actorId, id, version]);
    } catch (error) {
      if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) throw unavailable();
      throw error;
    }
    // Do not return the sensitive snapshot of an unauthorized or ambiguous row.
    if (!Array.isArray(rows) || rows.length !== 1) throw denied();
    const assignment = rows[0];
    const submissionId = positiveId(assignment.submission_id);
    const assignedBy = positiveId(assignment.assigned_by);
    const applicationId = positiveId(assignment.application_id);
    if (positiveId(assignment.offer_id) !== id ||
        positiveId(assignment.approver_id) !== actorId ||
        positiveId(assignment.row_version) !== version ||
        positiveId(assignment.offer_row_version) !== version ||
        !submissionId || !assignedBy || !applicationId ||
        !positiveId(assignment.submission_number) ||
        !['assignment_source', 'assignment_reference', 'assignment_version',
          'decision_source', 'decision_reference', 'decision_version'].every(field =>
          typeof assignment[field] === 'string' && assignment[field].trim().length > 0)) throw denied();
    const evidence = Object.freeze({
      offer_id: id, application_id: applicationId,
      submission_id: submissionId, submission_number: Number(assignment.submission_number),
      offer_row_version: version, approver_id: actorId, assigned_by: assignedBy,
      assignment_source: assignment.assignment_source,
      assignment_reference: assignment.assignment_reference,
      assignment_version: assignment.assignment_version,
      decision_source: assignment.decision_source,
      decision_reference: assignment.decision_reference,
      decision_version: assignment.decision_version
    });
    // Must replay assignment's trusted policy/reference against the authoritative
    // owner/audit; source/reference stored in DB are NOT proof themselves.
    const proof = await verifyProvenance({ conn, evidence });
    if (proof?.verified !== true ||
        positiveId(proof.offer_id) !== id ||
        positiveId(proof.application_id) !== applicationId ||
        positiveId(proof.submission_id) !== submissionId ||
        positiveId(proof.approver_id) !== actorId ||
        positiveId(proof.offer_row_version) !== version ||
        proof.assignment_reference !== evidence.assignment_reference ||
        proof.assignment_version !== evidence.assignment_version) throw denied();
    return Object.freeze({ ...evidence, provenance_verified: true });
  }
  return { loadAssignedApprover };
}

module.exports = { createOfferApprovalAssignmentReader };
