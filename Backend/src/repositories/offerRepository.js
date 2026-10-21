const { pool } = require('../config/database');
const validation = require('../services/offerValidation');

// Closed deliberately: no env flag, request flag or automatic migration enables
// writes. Replace this gate AND implement the unresolved persistence contracts
// only after the application key, decision source and schema have been reviewed.
function assertDraftWritesReady() {
  validation.dependencyUnavailable();
}

async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try { await conn.rollback(); } catch { /* Preserve the original failure. */ }
    throw error;
  } finally {
    conn.release();
  }
}

// SQL already used by the shared Offer module; lock the authorized row before
// inspecting state. Unauthorized callers never receive the selected contents.
async function findScopedOfferForUpdate(offerId, scope, conn) {
  const [rows] = await conn.query(
    `SELECT o.*, c.full_name AS candidate_name
     FROM candidate_offers o
     JOIN candidates c ON c.id = o.candidate_id
     LEFT JOIN departments d ON d.department_id = o.department_id
     WHERE o.id = ?${scope.sql}
     FOR UPDATE`,
    [offerId, ...scope.params]
  );
  return rows[0] || null;
}

// Preserve the atomic permission/state predicate from 2A.1. This method is also
// guarded: directly importing the repository cannot bypass the closed feature.
async function submitIfEditable(offerId, scope, conn) {
  assertDraftWritesReady();
  const [result] = await conn.query(
    `UPDATE candidate_offers o
     LEFT JOIN departments d ON d.department_id = o.department_id
     SET o.status = 'PENDING_APPROVAL', o.submitted_at = NOW()
     WHERE o.id = ?${scope.sql}
       AND o.status IN ('DRAFT', 'CHANGE_REQUESTED')`,
    [offerId, ...scope.params]
  );
  return result.affectedRows;
}

// Explicit, unimplemented ports, NOT SQL against a guessed schema.
// loadApplicationForUpdate: stable application identity + mapping/access proof,
// locked to serialize creation on the same profile.
// loadDecision: current, authorized decision bound to that exact application.
// findEffectiveOffers: [] only after the active-status policy is confirmed.
// insertDraft/updateDraft: enforce DB uniqueness and status + scope + row_version
// at the write itself; return persisted rows/affected count. No candidate update.
// recordSubmission: durable per-offer submission identity in the same transaction.
const unavailable = async () => validation.dependencyUnavailable();

// Read-only eligibility. IDs come from real FKs; never match by name/email.
// No decision is promoted to an application-bound PASSED proof here.
async function readEligibilityApplications(filters, scope) {
  const params = [...scope.params];
  let where = scope.sql;
  for (const [key, column] of [['application_id', 'a.id'], ['candidate_id', 'a.candidate_id']]) {
    if (filters[key]) { where += ` AND ${column} = ?`; params.push(filters[key]); }
  }
  if (filters.after_id) { where += ' AND a.id > ?'; params.push(filters.after_id); }
  const [rows] = await pool.query(`
    SELECT a.id AS application_id, a.application_code, a.candidate_id,
           a.recruitment_request_id, c.full_name AS candidate_name,
           c.recruitment_request_id AS candidate_request_id,
           c.interview_decision, c.interview_decision_by, c.interview_decision_at,
           jp.recruitment_request_id AS posting_request_id, r.id AS request_id,
           d.department_id, d.department_name, d.status AS department_status,
           p.position_id, p.position_name, p.status AS position_status,
           EXISTS(SELECT 1 FROM candidate_offers o WHERE o.application_id = a.id
             AND o.status IN ('DRAFT', 'PENDING_APPROVAL', 'CHANGE_REQUESTED',
               'APPROVED', 'SENT', 'PENDING_RESPONSE', 'ACCEPTED')) AS has_effective_offer,
           EXISTS(SELECT 1 FROM candidate_offers o WHERE o.application_id = a.id) AS has_offer_history,
           EXISTS(SELECT 1 FROM candidate_offers o WHERE o.candidate_id = a.candidate_id
             AND o.application_id IS NULL) AS has_unmapped_offer
    FROM candidate_applications a
    JOIN candidates c ON c.id = a.candidate_id
    LEFT JOIN job_postings jp ON jp.id = a.job_posting_id
    LEFT JOIN recruitment_requests r ON r.id = a.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = r.department_id
    LEFT JOIN job_positions p ON p.position_id = r.position_id
    WHERE c.merged_into_id IS NULL${where}
    ORDER BY a.id ASC LIMIT 51
  `, params);
  return rows;
}

module.exports = {
  assertDraftWritesReady, withTransaction, findScopedOfferForUpdate, submitIfEditable,
  readEligibilityApplications,
  loadApplicationForUpdate: unavailable,
  loadDecision: unavailable,
  loadCatalog: unavailable,
  findEffectiveOffers: unavailable,
  insertDraft: unavailable,
  updateDraftIfEditable: unavailable,
  recordSubmission: unavailable
};
