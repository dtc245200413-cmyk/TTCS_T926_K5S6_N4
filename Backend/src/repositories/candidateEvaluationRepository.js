const { pool } = require('../config/database');

/**
 * candidateEvaluationRepository.js
 * Quản lý dữ liệu đánh giá phỏng vấn và quyết định của Trưởng bộ phận.
 */

async function getCandidatesForEvaluation(user) {
  let sql = `
    SELECT
      c.id, c.full_name, c.email, c.phone, c.status, c.source_code,
      c.interview_decision, c.interview_decision_at, c.interview_decision_comment,
      c.created_at, c.resume_url,
      r.id AS request_id, r.department_id, r.position_id, r.reason AS job_reason,
      d.department_name, d.department_code, d.manager_user_id,
      p.position_name, p.min_salary, p.max_salary,
      u_decider.full_name AS decider_name, u_decider.job_title AS decider_job_title,
      co.id AS offer_id, co.status AS offer_status, co.salary_amount AS offer_salary
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users u_decider ON c.interview_decision_by = u_decider.user_id
    LEFT JOIN candidate_offers co ON co.candidate_id = c.id
    WHERE c.merged_into_id IS NULL
  `;

  const params = [];

  if (user) {
    const isHiringManager = user.roles && user.roles.some(r => r.role_code === 'HIRING_MANAGER');
    const isHR = user.roles && user.roles.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'ADMIN');
    const isRecruiter = user.roles && user.roles.some(r => r.role_code === 'RECRUITER');

    // Rule 1: Danh sách chỉ hiển thị ứng viên thuộc vị trí/bộ phận mà người dùng có quyền quản lý
    if (isHiringManager && !isHR && !isRecruiter) {
      sql += ` AND (r.department_id = ? OR d.manager_user_id = ?) `;
      params.push(user.department_id || 0, user.user_id);
    }
  }

  sql += ` ORDER BY c.created_at DESC`;

  const [candidates] = await pool.execute(sql, params);

  if (candidates.length === 0) return [];

  const candidateIds = candidates.map(c => c.id);
  const placeholders = candidateIds.map(() => '?').join(',');

  // Lấy các vòng phỏng vấn
  const [rounds] = await pool.query(
    `SELECT * FROM interview_rounds WHERE candidate_id IN (${placeholders}) ORDER BY round_number ASC`,
    candidateIds
  );

  // Lấy các phiếu đánh giá (chống đếm trùng bằng ID duy nhất)
  const [evaluations] = await pool.query(
    `SELECT * FROM interview_evaluations WHERE candidate_id IN (${placeholders}) ORDER BY id ASC`,
    candidateIds
  );

  // Ghép và tổng hợp điểm cho từng ứng viên
  const roundsByCand = {};
  rounds.forEach(r => {
    if (!roundsByCand[r.candidate_id]) roundsByCand[r.candidate_id] = [];
    roundsByCand[r.candidate_id].push(r);
  });

  const evalsByCand = {};
  evaluations.forEach(e => {
    if (!evalsByCand[e.candidate_id]) evalsByCand[e.candidate_id] = [];
    evalsByCand[e.candidate_id].push(e);
  });

  return candidates.map(cand => {
    const candRounds = roundsByCand[cand.id] || [];
    const candEvals = evalsByCand[cand.id] || [];

    // Chống đếm trùng phiếu: deduplicate evaluations by unique ID
    const uniqueEvalsMap = new Map();
    candEvals.forEach(e => uniqueEvalsMap.set(e.id, e));
    const uniqueEvals = Array.from(uniqueEvalsMap.values());

    let isMissingEvaluations = candRounds.length === 0;
    let completedRoundsScores = [];

    candRounds.forEach(round => {
      // Các phiếu của vòng này (không tính trùng)
      const roundEvals = uniqueEvals.filter(e => e.round_id === round.id && e.status === 'COMPLETED');
      const submittedCount = roundEvals.length;
      if (submittedCount < round.expected_evaluations) {
        isMissingEvaluations = true;
      }
      if (submittedCount > 0) {
        const roundAvg = roundEvals.reduce((acc, curr) => acc + Number(curr.overall_score || 0), 0) / submittedCount;
        completedRoundsScores.push(roundAvg);
      }
    });

    const overallScore = completedRoundsScores.length > 0
      ? Number((completedRoundsScores.reduce((a, b) => a + b, 0) / completedRoundsScores.length).toFixed(2))
      : null;

    // The legacy candidate-level PASSED flag never grants Offer permission.
    // Clients must use GET /api/offers/eligibility for application-bound proof.
    const canCreateOffer = false;

    return {
      ...cand,
      total_rounds: candRounds.length,
      total_evaluations: uniqueEvals.length, // Không đếm trùng phiếu
      is_missing_evaluations: isMissingEvaluations,
      overall_score: overallScore,
      can_create_offer: canCreateOffer
    };
  });
}

