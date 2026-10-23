const { pool } = require('./src/config/database');

async function seedFullData() {
  console.log('--- STARTING COMPLETE DATA ENRICHMENT ---');

  // 1. Update candidates 1-4 with recruitment requests
  await pool.query('UPDATE candidates SET recruitment_request_id = 31 WHERE id = 1');
  await pool.query('UPDATE candidates SET recruitment_request_id = 30 WHERE id = 2');
  await pool.query('UPDATE candidates SET recruitment_request_id = 30 WHERE id = 3');
  await pool.query('UPDATE candidates SET recruitment_request_id = 32 WHERE id = 4');

  // 2. Set decisions for passed / hired / offered / rejected candidates
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 5,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Ứng viên có kỹ năng ReactJS và giải quyết vấn đề xuất sắc.'
    WHERE id = 1
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 5,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kiến thức Node.js vững vàng, tư duy hệ thống tốt.'
    WHERE id = 2
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 5,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kinh nghiệm DevOps và Cloud ấn tượng, phù hợp định hướng dự án.'
    WHERE id = 3
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 5,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kỹ năng phỏng vấn và thu hút nhân tài xuất sắc.'
    WHERE id = 4
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 7,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Sáng tạo nội dung xuất sắc, có tư duy thương hiệu tốt.'
    WHERE id = 51
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 7,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kỹ năng SEO on-page và technical SEO rất ấn tượng.'
    WHERE id = 52
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 7,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Thành tích chiến dịch truyền thông vượt trội, giao tiếp lưu loát.'
    WHERE id = 53
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'PASSED',
      interview_decision_by = 7,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kỹ năng thiết kế UI/UX và đồ họa thương hiệu đẹp, hiện đại.'
    WHERE id = 54
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'FAILED',
      interview_decision_by = 7,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Chưa đáp ứng yêu cầu kinh nghiệm viết nội dung chuyên sâu.'
    WHERE id = 55
  `);
  await pool.query(`
    UPDATE candidates SET
      interview_decision = 'FAILED',
      interview_decision_by = 5,
      interview_decision_at = NOW(),
      interview_decision_comment = 'Kiến thức về cơ sở dữ liệu phân tán và caching chưa đạt chuẩn.'
    WHERE id = 56
  `);

  // 3. Ensure candidate_applications exist for candidates who need verified decisions
  for (const candId of [1, 2, 3, 4, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56]) {
    const [existing] = await pool.query('SELECT id FROM candidate_applications WHERE candidate_id = ?', [candId]);
    if (existing.length === 0) {
      const [cands] = await pool.query('SELECT recruitment_request_id FROM candidates WHERE id = ?', [candId]);
      const reqId = cands[0]?.recruitment_request_id || 30;
      const [postings] = await pool.query('SELECT id FROM job_postings WHERE recruitment_request_id = ? LIMIT 1', [reqId]);
      const jobPostingId = postings[0]?.id || 30;
      const appCode = 'HS-202610-' + String(candId).padStart(5, '0');
      await pool.query('INSERT INTO candidate_applications (application_code, candidate_id, job_posting_id, recruitment_request_id, status) VALUES (?, ?, ?, ?, "INTERVIEWING")', [appCode, candId, jobPostingId, reqId]);
    }
  }

  // 4. Ensure interview_rounds exist for all candidates
  const allCandIds = [1, 2, 3, 4, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56];
  for (const cId of allCandIds) {
    const [rnd] = await pool.query('SELECT id FROM interview_rounds WHERE candidate_id = ? AND round_number = 1', [cId]);
    if (rnd.length === 0) {
      await pool.query(`
        INSERT INTO interview_rounds (candidate_id, round_number, round_name, interview_date, expected_evaluations, status)
        VALUES (?, 1, 'Vòng 1 - Phỏng vấn chuyên môn', NOW(), 1, 'COMPLETED')
      `, [cId]);
    }
  }

  // 5. Seed evaluation sheets for candidates who don't have one yet
  const evalTemplates = [
    { cId: 2, score: 8.2, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Ứng viên nắm vững kiến thức backend, tư duy giải quyết vấn đề nhanh.', strengths: 'Kinh nghiệm RESTful API, Docker, MySQL tốt', weaknesses: 'Cần nâng cao thêm kiến thức về Message Queue' },
    { cId: 3, score: 8.5, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Kinh nghiệm thực chiến phong phú, khả năng tự học và nghiên cứu công nghệ mới rất tốt.', strengths: 'CI/CD, Kubernetes, Terraform', weaknesses: 'Chưa có nhiều kinh nghiệm về GCP' },
    { cId: 4, score: 7.5, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Giao tiếp khéo léo, nắm bắt tâm lý ứng viên tốt, có mạng lưới quan hệ trong ngành tuyển dụng.', strengths: 'Kỹ năng headhunt, phỏng vấn hành vi', weaknesses: 'Cần làm quen thêm với hệ thống ATS nội bộ' },
    { cId: 40, score: 7.5, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Nắm được các khái niệm cốt lõi, có động lực làm việc cao.', strengths: 'Chăm chỉ, nền tảng thuật toán tốt', weaknesses: 'Ít kinh nghiệm dự án quy mô lớn' },
    { cId: 41, score: 8.0, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Kỹ năng Frontend ổn định, hiểu sâu về CSS và UI component.', strengths: 'ReactJS, Redux, Clean Code', weaknesses: 'Cần rèn luyện thêm kỹ năng giao tiếp tiếng Anh' },
    { cId: 42, score: 7.2, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'CONSIDER', comment: 'Có tố chất tốt, cần đào tạo thêm về kiến trúc vi dịch vụ.', strengths: 'Ham học hỏi, nắm vững cú pháp JavaScript', weaknesses: 'Thiếu kinh nghiệm xử lý concurrency' },
    { cId: 43, score: 6.8, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'CONSIDER', comment: 'Kỹ năng cơ bản đạt mức chấp nhận được, có thể cân nhắc nếu dự án cần nhân sự junior.', strengths: 'Nhiệt tình, hòa đồng', weaknesses: 'Kỹ năng debug còn chậm' },
    { cId: 44, score: 8.5, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Kinh nghiệm nhân sự chuyên sâu, hiểu rõ luật lao động và quy trình tuyển dụng.', strengths: 'Quy trình nhân sự, tuyển dụng đa kênh', weaknesses: 'Không có điểm yếu đáng kể' },
    { cId: 45, score: 8.0, interId: 7, interName: 'Nguyễn Xuân Phú', interRole: 'Trưởng bộ phận Marketing', result: 'PASS', rec: 'RECOMMENDED', comment: 'Có tư duy digital marketing đa kênh, đã từng triển khai chiến dịch thành công.', strengths: 'Google Ads, Facebook Ads, phân tích số liệu', weaknesses: 'Chưa có nhiều kinh nghiệm về SEO kỹ thuật' },
    { cId: 50, score: 8.1, interId: 5, interName: 'Thàng Xuân Lập', interRole: 'Trưởng phòng Nhân sự', result: 'PASS', rec: 'RECOMMENDED', comment: 'Kiến thức kỹ thuật tốt, trả lời tự tin các câu hỏi hóc búa.', strengths: 'Database Optimization, Clean Architecture', weaknesses: 'Chưa quen với hạ tầng cloud công ty' },
    { cId: 53, score: 9.0, interId: 7, interName: 'Nguyễn Xuân Phú', interRole: 'Trưởng bộ phận Marketing', result: 'PASS', rec: 'RECOMMENDED', comment: 'Ứng viên đặc biệt xuất sắc, profile năng động và rất phù hợp văn hóa công ty.', strengths: 'Truyền thông sáng tạo, quản lý sự kiện, kỹ năng thuyết trình', weaknesses: 'Không có' },
    { cId: 54, score: 8.6, interId: 7, interName: 'Nguyễn Xuân Phú', interRole: 'Trưởng bộ phận Marketing', result: 'PASS', rec: 'RECOMMENDED', comment: 'Gu thẩm mỹ hiện đại, thành thạo Figma và bộ công cụ Adobe.', strengths: 'Thiết kế đồ họa, UI Design, Brand Identity', weaknesses: 'Cần nâng cao khả năng quản lý thời gian khi nhiều task' },
    { cId: 55, score: 5.5, interId: 7, interName: 'Nguyễn Xuân Phú', interRole: 'Trưởng bộ phận Marketing', result: 'FAIL', rec: 'NOT_RECOMMENDED', comment: 'Nội dung bài viết mẫu chưa đạt tiêu chuẩn, thiếu sáng tạo.', strengths: 'Thái độ tốt', weaknesses: 'Kỹ năng viết còn vụng, thiếu chiều sâu marketing' }
  ];

  for (const t of evalTemplates) {
    const [existing] = await pool.query('SELECT id FROM interview_evaluations WHERE candidate_id = ? AND round_number = 1', [t.cId]);
    if (existing.length === 0) {
      const [rounds] = await pool.query('SELECT id FROM interview_rounds WHERE candidate_id = ? AND round_number = 1 LIMIT 1', [t.cId]);
      const roundId = rounds[0]?.id || null;
      await pool.query(`
        INSERT INTO interview_evaluations (
          candidate_id, interviewer_id, round_number, round_id, interviewer_name, interviewer_role,
          overall_score, total_score, max_score, result, recommendation, status, comments, strengths, weaknesses, submitted_at
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 10.0, ?, ?, 'COMPLETED', ?, ?, ?, NOW())
      `, [t.cId, t.interId, roundId, t.interName, t.interRole, t.score, t.score, t.result, t.rec, t.comment, t.strengths, t.weaknesses]);
    }
  }

  console.log('--- ENRICHMENT COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

seedFullData().catch(e => { console.error(e); process.exit(1); });
