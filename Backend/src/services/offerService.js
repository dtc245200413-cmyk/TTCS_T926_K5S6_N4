/**
 * offerService.js
 * Xử lý toàn bộ logic nghiệp vụ phê duyệt offer, phát hành tới ứng viên,
 * kiểm tra hạn mức và quy trình onboarding.
 */

const offerRepository = require('../repositories/offerRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditRepository = require('../repositories/auditRepository');
const { pool } = require('../config/database');
const { httpError } = require('../utils/roles');

function checkCanApprove(user) {
  if (!user) return false;
  const isSuper = user.roles?.some(r => ['ADMIN', 'APPROVER', 'HR_MANAGER', 'DIRECTOR'].includes(r.role_code));
  const hasPerm = user.permissions?.includes('OFFER_APPROVE');
  return Boolean(isSuper || hasPerm);
}

function checkCanPublish(user) {
  if (!user) return false;
  const isRecruiterOrAdmin = user.roles?.some(r => ['ADMIN', 'HR_MANAGER', 'RECRUITER'].includes(r.role_code));
  const hasPerm = user.permissions?.includes('OFFER_CREATE');
  return Boolean(isRecruiterOrAdmin || hasPerm);
}

async function listOffers(user, query = {}) {
  const { status, search, departmentId } = query;
  const isApproverRole = user.roles?.some(r => ['APPROVER', 'DIRECTOR'].includes(r.role_code));
  
  // Lấy danh sách offer
  const offers = await offerRepository.getOffers({
    status: status || 'ALL',
    search: search || '',
    departmentId: departmentId ? Number(departmentId) : null
  });

  // Tự động kiểm tra quá hạn đối với các offer đã gửi
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enrichedOffers = offers.map(o => {
    let currentStatus = o.status;
    const isExpired = o.response_deadline && new Date(o.response_deadline) < today && o.status === 'SENT';
    if (isExpired) {
      currentStatus = 'EXPIRED';
    }

    return {
      ...o,
      status: currentStatus,
      is_expired: isExpired,
      can_approve: checkCanApprove(user) && o.status === 'PENDING_APPROVAL',
      can_publish: checkCanPublish(user) && o.status === 'APPROVED'
    };
  });

  return enrichedOffers;
}

async function getOfferDetail(user, id) {
  const offer = await offerRepository.getOfferById(id);
  if (!offer) {
    throw httpError('Không tìm thấy Thư mời nhận việc.', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = offer.response_deadline && new Date(offer.response_deadline) < today && offer.status === 'SENT';
  if (isExpired) {
    offer.status = 'EXPIRED';
  }

  return {
    ...offer,
    is_expired: isExpired,
    can_approve: checkCanApprove(user) && offer.status === 'PENDING_APPROVAL',
    can_publish: checkCanPublish(user) && offer.status === 'APPROVED'
  };
}

/**
 * 1. Duyệt Offer
 */
async function approveOffer(user, id, { note } = {}, ipAddress = null) {
  if (!checkCanApprove(user)) {
    throw httpError('Bạn không có quyền phê duyệt Thư mời nhận việc.', 403);
  }

  const offer = await offerRepository.getOfferById(id);
  if (!offer) {
    throw httpError('Không tìm thấy Thư mời nhận việc.', 404);
  }

  if (offer.status !== 'PENDING_APPROVAL') {
    throw httpError(`Chỉ có thể phê duyệt Offer đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: ${offer.status}`, 400);
  }

  // Cập nhật trạng thái offer sang APPROVED
  await offerRepository.updateOfferStatus(id, 'APPROVED', { approved_at: new Date() });

  // Ghi lịch sử người xử lý, thời gian, hành động
  await offerRepository.recordApprovalAction({
    offerId: id,
    approverId: user.user_id,
    action: 'APPROVED',
    reason: note && note.trim() ? note.trim() : 'Đã phê duyệt Thư mời nhận việc.'
  });

  // Ghi nhật ký hệ thống
  await auditRepository.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'OFFER_APPROVED',
    entityType: 'OFFER',
    entityId: String(id),
    description: `Người duyệt ${user.full_name} đã phê duyệt Offer ${offer.offer_code} cho ứng viên ${offer.candidate_name}.`,
    ipAddress
  });

  // Tạo thông báo cho Recruiter tạo offer
  if (offer.created_by) {
    await notificationRepository.create({
      userId: offer.created_by,
      title: 'Offer đã được phê duyệt',
      message: `Giám đốc/Người duyệt (${user.full_name}) đã phê duyệt Thư mời nhận việc ${offer.offer_code} cho ứng viên ${offer.candidate_name}. Bạn có thể phát hành tới ứng viên ngay bây giờ.`,
      type: 'OFFER_APPROVED',
      link: `/offers`
    });
  }

  return getOfferDetail(user, id);
}

/**
 * 2. Từ chối Offer (Bắt buộc có lý do)
 */
async function rejectOffer(user, id, { reason }, ipAddress = null) {
  if (!checkCanApprove(user)) {
    throw httpError('Bạn không có quyền từ chối Thư mời nhận việc.', 403);
  }

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw httpError('Vui lòng nhập lý do từ chối Offer (bắt buộc).', 400);
  }

  const offer = await offerRepository.getOfferById(id);
  if (!offer) {
    throw httpError('Không tìm thấy Thư mời nhận việc.', 404);
  }

  if (offer.status !== 'PENDING_APPROVAL') {
    throw httpError(`Chỉ có thể từ chối Offer đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: ${offer.status}`, 400);
  }

  // Cập nhật trạng thái offer sang REJECTED
  await offerRepository.updateOfferStatus(id, 'REJECTED');

  // Ghi lịch sử phê duyệt kèm lý do
  await offerRepository.recordApprovalAction({
    offerId: id,
    approverId: user.user_id,
    action: 'REJECTED',
    reason: trimmedReason
  });

  // Ghi nhật ký
  await auditRepository.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'OFFER_REJECTED',
    entityType: 'OFFER',
    entityId: String(id),
    description: `Người duyệt ${user.full_name} đã từ chối Offer ${offer.offer_code}. Lý do: ${trimmedReason}`,
    ipAddress
  });

  // Thông báo tới Recruiter phụ trách
  if (offer.created_by) {
    await notificationRepository.create({
      userId: offer.created_by,
      title: 'Offer đã bị từ chối',
      message: `Thư mời nhận việc ${offer.offer_code} cho ứng viên ${offer.candidate_name} đã bị từ chối. Lý do: ${trimmedReason}`,
      type: 'OFFER_REJECTED',
      link: `/offers`
    });
  }

  return getOfferDetail(user, id);
}

