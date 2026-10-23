/**
 * test_offer_workflow.js
 * Kiểm tra toàn diện 6 tiêu chí nghiệp vụ của Đề xuất & Phê duyệt Offer
 */

const { pool } = require('./src/config/database');
const offerService = require('./src/services/offerService');
const candidatePortalService = require('./src/services/candidatePortalService');

async function runTests() {
  console.log('========================================================');
  console.log('BẮT ĐẦU KIỂM TRA 6 TIÊU CHÍ NGHIỆP VỤ OFFER');
  console.log('========================================================\n');

  // Người dùng thử nghiệm:
  // Approver (Thảo A Pồng - user_id 6)
  const approverUser = {
    user_id: 6,
    full_name: 'Thảo A Pồng',
    roles: [{ role_id: 6, role_code: 'APPROVER', role_name: 'Người duyệt' }],
    permissions: ['OFFER_APPROVE']
  };

  // Recruiter (Nguyễn Anh Sơn - user_id 3)
  const recruiterUser = {
    user_id: 3,
    full_name: 'Nguyễn Anh Sơn',
    roles: [{ role_id: 3, role_code: 'RECRUITER', role_name: 'Nhân viên tuyển dụng' }],
    permissions: ['OFFER_CREATE', 'ONBOARDING_MANAGE']
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // TIÊU CHÍ 1: Danh sách Offer Chờ duyệt & Phân quyền
  console.log('--- TIÊU CHÍ 1: Danh sách Offer Chờ duyệt & Phân quyền ---');
  // Reset Offer 1 về trạng thái PENDING_APPROVAL để test có thể lặp lại độc lập
  await pool.execute(`
    UPDATE candidate_offers 
    SET status = 'PENDING_APPROVAL', 
        response_deadline = '2026-12-31', 
        candidate_response = NULL, 
        responded_at = NULL, 
        sent_to_candidate_at = NULL 
    WHERE id = 1
  `);
  await pool.execute('DELETE FROM candidate_onboardings WHERE offer_id = 1');
  await pool.execute('DELETE FROM offer_approvals WHERE offer_id = 1');

  const offersList = await offerService.listOffers(approverUser, { status: 'PENDING_APPROVAL' });
  assert(Array.isArray(offersList), 'Lấy được danh sách Offer chờ duyệt');
  const pendingOffer = offersList.find(o => o.status === 'PENDING_APPROVAL');
  assert(Boolean(pendingOffer), `Có ít nhất 1 Offer PENDING_APPROVAL (Mã: ${pendingOffer?.offer_code})`);
  assert(pendingOffer?.can_approve === true, 'Người duyệt có quyền Duyệt / Từ chối / Yêu cầu sửa trên Offer chờ duyệt');

  // TIÊU CHÍ 2: Bắt buộc có lý do khi Từ chối hoặc Yêu cầu chỉnh sửa; ghi lịch sử
  console.log('\n--- TIÊU CHÍ 2: Bắt buộc có lý do khi Từ chối / Yêu cầu chỉnh sửa; ghi lịch sử ---');
  let errCatchedReject = false;
  try {
    await offerService.rejectOffer(approverUser, pendingOffer.id, { reason: '   ' });
  } catch (err) {
    errCatchedReject = err.statusCode === 400;
  }
  assert(errCatchedReject, 'Chặn từ chối khi để trống lý do (trả về 400)');

  let errCatchedReqChange = false;
  try {
    await offerService.requestChangeOffer(approverUser, pendingOffer.id, { reason: '' });
  } catch (err) {
    errCatchedReqChange = err.statusCode === 400;
  }
  assert(errCatchedReqChange, 'Chặn yêu cầu chỉnh sửa khi để trống lý do (trả về 400)');

  // Thực hiện Yêu cầu chỉnh sửa có lý do
  const changeReason = 'Điều chỉnh lại ngày bắt đầu làm việc sang 01/12/2026.';
  await offerService.requestChangeOffer(approverUser, pendingOffer.id, { reason: changeReason });
  const updatedOfferReq = await offerService.getOfferDetail(approverUser, pendingOffer.id);
  assert(updatedOfferReq.status === 'CHANGE_REQUESTED', 'Offer chuyển trạng thái sang CHANGE_REQUESTED');
  assert(updatedOfferReq.approvals.some(a => a.action === 'REQUEST_CHANGE' && a.reason === changeReason), 'Ghi nhận lịch sử người xử lý, thời gian, hành động và lý do vào offer_approvals');

  // Chuyển lại trạng thái sang PENDING_APPROVAL và thử DUYỆT
  await pool.execute("UPDATE candidate_offers SET status = 'PENDING_APPROVAL' WHERE id = ?", [pendingOffer.id]);
  const approvedOffer = await offerService.approveOffer(approverUser, pendingOffer.id, { note: 'Đồng ý mức lương 26 triệu.' });
  assert(approvedOffer.status === 'APPROVED', 'Phê duyệt thành công, Offer chuyển sang APPROVED');
  assert(approvedOffer.approvals.some(a => a.action === 'APPROVED'), 'Lịch sử ghi nhận hành động APPROVED của Người duyệt');

  // TIÊU CHÍ 3: Chỉ Offer được duyệt mới có thể phát hành tới đúng ứng viên
  console.log('\n--- TIÊU CHÍ 3: Chỉ Offer được duyệt mới có thể phát hành tới đúng ứng viên ---');
  // Thử phát hành offer đang ở trạng thái REJECTED (Offer 5)
  let errPublishUnapproved = false;
  try {
    await offerService.publishOffer(recruiterUser, 5); // Offer 5 is REJECTED
  } catch (err) {
    errPublishUnapproved = err.statusCode === 400;
  }
  assert(errPublishUnapproved, 'Chặn phát hành Offer chưa được duyệt (trả về 400)');

  // Phát hành Offer vừa được duyệt (pendingOffer.id)
  const publishedOffer = await offerService.publishOffer(recruiterUser, pendingOffer.id);
  assert(publishedOffer.status === 'SENT', 'Offer được duyệt phát hành thành công chuyển sang SENT');
  assert(Boolean(publishedOffer.sent_to_candidate_at), 'Ghi nhận thời điểm sent_to_candidate_at');

  // TIÊU CHÍ 4: Tận dụng trang & API ứng viên Chấp nhận/Từ chối Offer hiện có
  console.log('\n--- TIÊU CHÍ 4: API ứng viên chỉ thấy Offer đã phát hành ---');
  const candOffers = await candidatePortalService.getOffers(pendingOffer.candidate_id);
  assert(candOffers.some(o => o.id === pendingOffer.id), 'Ứng viên thấy Offer đã phát hành (SENT)');
  assert(!candOffers.some(o => ['DRAFT', 'PENDING_APPROVAL', 'CHANGE_REQUESTED', 'REJECTED', 'APPROVED'].includes(o.status)), 'Ứng viên KHÔNG thấy các offer chưa phát hành');

  // TIÊU CHÍ 5: Chặn phản hồi Offer hết hạn hoặc đã phản hồi
  console.log('\n--- TIÊU CHÍ 5: Chặn phản hồi Offer hết hạn hoặc đã phản hồi ---');
  // Đặt hạn phản hồi của pendingOffer về quá khứ để test hết hạn
  await pool.execute("UPDATE candidate_offers SET response_deadline = '2020-01-01' WHERE id = ?", [pendingOffer.id]);
  let errExpired = false;
  try {
    await candidatePortalService.respondToOffer(pendingOffer.candidate_id, pendingOffer.id, { status: 'ACCEPTED' });
  } catch (err) {
    errExpired = err.statusCode === 400 && err.message.includes('hết hạn');
  }
  assert(errExpired, 'Chặn phản hồi khi Offer đã hết hạn (trả về 400 và báo hết hạn)');

  // Đặt lại hạn phản hồi hợp lệ cho tương lai
  await pool.execute("UPDATE candidate_offers SET response_deadline = '2026-12-31', status = 'SENT' WHERE id = ?", [pendingOffer.id]);

  // TIÊU CHÍ 6: Khi chấp nhận thì onboarding; khi từ chối thì lưu kết quả và thông báo Recruiter
  console.log('\n--- TIÊU CHÍ 6: Chấp nhận -> Onboarding | Từ chối -> Lưu kết quả & Thông báo ---');
  // Test từ chối bắt buộc có lý do
  let errDeclineNoReason = false;
  try {
    await candidatePortalService.respondToOffer(pendingOffer.candidate_id, pendingOffer.id, { status: 'DECLINED', response: '' });
  } catch (err) {
    errDeclineNoReason = err.statusCode === 400;
  }
  assert(errDeclineNoReason, 'Chặn ứng viên từ chối khi để trống lý do (trả về 400)');

  // Test Chấp nhận Offer
  await candidatePortalService.respondToOffer(pendingOffer.candidate_id, pendingOffer.id, { status: 'ACCEPTED', response: 'Tôi đồng ý nhận việc.' });
  const [candOffersAfter] = await pool.query('SELECT status, candidate_response FROM candidate_offers WHERE id = ?', [pendingOffer.id]);
  assert(candOffersAfter[0].status === 'ACCEPTED', 'Offer chuyển sang trạng thái ACCEPTED');

  // Kiểm tra Onboarding được kích hoạt
  const [onbList] = await pool.query('SELECT * FROM candidate_onboardings WHERE offer_id = ?', [pendingOffer.id]);
  assert(onbList.length > 0 && onbList[0].status === 'PREPARING', 'Bản ghi Onboarding tự động được tạo ở trạng thái PREPARING');

  // Kiểm tra thông báo cho Recruiter
  const [notifs] = await pool.query("SELECT * FROM notifications WHERE user_id = ? AND type = 'OFFER_ACCEPTED' ORDER BY notification_id DESC LIMIT 1", [recruiterUser.user_id]);
  assert(notifs.length > 0, 'Thông báo tự động gửi đến tài khoản Recruiter phụ trách khi ứng viên chấp nhận');

  // Kiểm tra không cho phản hồi lại Offer đã phản hồi
  let errReRespond = false;
  try {
    await candidatePortalService.respondToOffer(pendingOffer.candidate_id, pendingOffer.id, { status: 'DECLINED', response: 'Đổi ý' });
  } catch (err) {
    errReRespond = err.statusCode === 400;
  }
  assert(errReRespond, 'Chặn phản hồi khi Offer đã phản hồi trước đó (trả về 400)');

  console.log('\n========================================================');
  console.log(`KẾT QUẢ KIỂM TRA: ${passed} PASS, ${failed} FAIL`);
  console.log('========================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Lỗi khi chạy test:', e);
  process.exit(1);
});
