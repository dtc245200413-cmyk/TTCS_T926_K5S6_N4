const { pool } = require('./src/config/database');

async function seedScheduleStatuses() {
  console.log('Seeding diverse interview schedule statuses...');

  // 1. Set id 7 & 8 to COMPLETED and add evaluations so they show "Đã chấm"
  await pool.query("UPDATE interview_schedules SET status = 'COMPLETED' WHERE id IN (7, 8)");
  await pool.query("DELETE FROM interview_evaluations WHERE interview_schedule_id IN (7, 8)");
  await pool.query(`
    INSERT INTO interview_evaluations 
      (interview_schedule_id, candidate_id, interviewer_id, round_number, total_score, recommendation, general_comments, status, submitted_at)
    VALUES 
      (7, 46, 5, 1, 8.5, 'RECOMMENDED', 'Ứng viên có kiến thức chuyên môn backend vững vàng, giao tiếp tốt, phù hợp văn hóa TechCorp.', 'SUBMITTED', '2026-10-15 15:30:00'),
      (8, 47, 5, 1, 7.0, 'CONSIDER', 'Ứng viên nắm vững cơ bản, cần trau dồi thêm về kiến trúc vi dịch vụ và xử lý high concurrency.', 'SUBMITTED', '2026-10-16 16:00:00')
  `);

  // 2. Set id 9 & 10 to COMPLETED (unevaluated) -> "Đã hoàn thành" with "⭐ Chấm điểm"
  await pool.query("UPDATE interview_schedules SET status = 'COMPLETED' WHERE id IN (9, 10)");
  await pool.query("DELETE FROM interview_evaluations WHERE interview_schedule_id IN (9, 10)");

  // 3. Set id 11 & 21 to IN_PROGRESS -> "Đang phỏng vấn"
  await pool.query("UPDATE interview_schedules SET status = 'IN_PROGRESS' WHERE id IN (11, 21)");
  await pool.query("DELETE FROM interview_evaluations WHERE interview_schedule_id IN (11, 21)");

  // 4. Set id 12 & 13 to SCHEDULED -> "Đã lên lịch"
  await pool.query("UPDATE interview_schedules SET status = 'SCHEDULED' WHERE id IN (12, 13)");
  await pool.query("DELETE FROM interview_evaluations WHERE interview_schedule_id IN (12, 13)");

  // 5. Set id 23 & 24 to CANCELLED -> "Đã hủy"
  await pool.query("UPDATE interview_schedules SET status = 'CANCELLED' WHERE id IN (23, 24)");
  await pool.query("DELETE FROM interview_evaluations WHERE interview_schedule_id IN (23, 24)");

  // 6. Ensure Trưởng bộ phận (Nguyễn Xuân Phú - id 7) has their own schedules
  await pool.query("UPDATE interview_schedules SET interviewer_id = 7, status = 'COMPLETED' WHERE id = 14");
  await pool.query("UPDATE interview_schedules SET interviewer_id = 7, status = 'SCHEDULED' WHERE id = 25");

  console.log('Successfully seeded all 5 schedule statuses with role scoping!');
  process.exit(0);
}

seedScheduleStatuses().catch(err => {
  console.error('Error seeding schedule statuses:', err);
  process.exit(1);
});
