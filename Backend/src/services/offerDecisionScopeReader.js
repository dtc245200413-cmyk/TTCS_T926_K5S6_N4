'use strict';

// READ + LOCK only. This is not the decision writer and does not authorize
// bypassing any of the closed Offer 503 gates.
// The caller MUST pass a connection with an already-open transaction.
const { assertHiringManagerDecisionScope } = require('./offerDecisionWritePolicy');

function positiveId(value) {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function denied() {
  return Object.assign(new Error('Khong xac minh duoc quyen quyet dinh cho ho so.'), {
    statusCode: 403,
    code: 'OFFER_DECISION_WRITE_SCOPE_DENIED'
  });
}

/**
 * Resolve an application-bound decision scope from trusted, locked DB rows.
 *
 * @param {object} opts
 * @param {object} opts.conn - mysql2 transaction connection (beginTransaction done by caller).
 * @param {number} opts.actorUserId - user_id from authenticated server context, never HTTP body.
 * @param {number} opts.applicationId - exact application being decided.
 * @param {number} opts.candidateId - expected candidate from server-side caller context.
 * @returns {Promise<{application: object, actor: object, policy: object}>}
 */
async function loadVerifiedDecisionWriteScope({ conn, actorUserId, applicationId, candidateId } = {}) {
  const userId = positiveId(actorUserId);
  const appId = positiveId(applicationId);
  const candId = positiveId(candidateId);
  if (!conn || typeof conn.query !== 'function' || userId === null || appId === null || candId === null) {
    throw denied();
  }

  // Do not trust roles, department_id, candidate mapping or ACTIVE flags sent
  // by the client. All come from authoritative DB rows in the SAME transaction.
  // Inner JOIN on the HIRING_MANAGER assignment locks the matching user_roles
  // row together with all other selected rows via FOR UPDATE.
  const [rows] = await conn.query(`
    SELECT
      a.id, a.candidate_id, a.recruitment_request_id,
      a.status AS application_status,
      r.department_id,
      d.manager_user_id AS department_manager_user_id,
      d.status AS department_status,
      u.user_id AS actor_user_id,
      u.status AS actor_status
    FROM candidate_applications a
    JOIN candidates c ON c.id = a.candidate_id
      AND c.merged_into_id IS NULL
    JOIN job_postings jp ON jp.id = a.job_posting_id
      AND jp.recruitment_request_id = a.recruitment_request_id
    JOIN recruitment_requests r ON r.id = a.recruitment_request_id
    JOIN departments d ON d.department_id = r.department_id
      AND d.status = 'ACTIVE'
    JOIN users u ON u.user_id = ?
      AND u.status = 'ACTIVE'
      AND d.manager_user_id = u.user_id
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles role ON role.role_id = ur.role_id
      AND role.role_code = 'HIRING_MANAGER'
    WHERE a.id = ? AND a.candidate_id = ?
    FOR UPDATE
  `, [userId, appId, candId]);

  if (!Array.isArray(rows) || rows.length !== 1) throw denied();
  const row = rows[0];
  if (row.department_status !== 'ACTIVE' || row.actor_status !== 'ACTIVE') throw denied();

  const application = {
    id: row.id,
    candidate_id: row.candidate_id,
    recruitment_request_id: row.recruitment_request_id,
    department_id: row.department_id,
    department_manager_user_id: row.department_manager_user_id,
    mapping_verified: true
  };
  const actor = {
    user_id: row.actor_user_id,
    status: row.actor_status,
    roles: [{ role_code: 'HIRING_MANAGER' }]
  };
  const policy = assertHiringManagerDecisionScope({
    actor, application, applicationId: appId, candidateId: candId
  });

  // application_status is only informational. A future writer must separately
  // enforce lifecycle/decision-stage requirements and construct audit evidence.
  return { application: { ...application, status: row.application_status }, actor, policy };
}

module.exports = { loadVerifiedDecisionWriteScope };