async function getCandidateEvaluationDetail(candidateId, user) {
  const [cands] = await pool.execute(`
    SELECT
      c.id, c.full_name, c.email, c.phone, c.status, c.source_code,
      c.interview_decision, c.interview_decision_at, c.interview_decision_comment,
      c.created_at, c.resume_url,
      r.id AS request_id, r.department_id, r.position_id, r.reason AS job_reason,
      d.department_name, d.department_code, d.manager_user_id,
      p.position_name, p.min_salary, p.max_salary,
      u_decider.full_name AS decider_name, u_decider.company_email AS decider_email, u_decider.job_title AS decider_job_title
    FROM candidates c
    LEFT JOIN recruitment_requests r ON c.recruitment_request_id = r.id
    LEFT JOIN departments d ON r.department_id = d.department_id
    LEFT JOIN job_positions p ON r.position_id = p.position_id
    LEFT JOIN users u_decider ON c.interview_decision_by = u_decider.user_id
    WHERE c.id = ? AND c.merged_into_id IS NULL
    LIMIT 1
  `, [candidateId]);

  if (cands.length === 0) return null;
  const candidate = cands[0];

  // Kiểm tra quyền hạn quản lý nếu là Hiring Manager
  if (user) {
    const isHiringManager = user.roles && user.roles.some(r => r.role_code === 'HIRING_MANAGER');
    const isHR = user.roles && user.roles.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'ADMIN');
    const isRecruiter = user.roles && user.roles.some(r => r.role_code === 'RECRUITER');

    if (isHiringManager && !isHR && !isRecruiter) {
      const isDeptMatch = candidate.department_id === user.department_id || candidate.manager_user_id === user.user_id;
      if (!isDeptMatch) {
        const error = new Error('Bạn không có quyền quản lý ứng viên thuộc bộ phận này.');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  // Lấy các vòng phỏng vấn
  const [rounds] = await pool.execute(
    `SELECT * FROM interview_rounds WHERE candidate_id = ? ORDER BY round_number ASC`,
    [candidateId]
  );

  // Lấy các phiếu đánh giá
  const [evaluations] = await pool.execute(
    `SELECT * FROM interview_evaluations WHERE candidate_id = ? ORDER BY id ASC`,
    [candidateId]
  );

  // Lấy chi tiết tiêu chí của các phiếu
  const evalIds = evaluations.map(e => e.id);
  let criteria = [];
  if (evalIds.length > 0) {
    const evalPlaceholders = evalIds.map(() => '?').join(',');
    const [critRows] = await pool.query(
      `SELECT * FROM interview_evaluation_criteria WHERE evaluation_id IN (${evalPlaceholders}) ORDER BY id ASC`,
      evalIds
    );
    criteria = critRows;
  }

  // Gắn criteria vào evaluations
  const criteriaByEval = {};
  criteria.forEach(c => {
    if (!criteriaByEval[c.evaluation_id]) criteriaByEval[c.evaluation_id] = [];
    criteriaByEval[c.evaluation_id].push(c);
  });

  const uniqueEvalsMap = new Map();
  evaluations.forEach(e => {
    uniqueEvalsMap.set(e.id, {
      ...e,
      criteria: criteriaByEval[e.id] || []
    });
  });
  const allUniqueEvals = Array.from(uniqueEvalsMap.values());

  // Tính điểm từng vòng và kiểm tra thiếu phiếu
  let candidateOverallScores = [];
  let hasMissingEvaluations = rounds.length === 0;
  let totalMissingSheets = rounds.length === 0 ? 1 : 0;

  const roundsWithDetails = rounds.map(r => {
    // Phiếu đánh giá của vòng (đã loại trừ trùng lặp)
    const roundEvals = allUniqueEvals.filter(e => e.round_id === r.id);
    const completedEvals = roundEvals.filter(e => e.status === 'COMPLETED' || e.status === 'SUBMITTED');
    const submittedCount = completedEvals.length;
    const isMissing = submittedCount < r.expected_evaluations;
    const missingCount = Math.max(0, r.expected_evaluations - submittedCount);

    if (isMissing) {
      hasMissingEvaluations = true;
      totalMissingSheets += missingCount;
    }

    let roundScore = null;
    if (submittedCount > 0) {
      roundScore = Number((completedEvals.reduce((sum, e) => sum + Number(e.overall_score || 0), 0) / submittedCount).toFixed(2));
      candidateOverallScores.push(roundScore);
    }

    return {
      ...r,
      submitted_evaluations_count: submittedCount, // Không đếm trùng
      is_missing: isMissing,
      missing_count: missingCount,
      round_score: roundScore,
      evaluations: roundEvals
    };
  });

  const aggregateScore = candidateOverallScores.length > 0
    ? Number((candidateOverallScores.reduce((a, b) => a + b, 0) / candidateOverallScores.length).toFixed(2))
    : null;

  // Lấy offer hiện tại nếu có
  const [offers] = await pool.execute(
    `SELECT * FROM candidate_offers WHERE candidate_id = ? ORDER BY id DESC LIMIT 1`,
    [candidateId]
  );
  const currentOffer = offers.length > 0 ? offers[0] : null;

  // Xếp loại đề xuất dựa trên điểm tổng hợp
  let ratingLabel = 'Chưa có điểm';
  let ratingColor = '#64748b';
  if (aggregateScore !== null) {
    if (aggregateScore >= 8.5) {
      ratingLabel = 'Xuất sắc (Khuyến nghị tuyển chọn)';
      ratingColor = '#16a34a';
    } else if (aggregateScore >= 7.0) {
      ratingLabel = 'Tốt (Đạt yêu cầu)';
      ratingColor = '#2563eb';
    } else if (aggregateScore >= 5.0) {
      ratingLabel = 'Trung bình (Cần cân nhắc)';
      ratingColor = '#d97706';
    } else {
      ratingLabel = 'Không đạt yêu cầu';
      ratingColor = '#dc2626';
    }
  }

  // Điều kiện tạo Offer: Chỉ ứng viên ĐẠT mới đủ điều kiện tạo Offer
  const canCreateOffer = false; // Use /api/offers/eligibility for verified application access.

  // Never choose an application by candidate_id when more than one exists.
  // The verified decision writer requires the exact persisted application ID.
  const [candidateApplications] = await pool.execute(
    'SELECT id FROM candidate_applications WHERE candidate_id = ? ORDER BY id ASC LIMIT 2', [candidateId]);
  return {
    ...candidate,
    verified_decision_application_id: candidateApplications.length === 1 ? candidateApplications[0].id : null,
    multiple_applications: candidateApplications.length > 1,
    aggregate_score: aggregateScore,
    rating_label: ratingLabel,
    rating_color: ratingColor,
    is_missing_evaluations: hasMissingEvaluations,
    total_missing_sheets: totalMissingSheets,
    rounds: roundsWithDetails,
    unique_evaluations_count: allUniqueEvals.length,
    offer: currentOffer,
    can_create_offer: canCreateOffer
  };
}

async function recordDecision(candidateId, decision, comment, userId) {
  const newStatus = decision === 'PASSED' ? 'PASSED' : 'REJECTED';

  await pool.execute(`
    UPDATE candidates
    SET
      interview_decision = ?,
      interview_decision_by = ?,
      interview_decision_at = NOW(),
      interview_decision_comment = ?,
      status = ?,
      stage_changed_at = NOW()
    WHERE id = ?
  `, [decision, userId, comment, newStatus, candidateId]);

  return {
    candidate_id: candidateId,
    decision,
    status: newStatus,
    comment,
    decided_by: userId
  };
}

// Retired: direct candidate-wide Offer writes bypassed submission/approval.
async function createCandidateOffer() {
  throw Object.assign(new Error('Legacy candidate-level Offer writer disabled.'),
    {statusCode:503, code:'LEGACY_OFFER_WRITE_DISABLED'});
}

async function addEvaluation(candidateId, evalData, userId) {
  const {
    round_number = 1,
    round_name,
    interviewer_name,
    interviewer_role,
    overall_score,
    max_score = 10.0,
    result = 'PASS',
    comments,
    strengths,
    weaknesses,
    criteria = []
  } = evalData;

  // 1. Kiểm tra vòng phỏng vấn đã tồn tại chưa, nếu chưa thì tạo
  let [rounds] = await pool.execute(
    `SELECT id, expected_evaluations FROM interview_rounds WHERE candidate_id = ? AND round_number = ? LIMIT 1`,
    [candidateId, round_number]
  );

  let roundId;
  if (rounds.length === 0) {
    const defaultRoundName = round_name || `Vòng ${round_number}: Phỏng vấn đánh giá năng lực`;
    const [insRound] = await pool.execute(
      `INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
       VALUES (?, ?, ?, NOW(), 1, 'IN_PROGRESS')`,
      [candidateId, round_number, defaultRoundName]
    );
    roundId = insRound.insertId;
  } else {
    roundId = rounds[0].id;
  }

  // 2. Thêm phiếu đánh giá
  const [insEval] = await pool.execute(
    `INSERT INTO interview_evaluations (
      round_id, candidate_id, interviewer_id, interviewer_name, interviewer_role,
      overall_score, max_score, result, comments, strengths, weaknesses, status, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', NOW())`,
    [
      roundId,
      candidateId,
      userId || null,
      interviewer_name || 'Người phỏng vấn',
      interviewer_role || 'Thành viên ban phỏng vấn',
      Number(overall_score) || 8.0,
      Number(max_score) || 10.0,
      result || 'PASS',
      comments || '',
      strengths || '',
      weaknesses || ''
    ]
  );
  const evalId = insEval.insertId;

  // 3. Thêm tiêu chí nếu có
  if (Array.isArray(criteria) && criteria.length > 0) {
    for (const c of criteria) {
      if (c.criteria_name) {
        await pool.execute(
          `INSERT INTO interview_evaluation_criteria (evaluation_id, criteria_name, weight, score, max_score, note)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            evalId,
            c.criteria_name,
            Number(c.weight) || 1.0,
            Number(c.score) || 8.0,
            Number(c.max_score) || 10.0,
            c.note || ''
          ]
        );
      }
    }
  }

  return { id: evalId, round_id: roundId, candidate_id: candidateId };
}

module.exports = {
  getCandidatesForEvaluation,
  getCandidateEvaluationDetail,
  recordDecision,
  createCandidateOffer,
  addEvaluation
};
