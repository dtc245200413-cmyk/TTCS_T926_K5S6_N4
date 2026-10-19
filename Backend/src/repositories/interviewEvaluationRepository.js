const { pool } = require('../config/database');

async function getScheduleById(scheduleId) {
  const [rows] = await pool.execute(`
    SELECT s.id, s.candidate_id, c.full_name AS candidate_name, c.email AS candidate_email,
           s.position_id, p.position_name, p.competency_framework_id,
           cf.framework_name,
           s.interviewer_id, u.full_name AS interviewer_name, u.employee_code AS interviewer_code,
           s.round_number, s.round_name, s.room_id, room.name AS room_name,
           DATE_FORMAT(s.start_at, '%Y-%m-%dT%H:%i:%sZ') AS start_at,
           DATE_FORMAT(s.end_at, '%Y-%m-%dT%H:%i:%sZ') AS end_at,
           s.status
    FROM interview_schedules s
    JOIN candidates c ON c.id = s.candidate_id
    JOIN job_positions p ON p.position_id = s.position_id
    LEFT JOIN competency_frameworks cf ON cf.framework_id = p.competency_framework_id
    LEFT JOIN users u ON u.user_id = s.interviewer_id
    LEFT JOIN master_data room ON room.id = s.room_id
    WHERE s.id = ?
  `, [scheduleId]);
  return rows[0] || null;
}

async function getCriteriaByFramework(frameworkId) {
  const [rows] = await pool.execute(`
    SELECT criteria_id, framework_id, criteria_name, weight, description
    FROM competency_criteria
    WHERE framework_id = ?
    ORDER BY criteria_id ASC
  `, [frameworkId]);
  return rows;
}

async function getDefaultCriteria() {
  const [rows] = await pool.execute(`
    SELECT id AS criteria_id, NULL AS framework_id, name AS criteria_name, 20.00 AS weight, description
    FROM competencies
    ORDER BY id ASC
    LIMIT 5
  `);
  return rows;
}

async function getEvaluationByScheduleAndInterviewer(scheduleId, interviewerId) {
  const [rows] = await pool.execute(`
    SELECT e.id, e.interview_schedule_id, e.candidate_id, e.interviewer_id,
           u.full_name AS interviewer_name, e.round_number,
           e.total_score, e.recommendation, e.general_comments, e.status,
           e.submitted_at, e.created_at, e.updated_at
    FROM interview_evaluations e
    JOIN users u ON u.user_id = e.interviewer_id
    WHERE e.interview_schedule_id = ? AND e.interviewer_id = ?
    LIMIT 1
  `, [scheduleId, interviewerId]);
  return rows[0] || null;
}

async function getEvaluationById(evaluationId) {
  const [rows] = await pool.execute(`
    SELECT e.id, e.interview_schedule_id, e.candidate_id, c.full_name AS candidate_name,
           e.interviewer_id, u.full_name AS interviewer_name, e.round_number,
           e.total_score, e.recommendation, e.general_comments, e.status,
           e.submitted_at, e.created_at, e.updated_at,
           p.position_name
    FROM interview_evaluations e
    JOIN candidates c ON c.id = e.candidate_id
    JOIN users u ON u.user_id = e.interviewer_id
    JOIN interview_schedules s ON s.id = e.interview_schedule_id
    JOIN job_positions p ON p.position_id = s.position_id
    WHERE e.id = ?
  `, [evaluationId]);
  return rows[0] || null;
}

async function getEvaluationDetails(evaluationId) {
  const [rows] = await pool.execute(`
    SELECT id, evaluation_id, criteria_id, criteria_name, weight, score, comments
    FROM interview_evaluation_details
    WHERE evaluation_id = ?
    ORDER BY id ASC
  `, [evaluationId]);
  return rows;
}

async function getEvaluationsByCandidate(candidateId) {
  const [rows] = await pool.execute(`
    SELECT e.id, e.interview_schedule_id, e.candidate_id, e.interviewer_id,
           u.full_name AS interviewer_name, e.round_number,
           e.total_score, e.recommendation, e.general_comments, e.status,
           e.submitted_at, p.position_name, s.start_at
    FROM interview_evaluations e
    JOIN users u ON u.user_id = e.interviewer_id
    JOIN interview_schedules s ON s.id = e.interview_schedule_id
    JOIN job_positions p ON p.position_id = s.position_id
    WHERE e.candidate_id = ?
    ORDER BY e.round_number ASC, e.submitted_at DESC
  `, [candidateId]);
  return rows;
}

