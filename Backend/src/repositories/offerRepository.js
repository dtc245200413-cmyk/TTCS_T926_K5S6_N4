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

module.exports = {
  assertDraftWritesReady, withTransaction, findScopedOfferForUpdate, submitIfEditable,
  loadApplicationForUpdate: unavailable,
  loadDecision: unavailable,
  loadCatalog: unavailable,
  findEffectiveOffers: unavailable,
  insertDraft: unavailable,
  updateDraftIfEditable: unavailable,
  recordSubmission: unavailable
};
