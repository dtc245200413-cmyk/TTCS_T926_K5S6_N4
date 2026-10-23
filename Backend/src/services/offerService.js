/**
 * offerService.js
 * Quản lý quy trình Thư mời nhận việc (Offer), Phê duyệt Offer và gửi thông báo theo User Story 5 & US 4.
 */

const { pool } = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const offerAuthorization = require('./offerAuthorization');
const offerRepository = require('../repositories/offerRepository');
const validation = require('./offerValidation');
const { withOfferSchemaGuard } = require('./offerSchemaCompatibility');
const { randomUUID } = require('crypto');
const decisionDependencies = require('../repositories/offerPersistenceDependencies');

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Lấy danh sách Offer có lọc theo vai trò và trạng thái
 */
async function getAllOffers(query, user) {
  const scope = offerAuthorization.getReadScope(user);
  const { status, search } = query;
  let sql = `
    SELECT o.*,
           c.full_name AS candidate_name,
           c.email AS candidate_email,
           c.phone AS candidate_phone,
           d.department_name,
           jp.position_name,
           u_creator.full_name AS creator_name,
           u_creator.company_email AS creator_email
    FROM candidate_offers o
    JOIN candidates c ON c.id = o.candidate_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    LEFT JOIN job_positions jp ON jp.position_id = o.position_id
    LEFT JOIN users u_creator ON u_creator.user_id = o.created_by
    WHERE 1=1
  `;
  sql += scope.sql;
  const params = [...scope.params];

  if (status && status !== 'ALL') {
    sql += ` AND o.status = ?`;
    params.push(status);
  }

  if (search) {
    sql += ` AND (c.full_name LIKE ? OR o.offer_code LIKE ? OR o.job_title LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  sql += ` ORDER BY o.created_at DESC`;

  const [rows] = await withOfferSchemaGuard(() => pool.query(sql, params));
  const canPublish = (user?.roles || []).some(r =>
    ['RECRUITER', 'HR_MANAGER', 'ADMIN'].includes(r.role_code));
  const canApprove = (user?.roles || []).some(r =>
    ['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN'].includes(r.role_code));
  return rows.map(row => ({
    ...row,
    can_publish: canPublish && row.status === 'APPROVED',
    can_approve: canApprove && row.status === 'PENDING_APPROVAL'
  }));
}

/**
 * Lấy chi tiết một Offer cùng lịch sử phê duyệt
 */
async function getOfferById(offerId, user) {
  const scope = offerAuthorization.getReadScope(user);
  return loadOfferById(offerId, scope, pool, user);
}

// Every caller must supply an authorized scope, including mutation responses.
async function loadOfferById(offerId, scope, conn = pool, user = null) {
  const [rows] = await withOfferSchemaGuard(() => conn.query(
    `SELECT o.*,
            c.full_name AS candidate_name,
            c.email AS candidate_email,
            c.phone AS candidate_phone,
            d.department_name,
            jp.position_name,
            u_creator.full_name AS creator_name
     FROM candidate_offers o
     JOIN candidates c ON c.id = o.candidate_id
     LEFT JOIN departments d ON d.department_id = o.department_id
     LEFT JOIN job_positions jp ON jp.position_id = o.position_id
     LEFT JOIN users u_creator ON u_creator.user_id = o.created_by
     WHERE o.id = ?${scope.sql}`,
    [offerId, ...scope.params]
  ));

  if (!rows.length) {
    if (scope.sql) fail(403, 'Offer không tồn tại hoặc nằm ngoài phạm vi được phép xem.');
    fail(404, 'Không tìm thấy Thư mời nhận việc.');
  }

  const offer = rows[0];

  // Lấy lịch sử phê duyệt
  const [approvals] = await withOfferSchemaGuard(() => conn.query(
    `SELECT oa.*, u.full_name AS approver_name
     FROM offer_approvals oa
     JOIN users u ON u.user_id = oa.approver_id
     WHERE oa.offer_id = ?
     ORDER BY oa.action_at DESC`,
    [offerId]
  ));

  let onboarding = null;
  // The old shared DB may not have the onboarding table yet; unrelated Offer
  // reads should still work until that independently reviewed migration lands.
  if (offer.status === 'ACCEPTED') {
    const [rows] = await withOfferSchemaGuard(() => conn.query(`
      SELECT b.id, b.status, b.official_start_date, b.checklist_notes,
        u.full_name AS hr_in_charge_name
      FROM candidate_onboardings b
      LEFT JOIN users u ON u.user_id = b.hr_in_charge_id
      WHERE b.offer_id = ? LIMIT 1`, [offerId]));
    onboarding = rows[0] || null;
  }
  const canPublish = (user?.roles || []).some(r =>
    ['RECRUITER', 'HR_MANAGER', 'ADMIN'].includes(r.role_code));
  const canApprove = (user?.roles || []).some(r =>
    ['APPROVER', 'DIRECTOR'].includes(r.role_code));
  return {
    ...offer,
    approvals,
    onboarding,
    can_publish: canPublish && offer.status === 'APPROVED',
    can_approve: canApprove && offer.status === 'PENDING_APPROVAL'
  };
}

async function createDraft(body, user) {
  offerAuthorization.getSubmitScope(user);
  const input = validation.normalizeDraft(body, { create: true });
  offerRepository.assertDraftWritesReady();
  return offerRepository.withTransaction(async conn => {
    const application = await offerRepository.loadApplicationForUpdate(input.application_id, user, conn);
    validation.assertApplication(application, input.application_id);
    offerAuthorization.assertCreateAccess(user, application);
    const decision = await offerRepository.loadDecision(application, conn);
    validation.assertPassedDecision(application, decision);
    const catalog = await offerRepository.loadCatalog(input, application, conn);
    validation.assertCatalog(input, application, catalog);
    validation.assertNoDuplicate(await offerRepository.findEffectiveOffers(application, null, conn));
    return offerRepository.insertDraft({
      ...input,
      candidate_id: Number(application.candidate_id),
      recruitment_request_id: Number(application.recruitment_request_id),
      department_id: Number(application.department_id),
      created_by: user.user_id,
      created_at: new Date(),
      offer_code: `OFF-${randomUUID()}`,
      status: 'DRAFT',
      row_version: 1,
      decision_source: decision.source,
      decision_reference: decision.reference,
      decision_version: decision.version
    }, conn);
  });
}

async function updateDraft(offerId, body, user, ifMatch) {
  const scope = offerAuthorization.getSubmitScope(user);
  const id = validation.positiveId(offerId, 'offerId');
  const input = validation.normalizeDraft(body);
  const version = validation.expectedVersion(ifMatch);
  offerRepository.assertDraftWritesReady();
  return offerRepository.withTransaction(async conn => {
    const offer = await offerRepository.findScopedOfferForUpdate(id, scope, conn);
    validation.assertEditable(offer, version);
    const application = await offerRepository.loadApplicationForUpdate(offer.application_id, user, conn, { offerId: id });
    validation.assertApplication(application, offer.application_id);
    if (Number(offer.candidate_id) !== Number(application.candidate_id) ||
        Number(offer.recruitment_request_id) !== Number(application.recruitment_request_id) ||
        Number(offer.department_id) !== Number(application.department_id)) {
      fail(422, 'Offer không khớp hồ sơ tuyển dụng.');
    }
    const catalog = await offerRepository.loadCatalog({ ...offer, ...input }, application, conn);
    validation.assertCatalog({ ...offer, ...input }, application, catalog);
    const changed = await offerRepository.updateDraftIfEditable(id, input, scope, version, conn);
    if (changed !== 1) fail(409, 'Offer đã thay đổi hoặc bạn không còn quyền cập nhật. Vui lòng tải lại.');
    return loadOfferById(id, scope, conn, user);
  });
}

// The department's actual manager records an explicit approver mandate before
// submission. Never trust role/assignment objects from request JSON.
async function assignApprover(offerId, approverId, user, ifMatch) {
  if (!user?.user_id) fail(401, 'Vui long dang nhap.');
  const version = validation.expectedVersion(ifMatch);
  const id = validation.positiveId(offerId, 'offerId');
  const targetId = validation.positiveId(approverId, 'approverId');
  offerRepository.assertDraftWritesReady();
  return offerRepository.withTransaction(conn => require('./offerApprovalMandate').assignExplicit({
    conn, offerId: id, approverId: targetId,
    actorUserId: user.user_id, expectedRowVersion: version
  }));
}

/**
 * Gửi Offer đi phê duyệt (chuyển sang PENDING_APPROVAL và gửi thông báo tới Người duyệt)
 */
async function submitOffer(offerId, user, ifMatch) {
  const scope = offerAuthorization.getSubmitScope(user);
  validation.positiveId(offerId, 'offerId');
  offerRepository.assertDraftWritesReady();
  const version = validation.expectedVersion(ifMatch);
  const { offer, response, submission } = await offerRepository.withTransaction(async conn => {
    const offer = await offerRepository.findScopedOfferForUpdate(offerId, scope, conn);
    validation.assertEditable(offer, version);
    const application = await offerRepository.loadApplicationForUpdate(offer.application_id, user, conn, { offerId });
    validation.assertApplication(application, offer.application_id);
    const decision = await offerRepository.loadDecision(application, conn);
    const catalog = await offerRepository.loadCatalog(offer, application, conn);
    const duplicates = await offerRepository.findEffectiveOffers(application, offer.id, conn);
    validation.validateSubmission(offer, { application, decision, catalog, duplicates });
    const changed = await offerRepository.submitIfEditable(offerId, scope, conn, version);
    if (changed !== 1) fail(409, 'Không thể gửi duyệt Offer. Vui lòng tải lại và kiểm tra quyền truy cập.');
    const submission = await offerRepository.recordSubmission(offer, user, decision, conn);
    return { offer, response: await loadOfferById(offerId, scope, conn, user), submission };
  });

  // Gửi thông báo tới Người duyệt (APPROVER, HR_MANAGER, ADMIN)
  try {
    const approverIds = submission.approver_ids;
    const salaryStr = Number(offer.basic_salary).toLocaleString('vi-VN');
    const senderName = user.full_name || 'Nhân viên tuyển dụng';

    await notificationRepository.createForUsers(approverIds, {
      title: 'Yêu cầu phê duyệt Offer mới',
      message: `Chuyên viên ${senderName} vừa gửi duyệt Offer cho ứng viên ${offer.candidate_name} (Mức lương: ${salaryStr} VND).`,
      type: 'OFFER_PENDING_APPROVAL',
      link: '/offers'
    });
  } catch (err) {
    console.error('Lỗi gửi thông báo duyệt Offer:', err.message);
  }

  return response;
}

/**
 * Xử lý phê duyệt Offer (Duyệt, Từ chối, Yêu cầu chỉnh sửa)
 * Gửi thông báo tới Recruiter phụ trách
 */
async function processApproval(offerId, { action, reason }, user) {
  const scope = await offerAuthorization.getApprovalScope(offerId, user);

  if (!['APPROVED', 'REJECTED', 'REQUEST_CHANGE'].includes(action)) {
    fail(400, 'Hành động phê duyệt không hợp lệ.');
  }

  if (['REJECTED', 'REQUEST_CHANGE'].includes(action) && !String(reason || '').trim()) {
    fail(400, 'Vui lòng nhập lý do từ chối hoặc nội dung yêu cầu chỉnh sửa.');
  }

  const [rows] = await pool.query(
    `SELECT o.*, c.full_name AS candidate_name, u.full_name AS creator_name
     FROM candidate_offers o
     JOIN candidates c ON c.id = o.candidate_id
     LEFT JOIN users u ON u.user_id = o.created_by
     WHERE o.id = ?`,
    [offerId]
  );

  if (!rows.length) {
    fail(404, 'Không tìm thấy Thư mời nhận việc.');
  }

  const offer = rows[0];
  if (offer.status !== 'PENDING_APPROVAL') {
    fail(400, `Offer không ở trạng thái Chờ phê duyệt (trạng thái hiện tại: ${offer.status}).`);
  }

  let newStatus = 'APPROVED';
  if (action === 'REJECTED') newStatus = 'REJECTED';
  if (action === 'REQUEST_CHANGE') newStatus = 'CHANGE_REQUESTED';

  // Lưu lịch sử phê duyệt
  await pool.query(
    `INSERT INTO offer_approvals (offer_id, approver_id, action, reason, action_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [offerId, user.user_id, action, reason ? String(reason).trim() : null]
  );

  // Cập nhật trạng thái offer
  await pool.query(
    `UPDATE candidate_offers
     SET status = ?, approved_at = ${action === 'APPROVED' ? 'NOW()' : 'approved_at'}
     WHERE id = ?`,
    [newStatus, offerId]
  );

  // Gửi thông báo tới Nhân viên tuyển dụng phụ trách (created_by)
  try {
    const approverName = user.full_name || 'Người duyệt';
    let notifTitle = '';
    let notifMessage = '';
    let notifType = '';

    if (action === 'APPROVED') {
      notifTitle = 'Offer đã được phê duyệt';
      notifMessage = `Người duyệt ${approverName} đã phê duyệt Thư mời nhận việc cho ứng viên ${offer.candidate_name}.`;
      notifType = 'OFFER_APPROVED';
    } else if (action === 'REJECTED') {
      notifTitle = 'Offer bị từ chối phê duyệt';
      notifMessage = `Người duyệt ${approverName} đã từ chối Thư mời nhận việc cho ứng viên ${offer.candidate_name}. Lý do: ${reason}`;
      notifType = 'OFFER_REJECTED';
    } else if (action === 'REQUEST_CHANGE') {
      notifTitle = 'Yêu cầu chỉnh sửa Offer';
      notifMessage = `Người duyệt ${approverName} yêu cầu chỉnh sửa Offer cho ứng viên ${offer.candidate_name}. Ghi chú: ${reason}`;
      notifType = 'OFFER_CHANGE_REQUESTED';
    }

    if (offer.created_by) {
      await notificationRepository.create({
        userId: offer.created_by,
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        link: '/offers'
      });
    }
  } catch (err) {
    console.error('Lỗi gửi thông báo kết quả duyệt Offer:', err.message);
  }

  return loadOfferById(offerId, scope, pool, user);
}


// PR #35 integration: publish is a separate operation after a VERIFIED atomic
// approval. A role, the APPROVED text state, or legacy offer_approvals history
// by itself is insufficient proof that an Offer was lawfully approved.
async function publishOffer(offerId, user) {
  const id = validation.positiveId(offerId, 'offerId');
  const scope = offerAuthorization.getSubmitScope(user);
  const [rows] = await pool.query(
    `SELECT o.*, c.full_name AS candidate_name FROM candidate_offers o JOIN candidates c ON c.id = o.candidate_id WHERE o.id = ?`,
    [id]
  );
  if (!rows.length) fail(404, 'Không tìm thấy Offer.');
  const offer = rows[0];
  if (offer.status !== 'APPROVED') fail(400, 'Chỉ Offer đã duyệt mới được phát hành tới ứng viên.');

  await pool.query(
    `UPDATE candidate_offers SET status = 'SENT', sent_to_candidate_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [id]
  );

  try {
    await pool.query(
      `INSERT INTO candidate_notifications (candidate_id, title, message, type, link, created_at)
       VALUES (?, 'Thư mời nhận việc', ?, 'OFFER_ISSUED', '/candidate/offers', NOW())`,
      [offer.candidate_id, `Bạn có thư mời nhận việc cho vị trí ${offer.job_title || 'Mới'}. Vui lòng đăng nhập để xem và phản hồi.`]
    );
  } catch (err) {
    console.warn('Candidate notification skipped:', err.message);
  }

  return { id, status: 'SENT', notification_status: 'QUEUED_IN_CANDIDATE_PORTAL' };
}

// Read-only onboarding list for the same verified internal Offer scope.
// Never return an unscoped list of candidate salary or personal records.
async function getOnboardings(user) {
  const scope = offerAuthorization.getReadScope(user);
  const [rows] = await withOfferSchemaGuard(() => pool.query(`
    SELECT b.id, b.offer_id, b.candidate_id, b.hr_in_charge_id,
      b.official_start_date, b.status, b.equipment_ready, b.account_created,
      b.contract_signed, b.orientation_done, b.checklist_notes,
      o.offer_code, c.full_name AS candidate_name, o.job_title,
      d.department_name
    FROM candidate_onboardings b
    JOIN candidate_offers o ON o.id = b.offer_id
    JOIN candidates c ON c.id = b.candidate_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    WHERE 1=1${scope.sql}
    ORDER BY b.created_at DESC LIMIT 200`, scope.params));
  return rows;
}

const eligibilityReasons = {
  NO_APPLICATIONS_IN_SCOPE: 'Không có hồ sơ trong phạm vi được phép.',
  NO_ELIGIBLE_APPLICATIONS: 'Chưa có hồ sơ đủ điều kiện soạn Offer.',
  APPLICATION_MAPPING_UNVERIFIED: 'Chưa xác minh đầy đủ liên kết hồ sơ với yêu cầu tuyển dụng.',
  CATALOG_UNAVAILABLE: 'Vị trí hoặc phòng ban của hồ sơ chưa hợp lệ.',
  OFFER_ALREADY_EXISTS: 'Hồ sơ đã có Offer còn hiệu lực.',
  OFFER_HISTORY_REVIEW_REQUIRED: 'Cần xác minh lịch sử Offer trước khi tạo lại.',
  LEGACY_OFFER_MAPPING_UNVERIFIED: 'Cần xác minh Offer cũ chưa liên kết hồ sơ.',
  DECISION_NOT_PASSED: 'Chưa có quyết định Đạt được xác nhận cho hồ sơ.',
  DECISION_SCOPE_MISMATCH: 'Quyết định của ứng viên không khớp yêu cầu tuyển dụng của hồ sơ.',
  DECISION_AUTHORITY_UNVERIFIED: 'Chưa có đủ thông tin xác minh thẩm quyền ra quyết định.',
  DECISION_APPLICATION_UNVERIFIED: 'Chưa chứng minh quyết định Đạt còn hiệu lực cho đúng hồ sơ ứng tuyển.',
  OFFER_SCHEMA_NOT_VERIFIED: 'Schema Offer chưa được kiểm tra khi khởi động. Liên hệ quản trị viên.',
};

function eligibilityReason(row) {
  if (!row.request_id || Number(row.request_id) !== Number(row.posting_request_id) ||
      Number(row.request_id) !== Number(row.recruitment_request_id)) return 'APPLICATION_MAPPING_UNVERIFIED';
  if (!row.position_id || !row.department_id || row.department_status !== 'ACTIVE' || row.position_status !== 'ACTIVE') return 'CATALOG_UNAVAILABLE';
  if (Number(row.has_effective_offer)) return 'OFFER_ALREADY_EXISTS';
  // Until terminal-status reuse rules are confirmed, history is not proof that
  // recreation is safe. Null application IDs cannot be silently ignored either.
  if (Number(row.has_offer_history)) return 'OFFER_HISTORY_REVIEW_REQUIRED';
  if (Number(row.has_unmapped_offer)) return 'LEGACY_OFFER_MAPPING_UNVERIFIED';
  if (row.interview_decision !== 'PASSED') return 'DECISION_NOT_PASSED';
  if (Number(row.candidate_request_id) !== Number(row.request_id)) return 'DECISION_SCOPE_MISMATCH';
  if (!Number.isSafeInteger(Number(row.interview_decision_by)) || Number(row.interview_decision_by) <= 0 || !row.interview_decision_at) {
    return 'DECISION_AUTHORITY_UNVERIFIED';
  }
  // The repository reads application-bound candidate_hiring_decisions, using
  // the legacy internal aliases above. Metadata alone is not authority proof:
  // the verified decision writer/authority integration is still unavailable.
  return 'DECISION_APPLICATION_UNVERIFIED';
}

async function getEligibility(query, user) {
  const scope = offerAuthorization.getEligibilityScope(user);
  const filters = {};
  for (const key of Object.keys(query)) {
    if (!['candidate_id', 'application_id', 'after_id'].includes(key)) fail(400, 'Tham số eligibility không hợp lệ.');
    filters[key] = validation.positiveId(query[key], key);
  }
  let rows;
  try {
    rows = await offerRepository.readEligibilityApplications(filters, scope);
  } catch (error) {
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR', 'ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)) {
      const unavailable = new Error('Chức năng kiểm tra điều kiện Offer đang chờ hoàn thiện dependency Backend hoặc cơ sở dữ liệu.');
      Object.assign(unavailable, { statusCode: 503, code: 'OFFER_ELIGIBILITY_DEPENDENCY_UNAVAILABLE' });
      throw unavailable;
    }
    throw error;
  }
  if (filters.application_id && !rows.length) fail(403, 'Hồ sơ không tồn tại, không khớp ứng viên hoặc nằm ngoài phạm vi được phép.');
  // A PASSED candidate-wide summary is not evidence. Replay the dedicated
  // application-bound decision using the same authority verifier used on writes.
  // This is only a UI hint: createDraft rechecks inside its write transaction.
  const applications = await Promise.all(rows.slice(0, 50).map(async row => {
    let reason_code = eligibilityReason(row);
    let eligible = false;
    if (reason_code === 'DECISION_APPLICATION_UNVERIFIED' && row.verified_decision_id) {
      try {
        const [decisions] = await pool.query(`SELECT hd.id,hd.application_id,hd.candidate_id,
          hd.recruitment_request_id,hd.department_id,hd.decision,
          hd.decision_maker_id AS decided_by,hd.row_version,hd.validity_status,
          hd.authority_policy,hd.authority_reference,hd.revoked_at,hd.superseded_at,
          hd.total_rounds_evaluated,hd.average_score
          FROM candidate_hiring_decisions hd WHERE hd.id = ?`, [row.verified_decision_id]);
        const app = { id: row.application_id, candidate_id: row.candidate_id,
          recruitment_request_id: row.recruitment_request_id, department_id: row.department_id };
        eligible = decisions.length === 1 &&
          await decisionDependencies.verifyDecisionAuthority(decisions[0], app, pool) === true;
        if (eligible) reason_code = 'ELIGIBLE';
      } catch (error) {
        // A missing schema is a deployment problem, not an ineligible candidate.
        if (['ER_BAD_FIELD_ERROR','ER_NO_SUCH_TABLE','ECONNREFUSED','ETIMEDOUT','PROTOCOL_CONNECTION_LOST'].includes(error.code)) {
          Object.assign(error, {statusCode:503, code:'OFFER_ELIGIBILITY_DEPENDENCY_UNAVAILABLE'});
          throw error;
        }
        // Unverified evidence never enables creation, but unrelated faults
        // must not be disguised as 'candidate not eligible'.
        if (![403,422].includes(error.statusCode)) throw error;
      }
    }
    const mappingValid = reason_code !== 'APPLICATION_MAPPING_UNVERIFIED';
    const canCreate = eligible && require('./offerRuntimeReadiness').isDraftSchemaReady();
    if (eligible && !canCreate) reason_code = 'OFFER_SCHEMA_NOT_VERIFIED';
    return {
      eligible: canCreate, reason_code, reason: canCreate ? null : eligibilityReasons[reason_code],
      permissions: { can_create: canCreate },
      candidate: { id: row.candidate_id, name: row.candidate_name },
      application: { id: row.application_id, code: row.application_code, recruitment_request_id: row.recruitment_request_id },
      position: mappingValid && row.position_id ? { id: row.position_id, name: row.position_name } : null,
      department: mappingValid && row.department_id ? { id: row.department_id, name: row.department_name } : null,
      prefill: mappingValid && row.position_status === 'ACTIVE' ? { position_id: row.position_id, job_title: row.position_name } : {},
    };
  }));
  const canCreate = applications.some(app => app.permissions.can_create);
  const reason_code = canCreate ? 'ELIGIBLE' : applications.length === 1 ? applications[0].reason_code : applications.length ? 'NO_ELIGIBLE_APPLICATIONS' : 'NO_APPLICATIONS_IN_SCOPE';
  return { eligible: canCreate, reason_code, reason: canCreate ? null : eligibilityReasons[reason_code],
    permissions: { can_create: canCreate },
    applications, next_cursor: rows.length > 50 ? applications[49].application.id : null };
}

module.exports = {
  // PR #35 publish/onboarding requires a verified workflow, never role alone.
  unavailableApprovalExtension(user) {
    offerAuthorization.getReadScope(user);
    validation.dependencyUnavailable();
  },
  getEligibility,
  publishOffer,
  getOnboardings,
  createDraft,
  updateDraft,
  getAllOffers,
  getOfferById,
  submitOffer,
  assignApprover,
  processApproval
};
