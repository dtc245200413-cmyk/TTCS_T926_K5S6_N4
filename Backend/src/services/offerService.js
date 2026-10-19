/**
 * offerService.js
 * Quản lý quy trình Thư mời nhận việc (Offer), Phê duyệt Offer và gửi thông báo theo User Story 5 & US 4.
 */

const { pool } = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function hasAnyRole(user, allowedRoles) {
  const roleCodes = user?.roles?.map(r => r.role_code) || [];
  return roleCodes.some(role => allowedRoles.includes(role));
}

/**
 * Lấy danh sách Offer có lọc theo vai trò và trạng thái
 */
async function getAllOffers(query, user) {
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
  const params = [];

  // Phân quyền dữ liệu
  const isApprover = hasAnyRole(user, ['APPROVER', 'DIRECTOR', 'ADMIN', 'HR_MANAGER']);
  const isRecruiter = hasAnyRole(user, ['RECRUITER']);
  const isInterviewer = hasAnyRole(user, ['INTERVIEWER']);

  if (isInterviewer && !isApprover && !isRecruiter) {
    fail(403, 'Người phỏng vấn không có quyền xem danh sách Thư mời nhận việc.');
  }

  if (status) {
    sql += ` AND o.status = ?`;
    params.push(status);
  }

  if (search) {
    sql += ` AND (c.full_name LIKE ? OR o.offer_code LIKE ? OR o.job_title LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  sql += ` ORDER BY o.created_at DESC`;

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Lấy chi tiết một Offer cùng lịch sử phê duyệt
 */
async function getOfferById(offerId, user) {
  const [rows] = await pool.query(
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
     WHERE o.id = ?`,
    [offerId]
  );

  if (!rows.length) {
    fail(404, 'Không tìm thấy Thư mời nhận việc.');
  }

  const offer = rows[0];

  // Lấy lịch sử phê duyệt
  const [approvals] = await pool.query(
    `SELECT oa.*, u.full_name AS approver_name
     FROM offer_approvals oa
     JOIN users u ON u.user_id = oa.approver_id
     WHERE oa.offer_id = ?
     ORDER BY oa.action_at DESC`,
    [offerId]
  );

  return { ...offer, approvals };
}

/**
 * Gửi Offer đi phê duyệt (chuyển sang PENDING_APPROVAL và gửi thông báo tới Người duyệt)
 */
async function submitOffer(offerId, user) {
  if (!hasAnyRole(user, ['RECRUITER', 'HR_MANAGER', 'ADMIN'])) {
    fail(403, 'Bạn không có quyền gửi duyệt Offer.');
  }

  const [rows] = await pool.query(
    `SELECT o.*, c.full_name AS candidate_name 
     FROM candidate_offers o
     JOIN candidates c ON c.id = o.candidate_id
     WHERE o.id = ?`,
    [offerId]
  );

  if (!rows.length) {
    fail(404, 'Không tìm thấy Thư mời nhận việc.');
  }

  const offer = rows[0];
  if (!['DRAFT', 'CHANGE_REQUESTED'].includes(offer.status)) {
    fail(400, `Chỉ có thể gửi duyệt Offer ở trạng thái Lưu nháp hoặc Yêu cầu chỉnh sửa (hiện tại: ${offer.status}).`);
  }

  await pool.query(
    `UPDATE candidate_offers 
     SET status = 'PENDING_APPROVAL', submitted_at = NOW() 
     WHERE id = ?`,
    [offerId]
  );

  // Gửi thông báo tới Người duyệt (APPROVER, HR_MANAGER, ADMIN)
  try {
    const approverIds = await notificationRepository.findActiveUserIdsByRoles(['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN']);
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

  return getOfferById(offerId, user);
}

/**
 * Xử lý phê duyệt Offer (Duyệt, Từ chối, Yêu cầu chỉnh sửa)
 * Gửi thông báo tới Recruiter phụ trách
 */
async function processApproval(offerId, { action, reason }, user) {
  if (!hasAnyRole(user, ['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN'])) {
    fail(403, 'Bạn không có thẩm quyền phê duyệt Offer.');
  }

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

  return getOfferById(offerId, user);
}

module.exports = {
  getAllOffers,
  getOfferById,
  submitOffer,
  processApproval
};
