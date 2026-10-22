'use strict';
// Explicit, auditable per-Offer approver selection. A department's assigned
// manager must choose a distinct active APPROVER/DIRECTOR; membership by itself
// cannot authorize approval. All reads/writes use the caller's transaction.
const POLICY = 'DEPARTMENT_MANAGER_EXPLICIT_OFFER_V1';
function pos(v) { if (!['string', 'number'].includes(typeof v) || !/^[1-9]\d*$/.test(String(v))) return null;
  const n=Number(v);return Number.isSafeInteger(n)&&n>0?n:null; }
function error(code, statusCode, message) { return Object.assign(new Error(message),{code,statusCode}); }
const denied=()=>error('OFFER_ASSIGNMENT_DENIED',403,'Khong co quyen phan cong hoac duyet Offer nay.');
const unavailable=()=>error('OFFER_ASSIGNMENT_NOT_READY',503,'Phan cong nguoi duyet Offer chua duoc cau hinh.');
const conflict=()=>error('OFFER_ASSIGNMENT_CONFLICT',409,'Offer da thay doi, vui long tai lai.');
function auditText(m) { return `SCRUM-103;offer_id=${m.offer_id};application_id=${m.application_id};approver_id=${m.approver_id};assigned_by=${m.assigned_by};version=${m.version};policy=${POLICY}`; }
async function verifyManager(conn, managerId, departmentId) {
  const [rows] = await conn.execute(`SELECT d.department_id FROM departments d
    JOIN users u ON u.user_id = d.manager_user_id AND u.status = 'ACTIVE'
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id AND r.role_code IN ('HIRING_MANAGER','HR_MANAGER')
    WHERE d.department_id = ? AND d.manager_user_id = ? AND d.status = 'ACTIVE'
    LIMIT 2`,[departmentId,managerId]);
  return Array.isArray(rows) && rows.length === 1;
}
async function verifyApprover(conn, approverId) {
  const [rows] = await conn.execute(`SELECT DISTINCT u.user_id FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id AND r.role_code IN ('APPROVER','DIRECTOR')
    WHERE u.user_id = ? AND u.status = 'ACTIVE' LIMIT 2`,[approverId]);
  return Array.isArray(rows) && rows.length === 1;
}
async function readMandate(conn, offerId, applicationId, { lock = false } = {}) {
  const [rows] = await conn.execute(`SELECT id, offer_id, application_id, department_id,
      approver_id, assigned_by, version, revoked_at FROM offer_approval_mandates
      WHERE offer_id = ? AND application_id = ? AND revoked_at IS NULL
      ORDER BY id DESC LIMIT 2${lock ? ' FOR UPDATE' : ''}`,[offerId,applicationId]);
  if (!Array.isArray(rows) || rows.length !== 1) throw unavailable();
  return rows[0];
}
async function verifyAudit(conn,m) {
  const [rows] = await conn.execute(`SELECT audit_log_id FROM audit_logs
    WHERE entity_type = 'offer_approval_mandates' AND entity_id = ?
      AND action = 'OFFER_APPROVER_ASSIGNED' AND user_id = ?
      AND performed_by = ? AND description = ? LIMIT 2`,
    [String(m.id), m.assigned_by, m.assigned_by, auditText(m)]);
  return Array.isArray(rows) && rows.length === 1;
}
async function assignExplicit({conn,offerId,approverId,actorUserId,expectedRowVersion}={}) {
  const id=pos(offerId), target=pos(approverId), actor=pos(actorUserId), version=pos(expectedRowVersion);
  if (!id || !target || !actor || !version || !conn?.execute) throw denied();
  // Caller must start transaction. Offer locked first so submit/assign serialize.
  const [offers]=await conn.execute(`SELECT id, application_id, department_id, created_by,
    status, row_version FROM candidate_offers WHERE id = ? FOR UPDATE`,[id]);
  if (offers.length !== 1) throw denied();
  const offer=offers[0];
  if (!pos(offer.application_id) || !pos(offer.department_id)) throw unavailable();
  if (!['DRAFT','CHANGE_REQUESTED'].includes(offer.status) || Number(offer.row_version)!==version) throw conflict();
  if (target===actor || target===pos(offer.created_by)) throw denied();
  if (!await verifyManager(conn,actor,offer.department_id) || !await verifyApprover(conn,target)) throw denied();
  const [active]=await conn.execute(`SELECT id FROM offer_approval_mandates
    WHERE offer_id = ? AND revoked_at IS NULL FOR UPDATE`,[id]);
  if (!Array.isArray(active) || active.length>1) throw unavailable();
  if (active.length) await conn.execute(`UPDATE offer_approval_mandates
    SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL`,[active[0].id]);
  const [count]=await conn.execute('SELECT MAX(version) AS last_version FROM offer_approval_mandates WHERE offer_id = ?',[id]);
  const next=Number(count[0]?.last_version||0)+1;
  if (!Number.isSafeInteger(next)) throw unavailable();
  const [insert]=await conn.execute(`INSERT INTO offer_approval_mandates
    (offer_id,application_id,department_id,approver_id,assigned_by,version,assigned_at)
    VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`,[id,offer.application_id,offer.department_id,target,actor,next]);
  const mandate={id:pos(insert.insertId),offer_id:id,application_id:pos(offer.application_id),
    department_id:pos(offer.department_id),approver_id:target,assigned_by:actor,version:next};
  if (!mandate.id) throw unavailable();
  const [audit]=await conn.execute(`INSERT INTO audit_logs
    (user_id,performed_by,action,entity_type,entity_id,description)
    VALUES (?,?,'OFFER_APPROVER_ASSIGNED','offer_approval_mandates',?,?)`,
    [actor,actor,String(mandate.id),auditText(mandate)]);
  if (!pos(audit.insertId)) throw unavailable();
  return { offer_id:id, assigned_approver_id:target, mandate_version:next };
}
async function resolveSubmissionAssignments(offer,user,decision,conn) {
  const id=pos(offer?.id), app=pos(offer?.application_id);
  if (!id || !app || !pos(user?.user_id) || !conn?.execute) throw unavailable();
  const m=await readMandate(conn,id,app,{lock:true});
  if (!pos(m.id) || pos(m.offer_id)!==id || pos(m.application_id)!==app ||
      pos(m.department_id)!==pos(offer.department_id) || !pos(m.version) ||
      m.revoked_at || pos(m.approver_id)===pos(offer.created_by) ||
      !await verifyManager(conn,m.assigned_by,m.department_id) ||
      !await verifyApprover(conn,m.approver_id) || !await verifyAudit(conn,m)) throw unavailable();
  return {verified:true,offer_id:id,application_id:app,source:POLICY,
    reference:String(m.id),version:String(m.version),assigned_by:pos(m.assigned_by),approver_ids:[pos(m.approver_id)]};
}
// The approver replay must be independent of the assignment snapshot, and
// re-confirm the manager's authority and immutable audit record at approval.
async function verifyProvenance({conn,evidence}={}) {
  if (!conn?.execute || evidence?.assignment_source!==POLICY ||
      !pos(evidence.offer_id) || !pos(evidence.application_id) ||
      !pos(evidence.approver_id) || !pos(evidence.assigned_by) ||
      !pos(evidence.submission_id) || !pos(evidence.offer_row_version)) return {verified:false};
  const m=await readMandate(conn,evidence.offer_id,evidence.application_id,{lock:true});
  const valid=String(m.id)===String(evidence.assignment_reference) &&
    String(m.version)===String(evidence.assignment_version) &&
    pos(m.approver_id)===pos(evidence.approver_id) && pos(m.assigned_by)===pos(evidence.assigned_by) &&
    !m.revoked_at && await verifyManager(conn,m.assigned_by,m.department_id) &&
    await verifyApprover(conn,m.approver_id) && await verifyAudit(conn,m);
  return { verified: Boolean(valid), offer_id:evidence.offer_id, application_id:evidence.application_id,
    submission_id:evidence.submission_id,approver_id:evidence.approver_id,
    offer_row_version:evidence.offer_row_version,
    assignment_reference:evidence.assignment_reference,assignment_version:evidence.assignment_version };
}
module.exports={POLICY,assignExplicit,resolveSubmissionAssignments,verifyProvenance};
