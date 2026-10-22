const repo = require('../repositories/candidateEvaluationRepository');
const positionService = require('./positionService');
const auditRepo = require('../repositories/auditRepository');
const { pool } = require('../config/database');

/**
 * candidateEvaluationService.js
 * Xử lý logic nghiệp vụ cho việc xem điểm phỏng vấn, tổng hợp điểm,
 * ra quyết định Đạt/Không đạt của Trưởng bộ phận và điều kiện tạo Offer.
 */

async function getCandidates(user) {
  return await repo.getCandidatesForEvaluation(user);
}

async function getCandidateDetail(candidateId, user) {
  const detail = await repo.getCandidateEvaluationDetail(Number(candidateId), user);
  if (!detail) {
    const error = new Error('Không tìm thấy ứng viên hoặc bạn không có quyền xem ứng viên này.');
    error.statusCode = 404;
    throw error;
  }
  return detail;
}

async function recordDecision(candidateId, { decision, comment }, user, ipAddress) {
  if (!decision || !['PASSED', 'FAILED'].includes(decision)) {
    const error = new Error('Quyết định không hợp lệ. Vui lòng chọn Đạt (PASSED) hoặc Không đạt (FAILED).');
    error.statusCode = 400;
    throw error;
  }

  if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
    const error = new Error('Vui lòng nhập nhận xét chi tiết của Trưởng bộ phận (tối thiểu 3 ký tự).');
    error.statusCode = 400;
    throw error;
  }

  // Lấy chi tiết để kiểm tra quyền truy cập và dữ liệu ứng viên
  const candidate = await repo.getCandidateEvaluationDetail(Number(candidateId), user);
  if (!candidate) {
    const error = new Error('Ứng viên không tồn tại hoặc không thuộc quyền quản lý của bạn.');
    error.statusCode = 404;
    throw error;
  }

  // Thực hiện ghi nhận quyết định
  const result = await repo.recordDecision(Number(candidateId), decision, comment.trim(), user.user_id);

  // Ghi nhật ký Audit Log
  await auditRepo.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'INTERVIEW_DECISION_RECORDED',
    entityType: 'candidates',
    entityId: String(candidateId),
    description: `Trưởng bộ phận (${user.full_name}) đã quyết định [${decision === 'PASSED' ? 'ĐẠT' : 'KHÔNG ĐẠT'}] cho ứng viên ${candidate.full_name}. Nhận xét: ${comment.trim()}`,
    ipAddress
  });

  return await repo.getCandidateEvaluationDetail(Number(candidateId), user);
}

// This endpoint supersedes the candidate-wide legacy decision writer for
// SCRUM-103. Both the decision and candidate summary are persisted under one
// transaction only after trusted application/lifecycle/interview verification.
async function recordVerifiedDecision(candidateId, { application_id, decision, comment } = {}, user, ipAddress) {
  const { createOfferDecisionTransaction } = require('./offerDecisionTransaction');
  const { loadVerifiedDecisionWriteScope } = require('./offerDecisionScopeReader');
  const { createOfferDecisionSqlWriter } = require('./offerDecisionSqlWriter');
  const { writeOfferDecisionAudit } = require('./offerDecisionAuditWriter');
  const { verifyLifecycle, verifyEvaluation } = require('./offerDecisionEvidenceReaders');
  const writer = createOfferDecisionSqlWriter({ verifyLifecycle, verifyEvaluation });
  const wrappedWriter = async (args) => {
    const persisted = await writer(args);
    const status = args.decision === 'PASSED' ? 'PASSED' : 'REJECTED';
    const [update] = await args.conn.execute(`
      UPDATE candidates SET interview_decision = ?, interview_decision_by = ?,
        interview_decision_at = CURRENT_TIMESTAMP, interview_decision_comment = ?,
        status = ?, stage_changed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recruitment_request_id = ? AND merged_into_id IS NULL`,
    [args.decision, args.actorUserId, args.comment, status,
      args.candidateId, args.scope.application.recruitment_request_id]);
    if (update.affectedRows !== 1) {
      throw Object.assign(new Error('Candidate summary mapping changed.'), {statusCode:409, code:'DECISION_SUMMARY_CONFLICT'});
    }
    return persisted;
  };
  const transaction = createOfferDecisionTransaction({ pool,
    loadScope: loadVerifiedDecisionWriteScope, writeDecision: wrappedWriter, writeAudit: writeOfferDecisionAudit });
  return transaction.record({ actorUserId: user.user_id, applicationId: application_id,
    candidateId: candidateId, decision, comment, ipAddress });
}

