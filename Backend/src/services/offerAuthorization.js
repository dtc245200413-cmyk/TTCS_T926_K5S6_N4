function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function hasAnyRole(user, allowedRoles) {
  const roleCodes = user?.roles?.map(r => r.role_code) || [];
  return roleCodes.some(role => allowedRoles.includes(role));
}

function requireInternalUser(user) {
  if (!user) fail(401, 'Vui lòng đăng nhập.');
  if (!Number.isSafeInteger(Number(user.user_id)) || Number(user.user_id) <= 0 ||
      hasAnyRole(user, ['CANDIDATE', 'INTERVIEWER'])) {
    fail(403, 'Bạn không có quyền xem Offer.');
  }
}

// Only explicit creator and department-manager relationships establish scope.
// Membership in the same department does not establish management authority.
function getReadScope(user) {
  requireInternalUser(user);
  if (hasAnyRole(user, ['ADMIN'])) return { sql: '', params: [] };

  const predicates = [];
  const params = [];
  if (hasAnyRole(user, ['RECRUITER'])) {
    predicates.push('o.created_by = ?');
    params.push(user.user_id);
  }
  if (hasAnyRole(user, ['HR_MANAGER'])) {
    predicates.push('d.manager_user_id = ?');
    params.push(user.user_id);
  }
  if (!predicates.length) {
    fail(403, 'Chưa có phạm vi được phép xem Offer cho tài khoản này.');
  }
  return { sql: ` AND (${predicates.join(' OR ')})`, params };
}

function getSubmitScope(user) {
  requireInternalUser(user);
  // Preserve the original submit roles, constrained by the confirmed data scope.
  if (!hasAnyRole(user, ['RECRUITER', 'HR_MANAGER', 'ADMIN'])) {
    fail(403, 'Bạn không có quyền gửi duyệt Offer.');
  }
  return getReadScope(user);
}

function assertCreateAccess(user, application) {
  getSubmitScope(user);
  // This proof must come from the agreed application-access reader, never from
  // HTTP input. No reader is enabled yet, so real creation remains unavailable.
  if (application?.creation_access_verified !== true) {
    fail(403, 'Chưa xác minh được quyền tạo Offer cho hồ sơ này.');
  }
  if (hasAnyRole(user, ['ADMIN', 'RECRUITER'])) return;
  if (Number(application.department_manager_user_id) !== Number(user.user_id)) {
    fail(403, 'Hồ sơ nằm ngoài phạm vi phòng ban được quản lý.');
  }
}

async function getApprovalScope(offerId, user) {
  requireInternalUser(user);
  if (!hasAnyRole(user, ['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN'])) {
    fail(403, 'Bạn không có thẩm quyền phê duyệt Offer.');
  }

  // SCRUM-390/391 dependency: no Offer assignment relation exists in this module.
  // offer_approvals records past actions; recruitment-request workflows and
  // notification recipients are not assignments for this Offer. Even ADMIN
  // read access cannot substitute for a verified approval assignment.
  // Once that relation exists, return its SQL scope for alias o (and params).
  // Do not accept an assignment, role or scope supplied by the request body.
  fail(403, 'Chưa xác minh được phân công phê duyệt Offer cho tài khoản này.');
}

// This is the verified, transaction-bound approval scope. It is deliberately
// separate from getApprovalScope, which still protects the legacy non-atomic
// approval handler. Wire this only to the atomic approval coordinator.
async function loadVerifiedApprovalAssignment({conn,offerId,rowVersion,user}={}) {
  requireInternalUser(user);
  if (!hasAnyRole(user,['APPROVER','DIRECTOR','HR_MANAGER','ADMIN'])) {
    fail(403,'Ban khong co quyen duyet Offer.');
  }
  const {createOfferApprovalAssignmentReader}=require('./offerApprovalAssignmentReader');
  const {verifyProvenance}=require('./offerApprovalMandate');
  return createOfferApprovalAssignmentReader({verifyProvenance}).loadAssignedApprover({
    conn,offerId,actorUserId:user.user_id,rowVersion
  });
}

function getEligibilityScope(user) {
  getSubmitScope(user);
  if (hasAnyRole(user, ['ADMIN'])) return { sql: '', params: [] };
  const predicates = [];
  const params = [];
  // Confirmed policy for eligibility before an Offer exists: primary assigned
  // Recruiter only. This does not change created_by scope for existing Offers.
  if (hasAnyRole(user, ['RECRUITER'])) { predicates.push('r.recruiter_id = ?'); params.push(user.user_id); }
  if (hasAnyRole(user, ['HR_MANAGER'])) { predicates.push('d.manager_user_id = ?'); params.push(user.user_id); }
  return { sql: ` AND (${predicates.join(' OR ')})`, params };
}

module.exports = { getReadScope, getSubmitScope, getApprovalScope, loadVerifiedApprovalAssignment, assertCreateAccess, getEligibilityScope };
