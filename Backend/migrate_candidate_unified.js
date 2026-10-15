const { pool } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function migrateCandidateUnified() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Starting candidate & unified profile migration...');
    await connection.beginTransaction();

    // 1. Add recruiter_id to recruitment_requests if not exists
    const [rrCols] = await connection.query(`SHOW COLUMNS FROM recruitment_requests LIKE 'recruiter_id'`);
    if (rrCols.length === 0) {
      await connection.query(`ALTER TABLE recruitment_requests ADD COLUMN recruiter_id INT NULL`);
      console.log('Added recruiter_id to recruitment_requests');
    }

    // 2. Create or update candidates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        status ENUM('NEW', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED') DEFAULT 'NEW',
        current_stage VARCHAR(50) DEFAULT 'NEW',
        source_code VARCHAR(50),
        rejection_reason_code VARCHAR(50),
        recruitment_request_id INT NULL,
        cv_file_path VARCHAR(255) NULL,
        cover_letter TEXT NULL,
        tracking_code VARCHAR(50) UNIQUE NULL,
        is_withdrawn BOOLEAN DEFAULT FALSE,
        referrer_employee_id INT NULL,
        parsed_skills TEXT NULL,
        rating INT NULL,
        is_talent_pool BOOLEAN DEFAULT FALSE,
        tags TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE SET NULL
      )
    `);

    // Ensure all columns exist on candidates
    const checkColumns = [
      { name: 'current_stage', query: `ALTER TABLE candidates ADD COLUMN current_stage VARCHAR(50) DEFAULT 'NEW'` },
      { name: 'cv_file_path', query: `ALTER TABLE candidates ADD COLUMN cv_file_path VARCHAR(255) NULL` },
      { name: 'cover_letter', query: `ALTER TABLE candidates ADD COLUMN cover_letter TEXT NULL` },
      { name: 'tracking_code', query: `ALTER TABLE candidates ADD COLUMN tracking_code VARCHAR(50) UNIQUE NULL` },
      { name: 'is_withdrawn', query: `ALTER TABLE candidates ADD COLUMN is_withdrawn BOOLEAN DEFAULT FALSE` },
      { name: 'referrer_employee_id', query: `ALTER TABLE candidates ADD COLUMN referrer_employee_id INT NULL` },
      { name: 'parsed_skills', query: `ALTER TABLE candidates ADD COLUMN parsed_skills TEXT NULL` },
      { name: 'rating', query: `ALTER TABLE candidates ADD COLUMN rating INT NULL` },
      { name: 'is_talent_pool', query: `ALTER TABLE candidates ADD COLUMN is_talent_pool BOOLEAN DEFAULT FALSE` },
      { name: 'tags', query: `ALTER TABLE candidates ADD COLUMN tags TEXT NULL` }
    ];

    for (const col of checkColumns) {
      const [hasCol] = await connection.query(`SHOW COLUMNS FROM candidates LIKE '${col.name}'`);
      if (hasCol.length === 0) {
        await connection.query(col.query);
        console.log(`Added column ${col.name} to candidates`);
      }
    }

    // 3. Create pipeline_stages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pipeline_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stage_code VARCHAR(50) UNIQUE NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        stage_order INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    await connection.query(`
      INSERT IGNORE INTO pipeline_stages (stage_code, stage_name, stage_order) VALUES
      ('NEW', 'Hồ sơ mới', 1),
      ('SCREENING', 'Sàng lọc hồ sơ', 2),
      ('INTERVIEW', 'Phỏng vấn', 3),
      ('OFFER', 'Đề xuất (Offer)', 4),
      ('HIRED', 'Nhận việc (Hired)', 5),
      ('REJECTED', 'Không phù hợp (Rejected)', 6)
    `);

    // 4. Create candidate_notes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidate_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        author_id INT NOT NULL,
        note_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(user_id)
      )
    `);

    // 5. Create candidate_activities table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS candidate_activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        performed_by INT NULL,
        action_type VARCHAR(100) NOT NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      )
    `);

    // Ensure uploads/cvs directory exists
    const cvsDir = path.join(__dirname, 'uploads', 'cvs');
    fs.mkdirSync(cvsDir, { recursive: true });

    // Create a mock sample CV PDF / HTML file if not exists
    const sampleCvPath = path.join(cvsDir, 'sample_cv_nguyen_van_an.pdf');
    if (!fs.existsSync(sampleCvPath)) {
      // Create a valid minimal PDF file
      const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 205 >> stream
BT
/F1 20 Tf
50 720 Td
(CURRICULUM VITAE - NGUYEN VAN AN) Tj
/F1 12 Tf
0 -35 Td
(Full-stack Web Developer | 3+ Years Experience) Tj
0 -25 Td
(Email: an.nguyen@gmail.com | Phone: 0912345678) Tj
0 -25 Td
(Skills: React, Node.js, Express, MySQL, TypeScript, Docker, REST API) Tj
0 -25 Td
(Education: Bachelor of Software Engineering - ICTU) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000502 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
571
%%EOF`;
      fs.writeFileSync(sampleCvPath, minimalPdf);
      console.log('Sample CV PDF generated at:', sampleCvPath);
    }

    // 6. Check users and recruitment requests to link sample candidates
    const [users] = await connection.query(`SELECT user_id, full_name, company_email FROM users LIMIT 5`);
    const recruiter = users.find(u => u.company_email.includes('245200344') || u.company_email.includes('003')) || users[0];
    const hiringManager = users.find(u => u.company_email.includes('004') || u.company_email.includes('007')) || users[1] || users[0];

    // Ensure sample recruitment requests exist
    const [jobs] = await connection.query(`SELECT position_id FROM job_positions LIMIT 2`);
    const [depts] = await connection.query(`SELECT department_id FROM departments LIMIT 2`);

    let req1Id, req2Id;
    const [existingReqs] = await connection.query(`SELECT id FROM recruitment_requests LIMIT 2`);
    if (existingReqs.length < 2 && jobs.length > 0 && depts.length > 0) {
      const [r1] = await connection.query(`
        INSERT INTO recruitment_requests 
          (department_id, position_id, recruiter_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, status, created_by)
        VALUES 
          (?, ?, ?, 2, 'Tăng mới', 15000000, 25000000, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'Tuyển Senior Fullstack Developer có kinh nghiệm React và Node.js', 'APPROVED', ?)
      `, [depts[0].department_id, jobs[0].position_id, recruiter.user_id, hiringManager.user_id]);
      req1Id = r1.insertId;

      const [r2] = await connection.query(`
        INSERT INTO recruitment_requests 
          (department_id, position_id, recruiter_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, status, created_by)
        VALUES 
          (?, ?, ?, 1, 'Thay thế', 10000000, 18000000, DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY), 'Tuyển Frontend Developer làm việc với React và Tailwind', 'APPROVED', ?)
      `, [depts[0].department_id, jobs[jobs.length > 1 ? 1 : 0].position_id, recruiter.user_id, hiringManager.user_id]);
      req2Id = r2.insertId;
      console.log('Sample recruitment requests created:', req1Id, req2Id);
    } else if (existingReqs.length > 0) {
      req1Id = existingReqs[0].id;
      req2Id = existingReqs[1] ? existingReqs[1].id : req1Id;
      await connection.query(`UPDATE recruitment_requests SET recruiter_id = ? WHERE recruiter_id IS NULL`, [recruiter.user_id]);
    }

    // 7. Seed sample candidate with MULTIPLE application history records (same email: an.nguyen@gmail.com)
    const [existingCandidates] = await connection.query(`SELECT id FROM candidates WHERE email = 'an.nguyen@gmail.com'`);
    if (existingCandidates.length === 0) {
      // Historical Application 1: Applied in past for Frontend Developer, status REJECTED
      const [c1] = await connection.query(`
        INSERT INTO candidates 
          (full_name, email, phone, status, current_stage, source_code, rejection_reason_code, recruitment_request_id, cv_file_path, cover_letter, tracking_code, parsed_skills, rating, is_talent_pool, tags, created_by, created_at)
        VALUES 
          (?, ?, ?, 'REJECTED', 'REJECTED', 'LINKEDIN', 'NOT_MATCH_SKILL', ?, '/uploads/cvs/sample_cv_nguyen_van_an.pdf', 'Tôi rất mong muốn ứng tuyển vị trí Frontend Developer năm trước.', 'TRK-2025-001', 'JavaScript, HTML, CSS, React cơ bản', 3, 1, 'Frontend,Đã phỏng vấn đợt 1', ?, DATE_SUB(NOW(), INTERVAL 6 MONTH))
      `, ['Nguyễn Văn An', 'an.nguyen@gmail.com', '0912345678', req2Id || null, recruiter.user_id]);

      const c1Id = c1.insertId;
      await connection.query(`
        INSERT INTO candidate_notes (candidate_id, author_id, note_content, created_at) VALUES 
        (?, ?, 'Ứng viên kiến thức cơ bản tốt, nhưng kinh nghiệm dự án thực tế còn thiếu. Lưu vào Talent Pool để liên hệ lại khi mở vị trí mới.', DATE_SUB(NOW(), INTERVAL 6 MONTH))
      `, [c1Id, recruiter.user_id]);

      await connection.query(`
        INSERT INTO candidate_activities (candidate_id, performed_by, action_type, details, created_at) VALUES 
        (?, ?, 'APPLIED', 'Ứng viên nộp hồ sơ qua LinkedIn', DATE_SUB(NOW(), INTERVAL 6 MONTH)),
        (?, ?, 'STAGE_CHANGED', 'Chuyển trạng thái sang Phỏng vấn vòng 1', DATE_SUB(NOW(), INTERVAL 5 MONTH)),
        (?, ?, 'STAGE_CHANGED', 'Đánh trượt: Không phù hợp kỹ năng lúc đó', DATE_SUB(NOW(), INTERVAL 5 MONTH))
      `, [c1Id, recruiter.user_id, c1Id, recruiter.user_id, c1Id, recruiter.user_id]);

      // Current Application 2: Applied currently for Senior Fullstack Developer, status INTERVIEWING
      const [c2] = await connection.query(`
        INSERT INTO candidates 
          (full_name, email, phone, status, current_stage, source_code, recruitment_request_id, cv_file_path, cover_letter, tracking_code, parsed_skills, rating, is_talent_pool, tags, created_by, created_at)
        VALUES 
          (?, ?, ?, 'INTERVIEWING', 'INTERVIEW', 'REFERRAL', ?, '/uploads/cvs/sample_cv_nguyen_van_an.pdf', 'Xin chào, tôi đã nâng cao năng lực trong 6 tháng qua với các dự án React và NodeJS quy mô lớn. Kính gửi quý công ty xem xét hồ sơ ứng tuyển vị trí Senior.', 'TRK-2026-889', 'React, NodeJS, Express, TypeScript, Docker, Microservices, CI/CD, MySQL, Redis', 5, 1, 'Fullstack,Senior,Tiềm năng cao,Tiếng Anh Tốt', ?, NOW())
      `, ['Nguyễn Văn An', 'an.nguyen@gmail.com', '0912345678', req1Id || null, recruiter.user_id]);

      const c2Id = c2.insertId;
      await connection.query(`
        INSERT INTO candidate_notes (candidate_id, author_id, note_content, created_at) VALUES 
        (?, ?, 'Ứng viên đã tiến bộ vượt bậc sau 6 tháng. Đã lead 2 dự án thương mại điện tử lớn. Coding test đạt 95/100.', NOW()),
        (?, ?, 'Phỏng vấn kỹ thuật rất ấn tượng. Khả năng giải quyết vấn đề và kiến trúc hệ thống vững vàng. Đề xuất chuyển vòng Offer.', NOW())
      `, [c2Id, recruiter.user_id, c2Id, hiringManager.user_id]);

      await connection.query(`
        INSERT INTO candidate_activities (candidate_id, performed_by, action_type, details, created_at) VALUES 
        (?, ?, 'APPLIED', 'Ứng viên nộp hồ sơ đợt mới (Giới thiệu nội bộ)', DATE_SUB(NOW(), INTERVAL 7 DAY)),
        (?, ?, 'STAGE_CHANGED', 'Recruiter chuyển sang Sàng lọc hồ sơ (SCREENING)', DATE_SUB(NOW(), INTERVAL 5 DAY)),
        (?, ?, 'RATED', 'Đánh giá năng lực: 5 sao (Xuất sắc)', DATE_SUB(NOW(), INTERVAL 4 DAY)),
        (?, ?, 'STAGE_CHANGED', 'Chuyển sang Phỏng vấn chuyên môn (INTERVIEW)', DATE_SUB(NOW(), INTERVAL 2 DAY)),
        (?, ?, 'NOTE_ADDED', 'Thêm nhận xét kết quả phỏng vấn kỹ thuật', NOW())
      `, [c2Id, recruiter.user_id, c2Id, recruiter.user_id, c2Id, recruiter.user_id, c2Id, recruiter.user_id, c2Id, hiringManager.user_id]);

      // Seed candidate 3: Trần Thị Bích (Fresh candidate)
      const [c3] = await connection.query(`
        INSERT INTO candidates 
          (full_name, email, phone, status, current_stage, source_code, recruitment_request_id, cv_file_path, cover_letter, tracking_code, parsed_skills, rating, is_talent_pool, tags, created_by, created_at)
        VALUES 
          (?, ?, ?, 'NEW', 'NEW', 'FACEBOOK', ?, '/uploads/cvs/sample_cv_nguyen_van_an.pdf', 'Tôi quan tâm đến vị trí tuyển dụng của công ty.', 'TRK-2026-901', 'Figma, UI/UX, CSS3, Wireframe, Prototyping', 4, 0, 'UI/UX,Junior,Giao tiếp tốt', ?, NOW())
      `, ['Trần Thị Bích Ngọc', 'bichngoc.tran@gmail.com', '0987654321', req2Id || null, recruiter.user_id]);
      const c3Id = c3.insertId;

      await connection.query(`
        INSERT INTO candidate_notes (candidate_id, author_id, note_content, created_at) VALUES 
        (?, ?, 'Portfolio thiết kế sạch sẽ, tư duy thẩm mỹ hiện đại. Cần hẹn phỏng vấn vòng 1.', NOW())
      `, [c3Id, recruiter.user_id]);

      await connection.query(`
        INSERT INTO candidate_activities (candidate_id, performed_by, action_type, details, created_at) VALUES 
        (?, ?, 'APPLIED', 'Ứng viên nộp CV qua Facebook Ads', NOW())
      `, [c3Id, recruiter.user_id]);

      console.log('Sample candidates seeded successfully!');
    }

    await connection.commit();
    console.log(' Migration candidate unified completed successfully!');
  } catch (error) {
    await connection.rollback();
    console.error(' Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateCandidateUnified();

