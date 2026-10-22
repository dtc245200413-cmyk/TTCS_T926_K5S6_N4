'use strict';

// Reviewed bridge from authenticated HTTP to the already unit-tested
// transaction coordinator. No actor, proof, assignment or SQL connection
// is ever accepted from the HTTP body.
const { createOfferApprovalTransaction } = require('./offerApprovalTransaction');
const { verifyProvenance } = require('./offerApprovalMandate');
const { expectedVersion } = require('./offerValidation');
function pos(value) {
  if (!['string','number'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

const ROLES = new Set(['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN']);
function deny(code = 'OFFER_APPROVAL_ACCESS_DENIED', statusCode = 403) {
  return Object.assign(new Error('Khong co quyen phe duyet Offer trong lan gui nay.'), { code, statusCode });
}
function unavailable() {
  return Object.assign(new Error('Chuc nang duyet Offer dang cho migration audit/outbox.'),
    { code: 'OFFER_APPROVAL_WRITER_NOT_CONNECTED', statusCode: 503 });
}
function hasApproverRole(user) {
  return Boolean(user?.roles?.some(role => ROLES.has(role?.role_code)));
}
function receipt(event, id) {
  return { acknowledged: true, id, offer_id: event.offer_id,
    submission_id: event.submission_id, actor_user_id: event.actor_user_id };
}
function approvalAuditDescription(event) {
  return ['SCRUM-103', `offer_id=${event.offer_id}`, `application_id=${event.application_id}`,
    `submission_id=${event.submission_id}`, `approval_history_id=${event.approval_history_id}`,
    `actor_user_id=${event.actor_user_id}`, `action=${event.action}`,
    `version=${event.previous_row_version}->${event.new_row_version}`].join(';');
}
async function writeAudit({ conn, event }) {
  if (typeof conn?.execute !== 'function' || !pos(event?.approval_history_id)) throw unavailable();
  const [result] = await conn.execute(
    `INSERT INTO audit_logs (user_id, performed_by, action, entity_type, entity_id, description)
     VALUES (?, ?, 'OFFER_APPROVAL_DECIDED', 'offer_approvals', ?, ?)`,
    [event.actor_user_id, event.actor_user_id, String(event.approval_history_id), approvalAuditDescription(event)]);
  if (!pos(result?.insertId)) throw unavailable();
  return receipt(event, result.insertId);
}
async function enqueueOutbox({ conn, event }) {
  if (typeof conn?.execute !== 'function' || !pos(event?.approval_history_id)) throw unavailable();
  // Lookup on the same locked DB connection; only the original author receives
  // a notification. Do not trust a recipient from request JSON.
  const [rows] = await conn.execute(
    `SELECT created_by FROM candidate_offers WHERE id = ? AND application_id = ? FOR UPDATE`,
    [event.offer_id, event.application_id]);
  if (!Array.isArray(rows) || rows.length !== 1 || !pos(rows[0].created_by)) throw unavailable();
  const recipient = Number(rows[0].created_by);
  const payload = JSON.stringify({
    offer_id: event.offer_id, submission_id: event.submission_id,
    approval_history_id: event.approval_history_id, actor_user_id: event.actor_user_id,
    action: event.action, status: event.status, row_version: event.new_row_version,
    reason: event.reason
  });
  const [result] = await conn.execute(
    `INSERT INTO offer_approval_outbox
       (approval_history_id, offer_id, submission_id, actor_user_id, recipient_user_id,
        action, payload_json, delivery_status, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, CURRENT_TIMESTAMP)`,
    [event.approval_history_id, event.offer_id, event.submission_id, event.actor_user_id,
      recipient, event.action, payload]);
  if (!pos(result?.insertId)) throw unavailable();
  return receipt(event, result.insertId);
}

async function getAssignedOfferDetail({ dbPool, user, offerId } = {}) {
  if (!pos(user?.user_id) || !hasApproverRole(user)) throw deny();
  const id = pos(offerId);
  if (!id) throw deny();
  const livePool = dbPool || require('../config/database').pool;
  if (typeof livePool?.getConnection !== 'function') throw unavailable();
  const conn = await livePool.getConnection();
  let started = false;
  try {
    await conn.beginTransaction();
    started = true;
    const [row] = await conn.execute(`SELECT id, row_version FROM candidate_offers
      WHERE id = ? AND status = 'PENDING_APPROVAL' FOR UPDATE`, [id]);
    if (row?.length !== 1) throw deny();
    const { createOfferApprovalAssignmentReader } = require('./offerApprovalAssignmentReader');
    await createOfferApprovalAssignmentReader({ verifyProvenance }).loadAssignedApprover({
      conn, offerId:id, actorUserId:user.user_id, rowVersion:row[0].row_version
    });
    const [details] = await conn.execute(`SELECT o.*, c.full_name AS candidate_name,
      c.email AS candidate_email, c.phone AS candidate_phone,
      d.department_name, p.position_name, creator.full_name AS creator_name
      FROM candidate_offers o
      JOIN candidates c ON c.id = o.candidate_id
      LEFT JOIN departments d ON d.department_id = o.department_id
      LEFT JOIN job_positions p ON p.position_id = o.position_id
      LEFT JOIN users creator ON creator.user_id = o.created_by
      WHERE o.id = ? AND o.row_version = ? AND o.status = 'PENDING_APPROVAL'`,
      [id, row[0].row_version]);
    if (details?.length !== 1) throw deny();
    const [approvals] = await conn.execute(`SELECT action, reason, action_at, approver_id
      FROM offer_approvals WHERE offer_id = ? ORDER BY action_at DESC`, [id]);
    await conn.commit(); started = false;
    return { ...details[0], approvals };
  } catch (error) {
    if (started) { try { await conn.rollback(); } catch { /* preserve cause */ } }
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) throw unavailable();
    throw error;
  } finally { conn.release(); }
}

async function getAssignedInbox({ dbPool, user } = {}) {
  if (!pos(user?.user_id) || !hasApproverRole(user)) throw deny();
  const livePool = dbPool || require('../config/database').pool;
  if (typeof livePool?.getConnection !== 'function') throw unavailable();
  const conn = await livePool.getConnection();
  let started = false;
  try {
    await conn.beginTransaction();
    started = true;
    // Narrow candidate IDs before materializing any salary/PII. Assignment
    // by itself is NOT enough; each row gets full trusted provenance replay.
    const [candidates] = await conn.execute(`
      SELECT o.id, o.row_version FROM candidate_offers o
      JOIN offer_submissions s ON s.offer_id = o.id AND s.offer_row_version = o.row_version
      JOIN offer_submission_assignments a ON a.submission_id = s.id
        AND a.approver_id = ? AND a.revoked_at IS NULL
      WHERE o.status = 'PENDING_APPROVAL'
        AND s.submission_number = (SELECT MAX(last_s.submission_number)
             FROM offer_submissions last_s WHERE last_s.offer_id = o.id)
      ORDER BY o.id DESC LIMIT 100 FOR UPDATE`, [user.user_id]);
    const { createOfferApprovalAssignmentReader } = require('./offerApprovalAssignmentReader');
    const reader = createOfferApprovalAssignmentReader({ verifyProvenance });
    const offers = [];
    const visited = new Set();
    for (const row of candidates || []) {
      if (visited.has(String(row.id))) continue;
      visited.add(String(row.id));
      try {
        await reader.loadAssignedApprover({ conn, offerId: row.id,
          actorUserId: user.user_id, rowVersion: row.row_version });
      } catch (error) {
        if (error?.statusCode === 403) continue;
        throw error;
      }
      const [details] = await conn.execute(`
        SELECT o.id, o.offer_code, o.status, o.row_version, o.job_title,
               o.basic_salary, o.currency, o.response_deadline, o.created_at,
               c.full_name AS candidate_name, d.department_name,
               p.position_name
        FROM candidate_offers o
        JOIN candidates c ON c.id = o.candidate_id
        LEFT JOIN departments d ON d.department_id = o.department_id
        LEFT JOIN job_positions p ON p.position_id = o.position_id
        WHERE o.id = ? AND o.row_version = ? AND o.status = 'PENDING_APPROVAL'`,
        [row.id, row.row_version]);
      if (details?.length === 1) offers.push(details[0]);
    }
    await conn.commit();
    started = false;
    return offers;
  } catch (error) {
    if (started) { try { await conn.rollback(); } catch { /* preserve cause */ } }
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) throw unavailable();
    throw error;
  } finally { conn.release(); }
}

function createLiveApprovalService({ dbPool } = {}) {
  // Constructor includes ONLY trusted server-side dependencies.
  const coordinator = createOfferApprovalTransaction({
    pool: dbPool || require('../config/database').pool, verifyProvenance, writeAudit, enqueueOutbox
  });
  async function decide({ offerId, user, ifMatch, action, reason }) {
    if (!pos(user?.user_id) || !hasApproverRole(user)) throw deny();
    const expectedRowVersion = expectedVersion(ifMatch);
    return coordinator.decide({ offerId, actorUserId: user.user_id,
      expectedRowVersion, action, reason });
  }
  return { decide };
}

module.exports = { createLiveApprovalService, getAssignedInbox, getAssignedOfferDetail, hasApproverRole, writeAudit,
  enqueueOutbox, approvalAuditDescription };
