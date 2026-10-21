const repository = require('../repositories/interviewEvaluationRepository');

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Lấy dữ liệu để hiển thị form đánh giá (tiêu chí khung năng lực, hoặc phiếu đã nộp nếu có)
 */
async function getEvaluationFormBySchedule(scheduleId, user) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');

  const schedule = await repository.getScheduleById(scheduleId);
  if (!schedule) fail(404, 'Không tìm thấy lịch phỏng vấn.');

  const roles = user.roles?.map(r => r.role_code) || [];
  const isAdminOrHR = roles.some(r => ['ADMIN', 'HR_MANAGER', 'HIRING_MANAGER'].includes(r));
  const isAssignedInterviewer = Number(schedule.interviewer_id) === Number(user.user_id);

  // Chỉ người phỏng vấn được phân công hoặc cấp quản lý mới được xem form/phiếu
  if (!isAssignedInterviewer && !isAdminOrHR) {
    fail(403, 'Bạn không có quyền truy cập phiếu đánh giá của lịch phỏng vấn này.');
  }

  // 1. Kiểm tra xem đã có phiếu nộp trước đó chưa
  const existingEvaluation = await repository.getEvaluationByScheduleAndInterviewer(
    scheduleId,
    schedule.interviewer_id
  );

  let details = [];
  if (existingEvaluation) {
    details = await repository.getEvaluationDetails(existingEvaluation.id);
  }

  // 2. Lấy danh sách tiêu chí năng lực của vị trí
  let criteriaList = [];
  if (schedule.competency_framework_id) {
    criteriaList = await repository.getCriteriaByFramework(schedule.competency_framework_id);
  }

  // Fallback an toàn: nếu vị trí chưa gán khung hoặc khung chưa có tiêu chí
  if (!criteriaList.length) {
    criteriaList = await repository.getDefaultCriteria();
  }

  return {
    schedule,
    is_assigned_interviewer: isAssignedInterviewer,
    can_evaluate: isAssignedInterviewer && !existingEvaluation && schedule.status !== 'CANCELLED',
    has_evaluated: !!existingEvaluation,
    evaluation: existingEvaluation ? {
      ...existingEvaluation,
      details
    } : null,
    criteria: criteriaList
  };
}

/**
 * Nộp phiếu đánh giá năng lực phỏng vấn
 */
