const { pool } = require('../config/database');
const validation = require('../services/offerValidation');
const authorization = require('../services/offerAuthorization');
const dependencies = require('./offerPersistenceDependencies');
const runtimeReadiness = require('../services/offerRuntimeReadiness');

// Closed deliberately: no env flag, request flag or automatic migration enables
// writes. SQL below targets the review draft, NOT a schema known to be deployed.
// Keep closed until migration, decision writer, assignment and notification
// integration have all been verified on an isolated database.
function assertDraftWritesReady() {
  if (!runtimeReadiness.isDraftSchemaReady()) validation.dependencyUnavailable();
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
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) validation.dependencyUnavailable();
    if (['ER_DUP_ENTRY', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) {
      fail(409, 'OFFER_WRITE_CONFLICT', 'Offer đã thay đổi hoặc hồ sơ đã có Offer. Vui lòng tải lại.');
    }
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
async function submitIfEditable(offerId, scope, conn, version) {
  assertDraftWritesReady();
  const [result] = await conn.query(
    `UPDATE candidate_offers o
     LEFT JOIN departments d ON d.department_id = o.department_id
     SET o.status = 'PENDING_APPROVAL', o.submitted_at = NOW(),
         o.row_version = o.row_version + 1, o.updated_at = CURRENT_TIMESTAMP
     WHERE o.id = ?${scope.sql}
       AND o.status IN ('DRAFT', 'CHANGE_REQUESTED') AND o.row_version = ?`,
    [offerId, ...scope.params, validation.positiveId(version, 'row_version')]
  );
  return result.affectedRows;
}

function fail(statusCode, code, message) {
  throw Object.assign(new Error(message), { statusCode, code });
}

async function loadApplicationForUpdate(applicationId, user, conn, { offerId } = {}) {
  assertDraftWritesReady();
  const scope = offerId ? authorization.getSubmitScope(user) : authorization.getEligibilityScope(user);
  const access = offerId
    ? ` AND EXISTS (SELECT 1 FROM candidate_offers o WHERE o.id = ? AND o.application_id = a.id${scope.sql})`
    : scope.sql;
  const [rows] = await conn.query(`
    SELECT a.id, a.candidate_id, a.recruitment_request_id,
           r.department_id, r.position_id, d.manager_user_id AS department_manager_user_id
    FROM candidate_applications a
    JOIN candidates c ON c.id = a.candidate_id AND c.merged_into_id IS NULL
    JOIN job_postings jp ON jp.id = a.job_posting_id
      AND jp.recruitment_request_id = a.recruitment_request_id
    JOIN recruitment_requests r ON r.id = a.recruitment_request_id
    JOIN departments d ON d.department_id = r.department_id
    WHERE a.id = ?${access} FOR UPDATE`,
  [applicationId, ...(offerId ? [offerId] : []), ...scope.params]);
  if (rows.length !== 1) fail(403, 'OFFER_APPLICATION_ACCESS_DENIED', 'Hồ sơ không hợp lệ hoặc ngoài phạm vi được phép.');
  return { ...rows[0], mapping_verified: true, creation_access_verified: !offerId };
}

async function loadDecision(application, conn) {
  assertDraftWritesReady();
  const [rows] = await conn.query(`
    SELECT hd.id, hd.application_id, hd.candidate_id, hd.recruitment_request_id,
           hd.department_id, hd.decision, hd.decision_maker_id AS decided_by,
           hd.decided_at, hd.row_version, hd.validity_status, hd.revoked_at,
           hd.superseded_at, hd.authority_policy, hd.authority_reference,
           hd.total_rounds_evaluated, hd.average_score
    FROM candidate_hiring_decisions hd
    WHERE hd.application_id = ? AND hd.candidate_id = ?
      AND hd.recruitment_request_id = ? AND hd.department_id = ?
    FOR UPDATE`, [application.id, application.candidate_id, application.recruitment_request_id, application.department_id]);
  const row = rows[0];
  if (rows.length !== 1 || !row || Number(row.application_id) !== Number(application.id) ||
      Number(row.candidate_id) !== Number(application.candidate_id) ||
      Number(row.recruitment_request_id) !== Number(application.recruitment_request_id) ||
      Number(row.department_id) !== Number(application.department_id)) {
    fail(422, 'OFFER_DECISION_UNVERIFIED', 'Chưa có quyết định hợp lệ cho đúng hồ sơ.');
  }
  if (row.validity_status !== 'CURRENT' || row.revoked_at || row.superseded_at) {
    fail(422, 'OFFER_DECISION_NOT_CURRENT', 'Quyết định tuyển dụng không còn hiệu lực hoặc chưa được xác minh.');
  }
  if (row.decision !== 'PASSED') fail(422, 'OFFER_DECISION_NOT_PASSED', 'Hồ sơ chưa có quyết định Đạt.');
  if (![row.id, row.row_version].every(value => Number.isSafeInteger(Number(value)) && Number(value) > 0)) {
    validation.dependencyUnavailable();
  }
  // A CURRENT marker is not proof of authority. The decision owner's verifier
  // must validate the writer's policy/reference, actor and application scope.
  const authority = await dependencies.verifyDecisionAuthority(row, application, conn);
  if (authority !== true || !row.authority_policy || !row.authority_reference) validation.dependencyUnavailable();
  const decision = { ...row, source: 'candidate_hiring_decisions', reference: row.id,
    version: row.row_version, authority_verified: true, is_current: true };
  validation.assertPassedDecision(application, decision);
  return decision;
}

async function loadCatalog(content, application, conn) {
  assertDraftWritesReady();
  const [rows] = await conn.query(`
    SELECT d.department_id, d.status AS department_status,
           p.position_id, p.status AS position_status
    FROM recruitment_requests r
    JOIN departments d ON d.department_id = r.department_id
    LEFT JOIN job_positions p ON p.position_id = r.position_id
    WHERE r.id = ? AND d.department_id = ? FOR UPDATE`,
  [application.recruitment_request_id, application.department_id]);
  const row = rows[0];
  return row ? { department: { id: Number(row.department_id), active: row.department_status === 'ACTIVE' },
    position: row.position_id ? { id: Number(row.position_id), active: row.position_status === 'ACTIVE' } : null } : null;
}

async function findEffectiveOffers(application, exceptId, conn) {
  assertDraftWritesReady();
  // Name retained for existing callers. ALL statuses block a second Offer.
  // Unmapped legacy Offers also block creation pending a reviewed mapping.
  const [rows] = await conn.query(`SELECT id FROM candidate_offers
    WHERE (application_id = ? OR (application_id IS NULL AND candidate_id = ?))
      AND (? IS NULL OR id <> ?) FOR UPDATE`,
  [application.id, application.candidate_id, exceptId ?? null, exceptId ?? null]);
  return rows;
}

const contentFields = ['position_id', 'job_title', 'basic_salary', 'currency', 'expected_start_date',
  'response_deadline', 'work_location', 'benefits', 'message', 'special_terms'];

async function insertDraft(input, conn) {
  assertDraftWritesReady();
  const fields = ['offer_code', 'application_id', 'candidate_id', 'recruitment_request_id',
    'department_id', 'created_by', 'decision_source', 'decision_reference', 'decision_version', ...contentFields];
  const values = fields.map(key => input[key] ?? null);
  // New/edited content is mirrored atomically for the existing Portal DTO. No
  // legacy row is backfilled, published or changed by this insert.
  const [result] = await conn.query(`INSERT INTO candidate_offers
    (${fields.join(', ')}, hiring_decision_id, salary_amount, start_date, status, row_version, created_at, updated_at)
    VALUES (${fields.map(() => '?').join(', ')}, ?, ?, ?, 'DRAFT', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  [...values, validation.positiveId(input.decision_reference, 'decision_reference'),
    input.basic_salary ?? null, input.expected_start_date ?? null]);
  const [rows] = await conn.query('SELECT * FROM candidate_offers WHERE id = ?', [result.insertId]);
  if (rows.length !== 1) throw new Error('Inserted Offer could not be read in its transaction');
  return rows[0]; // Actual row_version and database timestamps; never synthesize a response.
}

async function updateDraftIfEditable(offerId, input, scope, version, conn) {
  assertDraftWritesReady();
  const patch = validation.normalizeDraft(input);
  const fields = Object.keys(patch);
  const assignments = fields.map(key => `o.${key} = ?`);
  const values = fields.map(key => patch[key]);
  if (Object.hasOwn(patch, 'basic_salary')) { assignments.push('o.salary_amount = ?'); values.push(patch.basic_salary); }
  if (Object.hasOwn(patch, 'expected_start_date')) { assignments.push('o.start_date = ?'); values.push(patch.expected_start_date); }
  const [result] = await conn.query(`UPDATE candidate_offers o
    LEFT JOIN departments d ON d.department_id = o.department_id
    SET ${assignments.join(', ')}, o.row_version = o.row_version + 1, o.updated_at = CURRENT_TIMESTAMP
    WHERE o.id = ?${scope.sql} AND o.row_version = ?
      AND o.status IN ('DRAFT', 'CHANGE_REQUESTED')`, [ ...values, offerId, ...scope.params, version ]);
  return result.affectedRows;
}

async function recordSubmission(offer, user, decision, conn) {
  assertDraftWritesReady();
  const plan = await dependencies.resolveSubmissionAssignments(offer, user, decision, conn);
  if (plan?.verified !== true || Number(plan.offer_id) !== Number(offer.id) ||
      Number(plan.application_id) !== Number(offer.application_id) || !plan.source || !plan.reference ||
      !plan.version || !Number.isSafeInteger(plan.assigned_by) || plan.assigned_by <= 0 ||
      !Array.isArray(plan.approver_ids) || !plan.approver_ids.length ||
      plan.approver_ids.some(id => !Number.isSafeInteger(id) || id <= 0)) validation.dependencyUnavailable();
  const approvers = [...new Set(plan.approver_ids)];
  // Assignment proof is supplied by the trusted workflow resolver, never by the
  // draft HTTP payload. Account liveness is an additional check, not authority.
  const [active] = await conn.query(`SELECT user_id FROM users WHERE status = 'ACTIVE'
    AND user_id IN (${approvers.map(() => '?').join(', ')}) FOR UPDATE`, approvers);
  if (active.length !== approvers.length) validation.dependencyUnavailable();
  // Caller holds the Offer lock. A unique pair prevents repeated history for
  // the same persisted version even if a caller accidentally repeats this step.
  const [versions] = await conn.query(`SELECT row_version FROM candidate_offers
    WHERE id = ? AND status = 'PENDING_APPROVAL' FOR UPDATE`, [offer.id]);
  if (versions.length !== 1 || Number(versions[0].row_version) !== Number(offer.row_version) + 1) {
    fail(409, 'OFFER_SUBMISSION_CONFLICT', 'Phiên bản gửi duyệt đã thay đổi.');
  }
  const [last] = await conn.query('SELECT MAX(submission_number) AS last_number FROM offer_submissions WHERE offer_id = ?', [offer.id]);
  const number = Number(last[0]?.last_number || 0) + 1;
  const snapshot = Object.fromEntries(['application_id', 'candidate_id', 'recruitment_request_id',
    'department_id', ...contentFields].map(key => [key, offer[key] ?? null]));
  const [result] = await conn.query(`INSERT INTO offer_submissions
    (offer_id, submission_number, offer_row_version, submitted_by, submitted_at,
     decision_source, decision_reference, decision_version, decision_snapshot, content_snapshot)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)`,
  [offer.id, number, versions[0].row_version, user.user_id, decision.source, String(decision.reference),
    String(decision.version), JSON.stringify(decision), JSON.stringify(snapshot)]);
  for (const approver of approvers) {
    await conn.query(`INSERT INTO offer_submission_assignments
      (submission_id, approver_id, assigned_by, assignment_source, assignment_reference, assignment_version, assigned_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [result.insertId, approver, plan.assigned_by, plan.source, String(plan.reference), String(plan.version)]);
  }
  return { id: result.insertId, offer_id: offer.id, submission_number: number, approver_ids: approvers };
}