/**
 * 3. Yêu cầu chỉnh sửa Offer (Bắt buộc có lý do)
 */
async function requestChangeOffer(user, id, { reason }, ipAddress = null) {
  if (!checkCanApprove(user)) {
    throw httpError('Bạn không có quyền yêu cầu chỉnh sửa Thư mời nhận việc.', 403);
  }

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw httpError('Vui lòng nhập lý do yêu cầu chỉnh sửa (bắt buộc).', 400);
  }

  const offer = await offerRepository.getOfferById(id);
  if (!offer) {
    throw httpError('Không tìm thấy Thư mời nhận việc.', 404);
  }

  if (offer.status !== 'PENDING_APPROVAL') {
    throw httpError(`Chỉ có thể yêu cầu chỉnh sửa Offer đang ở trạng thái Chờ duyệt. Trạng thái hiện tại: ${offer.status}`, 400);
  }

  // Cập nhật trạng thái offer sang CHANGE_REQUESTED
  await offerRepository.updateOfferStatus(id, 'CHANGE_REQUESTED');

  // Ghi lịch sử kèm lý do
  await offerRepository.recordApprovalAction({
    offerId: id,
    approverId: user.user_id,
    action: 'REQUEST_CHANGE',
    reason: trimmedReason
  });

  // Ghi audit log
  await auditRepository.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'OFFER_CHANGE_REQUESTED',
    entityType: 'OFFER',
    entityId: String(id),
    description: `Người duyệt ${user.full_name} yêu cầu chỉnh sửa Offer ${offer.offer_code}. Lý do: ${trimmedReason}`,
    ipAddress
  });

  // Thông báo cho Recruiter
  if (offer.created_by) {
    await notificationRepository.create({
      userId: offer.created_by,
      title: 'Offer cần chỉnh sửa',
      message: `Người duyệt (${user.full_name}) yêu cầu chỉnh sửa Thư mời nhận việc ${offer.offer_code} cho ứng viên ${offer.candidate_name}. Lý do: ${trimmedReason}`,
      type: 'OFFER_CHANGE_REQUESTED',
      link: `/offers`
    });
  }

  return getOfferDetail(user, id);
}