async function submitEvaluation(body, user) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');

  const { interview_schedule_id, recommendation, general_comments, criteria_scores } = body;
  if (!interview_schedule_id) fail(400, 'Thiếu thông tin lịch phỏng vấn.');

  const schedule = await repository.getScheduleById(interview_schedule_id);
  if (!schedule) fail(404, 'Không tìm thấy lịch phỏng vấn.');

  if (schedule.status === 'CANCELLED') {
    fail(400, 'Lịch phỏng vấn đã bị hủy, không thể nộp phiếu đánh giá.');
  }

  const roles = user.roles?.map(r => r.role_code) || [];
  const isAdmin = roles.includes('ADMIN');
  const isAssignedInterviewer = Number(schedule.interviewer_id) === Number(user.user_id);

  // Đặc tả: "Chỉ người phỏng vấn được phân công mới có quyền chấm phiếu tương ứng."
  if (!isAssignedInterviewer && !isAdmin) {
    fail(403, 'Chỉ người phỏng vấn được phân công cho lịch này mới có quyền chấm phiếu.');
  }

  // Đặc tả: "tránh tạo hai phiếu chốt cho cùng lượt."
  const existing = await repository.getEvaluationByScheduleAndInterviewer(
    interview_schedule_id,
    schedule.interviewer_id
  );
  if (existing) {
    fail(409, 'Bạn đã nộp phiếu đánh giá cho buổi phỏng vấn này rồi. Không được tạo hai phiếu chốt cho cùng lượt.');
  }

  // Đặc tả: "Nhập nhận xét, kết luận Nên tuyển/Cân nhắc/Không nên tuyển và kiểm tra trường bắt buộc trước khi nộp."
  const validRecommendations = ['RECOMMENDED', 'CONSIDER', 'NOT_RECOMMENDED'];
  if (!recommendation || !validRecommendations.includes(recommendation)) {
    fail(400, 'Kết luận phải là một trong các giá trị: Nên tuyển (RECOMMENDED), Cân nhắc (CONSIDER), hoặc Không nên tuyển (NOT_RECOMMENDED).');
  }

  if (!general_comments || !general_comments.trim()) {
    fail(400, 'Vui lòng nhập nhận xét và căn cứ đánh giá tổng hợp.');
  }

  if (!Array.isArray(criteria_scores) || criteria_scores.length === 0) {
    fail(400, 'Vui lòng chấm điểm cho ít nhất một tiêu chí năng lực.');
  }

  // Kiểm tra điểm từng tiêu chí từ 1–5
  for (const item of criteria_scores) {
    const scoreNum = Number(item.score);
    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      fail(400, `Điểm cho tiêu chí "${item.criteria_name || item.criteria_id}" phải từ 1 đến 5 sao.`);
    }
  }

  // Đặc tả: "Tính điểm tổng hợp theo trọng số, xử lý đúng các trường hợp thiếu trọng số hoặc dữ liệu."
  let totalScore = 0;
  let totalWeight = 0;
  let hasValidWeights = true;

  for (const item of criteria_scores) {
    const w = parseFloat(item.weight);
    if (isNaN(w) || w <= 0) {
      hasValidWeights = false;
      break;
    }
    totalWeight += w;
  }

  if (hasValidWeights && totalWeight > 0) {
    // Tính theo trọng số: sum(score * weight) / sum(weight)
    let weightedSum = 0;
    for (const item of criteria_scores) {
      const w = parseFloat(item.weight);
      weightedSum += Number(item.score) * w;
    }
    totalScore = weightedSum / totalWeight;
  } else {
    // Trường hợp thiếu trọng số hoặc dữ liệu trọng số = 0: tính trung bình cộng đơn giản
    const sumScores = criteria_scores.reduce((sum, item) => sum + Number(item.score), 0);
    totalScore = sumScores / criteria_scores.length;
  }

  // Làm tròn 2 chữ số thập phân
  const roundedTotalScore = Math.round(totalScore * 100) / 100;

  // Tiến hành lưu
  const evaluationId = await repository.createEvaluation({
    interview_schedule_id: schedule.id,
    candidate_id: schedule.candidate_id,
    interviewer_id: schedule.interviewer_id,
    round_number: schedule.round_number || 1,
    total_score: roundedTotalScore,
    recommendation,
    general_comments: general_comments.trim(),
    details: criteria_scores
  });

  const createdEvaluation = await repository.getEvaluationById(evaluationId);
  const details = await repository.getEvaluationDetails(evaluationId);

  return {
    message: 'Nộp phiếu đánh giá thành công.',
    evaluation: {
      ...createdEvaluation,
      details
    }
  };
}

/**
 * Xem chi tiết phiếu đánh giá theo ID
 */
async function getEvaluationById(evaluationId, user) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');
  const evaluation = await repository.getEvaluationById(evaluationId);
  if (!evaluation) fail(404, 'Không tìm thấy phiếu đánh giá.');
  const details = await repository.getEvaluationDetails(evaluationId);
  return { ...evaluation, details };
}

/**
 * Xem tất cả các phiếu đánh giá của một ứng viên (phục vụ Trưởng bộ phận duyệt ở US 2)
 */
async function getEvaluationsByCandidate(candidateId, user) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');
  return repository.getEvaluationsByCandidate(candidateId);
}

module.exports = {
  getEvaluationFormBySchedule,
  submitEvaluation,
  getEvaluationById,
  getEvaluationsByCandidate
};