// Read-only eligibility against the 5.2C target schema. The interview_* aliases
// preserve the service's internal DTO, but values come ONLY from the dedicated
// application-bound decision. CURRENT/actor metadata alone is not authority:
// the service still returns eligible=false until the verifier is integrated.
async function readEligibilityApplications(filters, scope) {
  const params = [...scope.params];
  let where = scope.sql;
  for (const [key, column] of [['application_id', 'a.id'], ['candidate_id', 'a.candidate_id']]) {
    if (filters[key]) { where += ` AND ${column} = ?`; params.push(filters[key]); }
  }
  if (filters.after_id) { where += ' AND a.id > ?'; params.push(filters.after_id); }
  const [rows] = await pool.query(`
    SELECT a.id AS application_id, a.application_code, a.candidate_id,
           hd.id AS verified_decision_id,
           a.recruitment_request_id, c.full_name AS candidate_name,
           hd.recruitment_request_id AS candidate_request_id,
           CASE WHEN hd.validity_status = 'CURRENT' AND hd.revoked_at IS NULL
             AND hd.superseded_at IS NULL THEN hd.decision ELSE NULL END AS interview_decision,
           hd.decision_maker_id AS interview_decision_by, hd.decided_at AS interview_decision_at,
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
    LEFT JOIN candidate_hiring_decisions hd ON hd.application_id = a.id
      AND hd.candidate_id = a.candidate_id
      AND hd.recruitment_request_id = a.recruitment_request_id
      AND hd.department_id = r.department_id
    WHERE c.merged_into_id IS NULL${where}
    ORDER BY a.id ASC LIMIT 51
  `, params);
  return rows;
}

module.exports = {
  assertDraftWritesReady, withTransaction, findScopedOfferForUpdate, submitIfEditable,
  readEligibilityApplications,
  loadApplicationForUpdate, loadDecision, loadCatalog, findEffectiveOffers,
  insertDraft, updateDraftIfEditable, recordSubmission
};