/**
 * 4. Phát hành Offer tới ứng viên
 * Tiêu chí 3: "Chỉ Offer được duyệt mới có thể phát hành tới đúng ứng viên."
 */
async function publishOffer(user, id, ipAddress = null) {
  if (!checkCanPublish(user)) {
    throw httpError('Bạn không có quyền phát hành Thư mời nhận việc.', 403);
  }

  const offer = await offerRepository.getOfferById(id);
  if (!offer) {
    throw httpError('Không tìm thấy Thư mời nhận việc.', 404);
  }

  // CHẶN CHẶT CHẼ: Chỉ Offer APPROVED mới được phát hành
  if (offer.status !== 'APPROVED') {
    throw httpError(`Chỉ Offer đã được phê duyệt mới có thể phát hành tới ứng viên! Trạng thái hiện tại: ${offer.status}`, 400);
  }

  // Cập nhật trạng thái sang SENT
  await offerRepository.updateOfferStatus(id, 'SENT', { sent_to_candidate_at: new Date() });

  // Cập nhật trạng thái ứng viên
  if (offer.candidate_id) {
    await pool.execute(
      `UPDATE candidates SET status = 'OFFERED', current_stage = 'OFFER', stage_changed_at = NOW() WHERE id = ?`,
      [offer.candidate_id]
    );
  }

  // Ghi audit log
  await auditRepository.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'OFFER_PUBLISHED',
    entityType: 'OFFER',
    entityId: String(id),
    description: `Nhân viên tuyển dụng ${user.full_name} đã phát hành Offer ${offer.offer_code} tới ứng viên ${offer.candidate_name}.`,
    ipAddress
  });

  // Tạo thông báo trên cổng ứng viên
  if (offer.candidate_id) {
    const deadlineFormatted = offer.response_deadline
      ? new Date(offer.response_deadline).toLocaleDateString('vi-VN')
      : 'thời hạn quy định';
    await pool.execute(`
      INSERT INTO candidate_notifications (candidate_id, title, message, type, link, created_at)
      VALUES (?, ?, ?, 'OFFER_ISSUED', '/candidate/offers', NOW())
    `, [
      offer.candidate_id,
      'Thư mời nhận việc từ TechCorp',
      `Chúc mừng bạn! TechCorp đã phát hành Thư mời nhận việc vị trí ${offer.job_title}. Vui lòng xem chi tiết và phản hồi trước ngày ${deadlineFormatted}.`
    ]);
  }

  return getOfferDetail(user, id);
}

/**
 * 5. Lấy danh sách Onboarding
 */
async function listOnboardings(user) {
  return offerRepository.getOnboardings();
}

module.exports = {
  listOffers,
  getOfferDetail,
  approveOffer,
  rejectOffer,
  requestChangeOffer,
  publishOffer,
  listOnboardings
};