// Legacy direct Offer creation bypassed application-bound decisions and approval.
// Keep the exported function fail-closed for older callers. The only active
// Offer creation path is POST /api/offers with verified application authority.
async function createOffer() {
  throw Object.assign(new Error('Legacy Offer endpoint has been retired. Use the verified Offer workflow.'),
    {statusCode:503, code:'LEGACY_OFFER_WRITE_DISABLED'});
}

async function addEvaluation(candidateId, evalData, user, ipAddress) {
  const candidate = await repo.getCandidateEvaluationDetail(Number(candidateId), user);
  if (!candidate) {
    const error = new Error('Ứng viên không tồn tại hoặc bạn không có quyền thao tác.');
    error.statusCode = 404;
    throw error;
  }

  const result = await repo.addEvaluation(Number(candidateId), evalData, user.user_id);

  await auditRepo.createLog({
    userId: user.user_id,
    performedBy: user.user_id,
    action: 'INTERVIEW_EVALUATION_ADDED',
    entityType: 'interview_evaluations',
    entityId: String(result.id),
    description: `Thêm phiếu đánh giá phỏng vấn cho ứng viên ${candidate.full_name} (${evalData.interviewer_name || user.full_name}: ${evalData.overall_score} điểm)`,
    ipAddress
  });

  return await repo.getCandidateEvaluationDetail(Number(candidateId), user);
}

/**
 * Seed realistic sample candidate evaluations for testing and demonstration.
 */