async function getAllEvaluationsSummary() {
  const [rows] = await pool.execute(`
    SELECT e.id, e.interview_schedule_id, e.candidate_id, c.full_name AS candidate_name,
           e.interviewer_id, u.full_name AS interviewer_name, e.round_number,
           e.total_score, e.recommendation, e.status, e.submitted_at
    FROM interview_evaluations e
    JOIN candidates c ON c.id = e.candidate_id
    JOIN users u ON u.user_id = e.interviewer_id
    ORDER BY e.submitted_at DESC
  `);
  return rows;
}

async function createEvaluation({
  interview_schedule_id,
  candidate_id,
  interviewer_id,
  round_number = 1,
  total_score,
  recommendation,
  general_comments,
  details = []
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Chèn phiếu đánh giá chính
    const [result] = await connection.execute(`
      INSERT INTO interview_evaluations (
        interview_schedule_id, candidate_id, interviewer_id,
        round_number, total_score, recommendation, general_comments,
        status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', NOW())
    `, [
      interview_schedule_id,
      candidate_id,
      interviewer_id,
      round_number,
      total_score,
      recommendation,
      general_comments
    ]);

    const evaluationId = result.insertId;

    // 2. Chèn chi tiết từng tiêu chí
    for (const d of details) {
      await connection.execute(`
        INSERT INTO interview_evaluation_details (
          evaluation_id, criteria_id, criteria_name, weight, score, comments
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        evaluationId,
        d.criteria_id,
        d.criteria_name || 'Tiêu chí năng lực',
        d.weight !== undefined && d.weight !== null ? d.weight : 0,
        d.score,
        d.comments || null
      ]);
    }

    // 3. Cập nhật trạng thái lịch phỏng vấn thành COMPLETED nếu đang SCHEDULED
    await connection.execute(`
      UPDATE interview_schedules
      SET status = 'COMPLETED'
      WHERE id = ? AND status = 'SCHEDULED'
    `, [interview_schedule_id]);

    // 4. Đồng bộ vào candidate_ratings để hiển thị sao chung ở Candidate List (Tận dụng module sẵn có)
    const roundedRating = Math.max(1, Math.min(5, Math.round(Number(total_score))));
    await connection.execute(`
      INSERT INTO candidate_ratings (candidate_id, reviewer_id, rating, comment)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)
    `, [
      candidate_id,
      interviewer_id,
      roundedRating,
      `[Phiếu phỏng vấn Vòng ${round_number}] Kết luận: ${recommendation === 'RECOMMENDED' ? 'Nên tuyển' : recommendation === 'CONSIDER' ? 'Cân nhắc' : 'Không nên tuyển'}. ${general_comments}`
    ]);

    // 5. Tìm Trưởng bộ phận hoặc Recruiter phụ trách để gửi thông báo tự động (US 5)
    const [candRows] = await connection.execute(`
      SELECT c.full_name, r.department_id, d.manager_user_id, r.recruiter_id
      FROM candidates c
      LEFT JOIN recruitment_requests r ON r.id = c.recruitment_request_id
      LEFT JOIN departments d ON d.department_id = r.department_id
      WHERE c.id = ?
    `, [candidate_id]);

    const candInfo = candRows[0];
    const recLabel = recommendation === 'RECOMMENDED' ? 'Nên tuyển' : recommendation === 'CONSIDER' ? 'Cân nhắc' : 'Không nên tuyển';
    const notifTitle = 'Đã có kết quả đánh giá phỏng vấn mới';
    const notifMsg = `Người phỏng vấn đã hoàn thành chấm phiếu cho ứng viên ${candInfo?.full_name || ''} (Điểm: ${total_score}/5.0 - ${recLabel}).`;

    // Thông báo cho Trưởng bộ phận nếu có
    if (candInfo?.manager_user_id) {
      await connection.execute(`
        INSERT INTO notifications (user_id, title, message, type, link, is_read)
        VALUES (?, ?, ?, 'INTERVIEW_EVALUATED', '/interviews', 0)
      `, [candInfo.manager_user_id, notifTitle, notifMsg]);
    }

    // Thông báo cho Recruiter phụ trách
    if (candInfo?.recruiter_id && candInfo.recruiter_id !== candInfo.manager_user_id) {
      await connection.execute(`
        INSERT INTO notifications (user_id, title, message, type, link, is_read)
        VALUES (?, ?, ?, 'INTERVIEW_EVALUATED', '/interviews', 0)
      `, [candInfo.recruiter_id, notifTitle, notifMsg]);
    }

    await connection.commit();
    return evaluationId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getScheduleById,
  getCriteriaByFramework,
  getDefaultCriteria,
  getEvaluationByScheduleAndInterviewer,
  getEvaluationById,
  getEvaluationDetails,
  getEvaluationsByCandidate,
  getAllEvaluationsSummary,
  createEvaluation
};