async function seedSampleEvaluationData() {
  // Kiểm tra xem đã có vòng phỏng vấn nào chưa
  const [existingRounds] = await pool.query('SELECT COUNT(*) AS total FROM interview_rounds');
  if (existingRounds[0].total > 0) {
    return { message: 'Dữ liệu đánh giá phỏng vấn đã tồn tại.' };
  }

  // Lấy hoặc tạo 1 yêu cầu tuyển dụng mẫu cho IT (Dept 1) và Marketing (Dept 4)
  const [reqs] = await pool.query(`SELECT id, department_id, position_id FROM recruitment_requests WHERE department_id IN (1, 4) AND status = 'APPROVED'`);
  let itReqId = 1;
  let mktReqId = null;

  reqs.forEach(r => {
    if (r.department_id === 1) itReqId = r.id;
    if (r.department_id === 4) mktReqId = r.id;
  });

  if (!mktReqId) {
    // Tạo 1 request cho Marketing nếu chưa có
    const [insMkt] = await pool.query(`
      INSERT INTO recruitment_requests (
        department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, status, created_by
      ) VALUES (4, 8, 2, 'Tuyển dụng chuyên viên Marketing mở rộng', 9000000, 18000000, 'APPROVED', 7)
    `);
    mktReqId = insMkt.insertId;
  }

  // 1. Ứng viên 1 (Dept 1 - IT): Lê Minh Tuấn - 2 vòng đầy đủ 3 phiếu đánh giá, điểm cao (8.65) -> Đang chờ Trưởng bộ phận duyệt
  const [cand1] = await pool.query(`
    INSERT INTO candidates (
      full_name, email, phone, status, source_code, recruitment_request_id, created_by, interview_decision
    ) VALUES (
      'Lê Minh Tuấn', 'tuan.leminh@example.com', '0912345678', 'INTERVIEWING', 'LINKEDIN', ?, 3, NULL
    )
  `, [itReqId]);
  const c1Id = cand1.insertId;

  // Vòng 1: Kỹ thuật & Chuyên môn (Dự kiến 2 phiếu - Đã nộp 2 phiếu)
  const [r1] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 1, 'Vòng 1: Đánh giá Kỹ thuật & Lập trình', '2026-10-15 09:30:00', 2, 'COMPLETED')
  `, [c1Id]);
  const r1Id = r1.insertId;

  // Phiếu 1 vòng 1 (Người phỏng vấn 1: Thàng Xuân Lập - Senior Dev)
  const [e1] = await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (
      ?, ?, 5, 'Thàng Xuân Lập', 'Senior Developer',
      8.7, 10.0, 'PASS',
      'Ứng viên nắm rất chắc kiến thức Frontend hiện đại, giải quyết thuật toán tốt và có tư duy kiến trúc sạch.',
      'Thành thạo React, Zustand, thiết kế UI tốt, tư duy phản biện cao',
      'Cần tìm hiểu thêm về CI/CD pipeline tự động hóa',
      'COMPLETED', '2026-10-15 11:00:00'
    )
  `, [r1Id, c1Id]);
  await pool.query(`
    INSERT INTO interview_evaluation_criteria (evaluation_id, criteria_name, weight, score, max_score, note) VALUES
    (?, 'Kiến thức chuyên môn Frontend', 1.5, 9.0, 10.0, 'Nắm vững Virtual DOM, React Hooks, tối ưu bundle size'),
    (?, 'Kỹ năng giải quyết bài toán (Coding)', 1.5, 8.5, 10.0, 'Code chuẩn, viết clean code và test case đầy đủ'),
    (?, 'Khả năng tư duy logic', 1.0, 8.5, 10.0, 'Phân tích yêu cầu nhanh, mạch lạc')
  `, [e1.insertId, e1.insertId, e1.insertId]);

  // Phiếu 2 vòng 1 (Người phỏng vấn 2: Nguyễn Anh Sơn - Tech Lead)
  const [e2] = await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (
      ?, ?, 3, 'Nguyễn Anh Sơn', 'Technical Lead',
      8.4, 10.0, 'PASS',
      'Ứng viên có thái độ cầu thị, trả lời tự tin các câu hỏi tình huống thực tế và tối ưu hiệu năng.',
      'Giao tiếp tự tin, có kinh nghiệm làm việc theo mô hình Agile/Scrum',
      'Kinh nghiệm viết test tự động cần trau dồi thêm',
      'COMPLETED', '2026-10-15 11:15:00'
    )
  `, [r1Id, c1Id]);
  await pool.query(`
    INSERT INTO interview_evaluation_criteria (evaluation_id, criteria_name, weight, score, max_score, note) VALUES
    (?, 'Tối ưu hiệu năng ứng dụng', 1.0, 8.0, 10.0, 'Biết lazy loading và caching'),
    (?, 'Kỹ năng làm việc nhóm & Agile', 1.0, 9.0, 10.0, 'Có kinh nghiệm phối hợp Scrum tốt'),
    (?, 'Thái độ và giao tiếp', 1.0, 8.5, 10.0, 'Tác phong chuyên nghiệp')
  `, [e2.insertId, e2.insertId, e2.insertId]);

  // Vòng 2: Văn hóa & Phù hợp tổ chức (Dự kiến 1 phiếu - Đã nộp 1 phiếu từ HR)
  const [r2] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 2, 'Vòng 2: Phỏng vấn Văn hóa & Định hướng Phát triển', '2026-10-17 14:00:00', 1, 'COMPLETED')
  `, [c1Id]);
  const r2Id = r2.insertId;

  const [e3] = await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (
      ?, ?, 2, 'Hà Đức Minh', 'HR Manager',
      8.8, 10.0, 'PASS',
      'Định hướng nghề nghiệp rõ ràng, gắn bó lâu dài, mức kỳ vọng lương thưởng phù hợp với khung của công ty.',
      'Tích cực, hòa đồng, năng lượng tốt',
      'Cần linh hoạt hơn trong thời gian làm việc OT khi có dự án gấp',
      'COMPLETED', '2026-10-17 15:00:00'
    )
  `, [r2Id, c1Id]);
  await pool.query(`
    INSERT INTO interview_evaluation_criteria (evaluation_id, criteria_name, weight, score, max_score, note) VALUES
    (?, 'Phù hợp giá trị cốt lõi', 1.0, 9.0, 10.0, 'Rất hợp với văn hóa chia sẻ và học hỏi'),
    (?, 'Kế hoạch phát triển bản thân', 1.0, 8.5, 10.0, 'Mục tiêu rõ ràng trong 2 năm tới'),
    (?, 'Mức độ cam kết gắn bó', 1.0, 9.0, 10.0, 'Tìm kiếm môi trường ổn định phát triển')
  `, [e3.insertId, e3.insertId, e3.insertId]);

  // 2. Ứng viên 2 (Dept 1 - IT): Phạm Thu Trang - Vòng 2 THIẾU PHIẾU ĐÁNH GIÁ (Dự kiến 2 phiếu, mới nộp 1)
  const [cand2] = await pool.query(`
    INSERT INTO candidates (
      full_name, email, phone, status, source_code, recruitment_request_id, created_by, interview_decision
    ) VALUES (
      'Phạm Thu Trang', 'trang.pham@example.com', '0987654321', 'INTERVIEWING', 'WEBSITE', ?, 3, NULL
    )
  `, [itReqId]);
  const c2Id = cand2.insertId;

  // Vòng 1: Kỹ thuật (Đã xong 1/1 phiếu)
  const [r21] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 1, 'Vòng 1: Đánh giá Năng lực Kỹ thuật', '2026-10-16 10:00:00', 1, 'COMPLETED')
  `, [c2Id]);
  const [e21] = await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (
      ?, ?, 5, 'Thàng Xuân Lập', 'Senior Developer',
      7.8, 10.0, 'PASS',
      'Ứng viên làm bài test đạt 80%, tư duy cơ bản tốt.',
      'Cẩn thận, tỉ mỉ',
      'Tốc độ code còn chậm',
      'COMPLETED', '2026-10-16 11:30:00'
    )
  `, [r21.insertId, c2Id]);

  // Vòng 2: Phỏng vấn Chuyên sâu (Dự kiến 2 phiếu - MỚI NỘP 1 PHIẾU, THIẾU 1 PHIẾU CỦA ĐỒNG PHỎNG VẤN)
  const [r22] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 2, 'Vòng 2: Phỏng vấn Chuyên sâu & Giải pháp Hệ thống', '2026-10-18 14:30:00', 2, 'IN_PROGRESS')
  `, [c2Id]);
  const [e22] = await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (
      ?, ?, 3, 'Nguyễn Anh Sơn', 'Technical Lead',
      7.5, 10.0, 'CONSIDER',
      'Cần bổ sung thêm đánh giá từ Trưởng bộ phận để có kết luận chính xác.',
      'Nắm kiến thức API tốt',
      'Chưa nhiều kinh nghiệm với microservices',
      'COMPLETED', '2026-10-18 16:00:00'
    )
  `, [r22.insertId, c2Id]);

  // 3. Ứng viên 3 (Dept 1 - IT): Hoàng Đức Anh - Đã được Trưởng bộ phận đánh KHÔNG ĐẠT (FAILED) -> Bị khóa tạo Offer
  const [cand3] = await pool.query(`
    INSERT INTO candidates (
      full_name, email, phone, status, source_code, recruitment_request_id, created_by,
      interview_decision, interview_decision_by, interview_decision_at, interview_decision_comment
    ) VALUES (
      'Hoàng Đức Anh', 'anh.hoang@example.com', '0933112233', 'REJECTED', 'TOPCV', ?, 3,
      'FAILED', 4, '2026-10-18 16:45:00', 'Ứng viên chưa đáp ứng yêu cầu kinh nghiệm thực tế về tối ưu hệ thống tải cao. Kiến thức lý thuyết tốt nhưng thực hành còn hạn chế so với yêu cầu vị trí Senior.'
    )
  `, [itReqId]);
  const c3Id = cand3.insertId;

  const [r31] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 1, 'Vòng 1: Đánh giá Kỹ thuật Tổng quan', '2026-10-17 09:00:00', 1, 'COMPLETED')
  `, [c3Id]);
  await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, status, submitted_at
    ) VALUES (
      ?, ?, 5, 'Thàng Xuân Lập', 'Senior Developer',
      4.8, 10.0, 'FAIL',
      'Không trả lời được các câu hỏi về concurrency và database lock.', 'COMPLETED', '2026-10-17 10:15:00'
    )
  `, [r31.insertId, c3Id]);

  // 4. Ứng viên 4 (Dept 4 - Marketing): Vũ Phương Linh - Đã được Trưởng bộ phận duyệt ĐẠT và ĐÃ TẠO OFFER
  const [cand4] = await pool.query(`
    INSERT INTO candidates (
      full_name, email, phone, status, source_code, recruitment_request_id, created_by,
      interview_decision, interview_decision_by, interview_decision_at, interview_decision_comment
    ) VALUES (
      'Vũ Phương Linh', 'linh.vu@example.com', '0944556677', 'OFFERED', 'FACEBOOK', ?, 3,
      'PASSED', 7, '2026-10-18 11:30:00', 'Ứng viên rất sáng tạo, có thành tích chiến dịch marketing ấn tượng ở công ty cũ. Phù hợp hoàn toàn với định hướng của bộ phận Marketing.'
    )
  `, [mktReqId]);
  const c4Id = cand4.insertId;

  const [r41] = await pool.query(`
    INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
    VALUES (?, 1, 'Vòng 1: Phỏng vấn Năng lực Marketing & Portfolio', '2026-10-16 15:00:00', 1, 'COMPLETED')
  `, [c4Id]);
  await pool.query(`
    INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, status, submitted_at
    ) VALUES (
      ?, ?, 7, 'Nguyễn Xuân Phú', 'Trưởng bộ phận Marketing',
      9.2, 10.0, 'PASS',
      'Portfolio xuất sắc, kinh nghiệm chạy Ads đa kênh và phân tích dữ liệu chuyên nghiệp.', 'COMPLETED', '2026-10-16 16:30:00'
    )
  `, [r41.insertId, c4Id]);

  // Đã tạo Offer cho ứng viên 4
  await pool.query(`
    INSERT INTO candidate_offers (
      candidate_id, position_id, salary_amount, currency, start_date, response_deadline, message, note, status, created_by
    ) VALUES (
      ?, 8, 15000000, 'VND', '2026-11-01', '2026-10-25',
      'Chào mừng bạn gia nhập đội ngũ Marketing của TechCorp với mức đãi ngộ hấp dẫn.',
      'Đề xuất mức lương 15tr nằm trong khung 9tr - 18tr đã phê duyệt.',
      'PENDING_RESPONSE', 7
    )
  `, [c4Id]);

  return { message: 'Khởi tạo dữ liệu mẫu đánh giá phỏng vấn thành công.' };
}

module.exports = {
  getCandidates,
  getCandidateDetail,
  recordDecision,
  recordVerifiedDecision,
  createOffer,
  addEvaluation,
  seedSampleEvaluationData
};
