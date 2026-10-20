/**
 * schemaMigrations.js
 * Đảm bảo các bảng / cột cần cho Sprint 3-5 tồn tại.
 * Tất cả lệnh đều idempotent: chạy nhiều lần không gây lỗi, không xoá dữ liệu.
 *
 * Phục vụ các chức năng:
 *  - SCRUM-107: Luồng phê duyệt nhiều cấp theo hạn mức
 *  - SCRUM-116: Duyệt & xuất bản tin tuyển dụng
 *  - Trang việc làm công khai
 *  - Cảnh báo & gộp hồ sơ ứng viên trùng
 *  - Nhắc việc quá hạn SLA
 */

const { pool } = require('./database');

async function tableExists(table) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function getColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows[0] || null;
}

async function ensureColumn(table, column, definition) {
  if (!(await tableExists(table))) return;
  if (await getColumn(table, column)) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

/** Đổi cột ENUM sang VARCHAR để hỗ trợ thêm trạng thái mới mà không mất dữ liệu. */
async function ensureVarcharStatus(table, column, defaultValue) {
  const col = await getColumn(table, column);
  if (col && col.DATA_TYPE === 'enum') {
    await pool.query(
      `ALTER TABLE \`${table}\` MODIFY \`${column}\` VARCHAR(30) NOT NULL DEFAULT '${defaultValue}'`
    );
  }
}

async function ensureIndex(table, indexName, ddl) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  if (rows.length === 0) {
    await pool.query(ddl);
  }
}

async function runSchemaMigrations() {
  // ── Bảng nền tảng mà code hiện tại đã dùng nhưng DB có thể chưa có ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recruitment_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      department_id INT NULL,
      position_id INT NULL,
      headcount INT NULL,
      reason VARCHAR(100) NULL,
      proposed_salary_min DECIMAL(15,2) NULL,
      proposed_salary_max DECIMAL(15,2) NULL,
      needed_by_date DATE NULL,
      job_description TEXT NULL,
      candidate_requirements TEXT NULL,
      salary_explanation TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
      rejection_reason TEXT NULL,
      work_location_code VARCHAR(50) NULL,
      work_type_code VARCHAR(50) NULL,
      recruiter_id INT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('recruitment_requests', 'rejection_reason', 'TEXT NULL');
  await ensureColumn('recruitment_requests', 'work_location_code', 'VARCHAR(50) NULL');
  await ensureColumn('recruitment_requests', 'work_type_code', 'VARCHAR(50) NULL');
  await ensureColumn('recruitment_requests', 'recruiter_id', 'INT NULL');
  await ensureColumn('recruitment_requests', 'current_step', 'INT NULL');
  await ensureColumn('recruitment_requests', 'submitted_at', 'DATETIME NULL');
  // Bảng cũ có thể tạo status dạng ENUM -> chuyển VARCHAR để hỗ trợ NEEDS_REVISION (Yêu cầu bổ sung)
  await pool.query("ALTER TABLE recruitment_requests MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'NEW',
      source_code VARCHAR(50) NULL,
      rejection_reason_code VARCHAR(50) NULL,
      recruitment_request_id INT NULL,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Gộp hồ sơ trùng
  await ensureColumn('candidates', 'merged_into_id', 'INT NULL');
  await ensureColumn('candidates', 'merged_at', 'DATETIME NULL');
  await ensureColumn('candidates', 'resume_url', 'VARCHAR(500) NULL');
  await ensureColumn('candidates', 'rejection_reason', 'TEXT NULL');
  await ensureColumn('candidates', 'cv_file_path', 'VARCHAR(500) NULL');
  await ensureColumn('candidates', 'current_stage', "VARCHAR(50) NOT NULL DEFAULT 'NEW'");
  await ensureColumn('candidates', 'cover_letter', 'TEXT NULL');
  await ensureColumn('candidates', 'tracking_code', 'VARCHAR(50) NULL');
  await ensureColumn('candidates', 'parsed_skills', 'TEXT NULL');
  await ensureColumn('candidates', 'rating', 'INT DEFAULT 0');
  await ensureColumn('candidates', 'is_talent_pool', 'TINYINT(1) DEFAULT 0');
  await ensureColumn('candidates', 'tags', 'VARCHAR(500) NULL');
  // SLA
  await ensureColumn('candidates', 'stage_changed_at', 'DATETIME NULL');
  await ensureColumn('candidates', 'sla_overdue', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('candidates', 'sla_flagged_at', 'DATETIME NULL');
  await pool.query(
    `UPDATE candidates SET stage_changed_at = COALESCE(updated_at, created_at, NOW()) WHERE stage_changed_at IS NULL`
  );
  await ensureIndex('candidates', 'idx_candidates_email', 'CREATE INDEX idx_candidates_email ON candidates (email)');
  await ensureIndex('candidates', 'idx_candidates_phone', 'CREATE INDEX idx_candidates_phone ON candidates (phone)');

  // ── Ghi chú của Recruiter cho từng ứng viên ──
  // Cấu trúc khớp với database.sql (author_id, note_content); bổ sung cột theo dõi chỉnh sửa.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      author_id INT NOT NULL,
      note_content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_candidate_notes_candidate (candidate_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('candidate_notes', 'updated_by', 'INT NULL');
  await ensureColumn('candidate_notes', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stage_code VARCHAR(50) NOT NULL UNIQUE,
      stage_name VARCHAR(100) NOT NULL,
      stage_order INT NOT NULL,
      description TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('pipeline_stages', 'description', 'TEXT NULL');

  await pool.query(`
    INSERT IGNORE INTO pipeline_stages (stage_code, stage_name, stage_order) VALUES
    ('NEW', 'Ứng tuyển mới', 1),
    ('SCREENING', 'Sàng lọc hồ sơ', 2),
    ('INTERVIEW', 'Phỏng vấn', 3),
    ('OFFER', 'Đề nghị nhận việc', 4),
    ('HIRED', 'Đã tuyển dụng', 5),
    ('REJECTED', 'Không phù hợp', 6)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      author_id INT NOT NULL,
      note_content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_activities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      performed_by INT NULL,
      action_type VARCHAR(50) NOT NULL,
      details TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL UNIQUE,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until DATETIME NULL,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NULL,
      type VARCHAR(50) NULL,
      link VARCHAR(255) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notifications_user (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('notifications', 'type', 'VARCHAR(50) NULL');
  await ensureColumn('notifications', 'link', 'VARCHAR(255) NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_profile (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NULL,
      description TEXT NULL,
      logo_url VARCHAR(255) NULL,
      banner_url VARCHAR(255) NULL,
      website VARCHAR(255) NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (await tableExists('master_data')) {
    await ensureColumn('master_data', 'is_referenced', 'TINYINT(1) NOT NULL DEFAULT 0');
  }

  // ── SCRUM-107: Luồng phê duyệt nhiều cấp theo hạn mức ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      department_id INT NULL,
      min_salary DECIMAL(15,2) NULL,
      max_salary DECIMAL(15,2) NULL,
      step_number INT NOT NULL,
      approver_role_code VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('approval_workflows', 'step_name', 'VARCHAR(150) NULL');
  await ensureColumn('approval_workflows', 'step_description', 'VARCHAR(255) NULL');
  await ensureColumn('approval_workflows', 'updated_by', 'INT NULL');
  await ensureColumn('approval_workflows', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');
  const [workflowRows] = await pool.query('SELECT COUNT(*) AS total FROM approval_workflows');
  if (Number(workflowRows[0].total) === 0) {
    const [activeDirectorCount] = await pool.query(`
      SELECT COUNT(DISTINCT u.user_id) AS total
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE u.status = 'ACTIVE' AND r.role_code = 'APPROVER'
    `);
    if (Number(activeDirectorCount[0].total) > 0) {
      await pool.query(`
        INSERT INTO approval_workflows
          (department_id, step_number, step_name, approver_role_code, min_salary, max_salary)
        VALUES (NULL, 1, 'Giám đốc', 'APPROVER', 0, NULL)
      `);
    }
  }

  // Ảnh chụp (snapshot) chuỗi duyệt tại thời điểm gửi yêu cầu.
  // Nhờ snapshot, luồng đang chạy không bị ảnh hưởng khi cấu hình thay đổi.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recruitment_request_approval_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recruitment_request_id INT NOT NULL,
      step_number INT NOT NULL,
      step_name VARCHAR(150) NULL,
      approver_role_code VARCHAR(50) NOT NULL,
      threshold_min DECIMAL(15,2) NULL,
      threshold_max DECIMAL(15,2) NULL,
      is_escalated TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
      acted_by INT NULL,
      acted_at DATETIME NULL,
      comment TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rras_request (recruitment_request_id, step_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── SCRUM-116: Tin tuyển dụng ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS job_postings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      recruitment_request_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      requirements TEXT NULL,
      benefits TEXT NULL,
      work_location VARCHAR(255) NULL,
      job_type VARCHAR(100) NULL,
      salary_display VARCHAR(255) NULL,
      deadline DATE NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureVarcharStatus('job_postings', 'status', 'DRAFT');
  await ensureColumn('job_postings', 'review_note', 'TEXT NULL');
  await ensureColumn('job_postings', 'submitted_by', 'INT NULL');
  await ensureColumn('job_postings', 'submitted_at', 'DATETIME NULL');
  await ensureColumn('job_postings', 'reviewed_by', 'INT NULL');
  await ensureColumn('job_postings', 'reviewed_at', 'DATETIME NULL');
  await ensureColumn('job_postings', 'published_by', 'INT NULL');
  await ensureColumn('job_postings', 'published_at', 'DATETIME NULL');
  await ensureColumn('job_postings', 'closed_at', 'DATETIME NULL');
  await ensureColumn('job_postings', 'department_id', 'INT NULL');
  await ensureColumn('job_postings', 'hidden_by', 'INT NULL');
  await ensureColumn('job_postings', 'hidden_at', 'DATETIME NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      job_posting_id INT NOT NULL,
      recruitment_request_id INT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
      resume_url VARCHAR(500) NULL,
      cover_letter TEXT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_candidate_job_application (candidate_id, job_posting_id),
      INDEX idx_candidate_application_status (candidate_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_interviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NULL,
      mode VARCHAR(40) NOT NULL DEFAULT 'ONLINE',
      location VARCHAR(255) NULL,
      meeting_url VARCHAR(500) NULL,
      interviewer_name VARCHAR(150) NULL,
      notes TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
      candidate_response TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_candidate_interviews_application (application_id, starts_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id INT NOT NULL UNIQUE,
      salary_amount DECIMAL(15,2) NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'VND',
      start_date DATE NULL,
      response_deadline DATE NULL,
      message TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING_RESPONSE',
      candidate_response TEXT NULL,
      responded_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_candidate_offer_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NULL,
      type VARCHAR(40) NULL,
      link VARCHAR(255) NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_candidate_notifications (candidate_id, read_at, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Gộp hồ sơ trùng ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_merges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      primary_id INT NOT NULL,
      secondary_id INT NOT NULL,
      primary_snapshot JSON NULL,
      secondary_snapshot JSON NULL,
      chosen_fields JSON NULL,
      moved_children JSON NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      merged_by INT NOT NULL,
      merged_at DATETIME NOT NULL,
      undone_by INT NULL,
      undone_at DATETIME NULL,
      INDEX idx_cm_primary (primary_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── SLA ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sla_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stage_code VARCHAR(50) NOT NULL,
      max_days INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await ensureColumn('sla_configs', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
  await ensureColumn('sla_configs', 'updated_by', 'INT NULL');
  await ensureColumn('sla_configs', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP');
  // Loại bỏ bản ghi trùng stage_code (nếu có) trước khi tạo unique index
  await pool.query(`
    DELETE s1 FROM sla_configs s1
    JOIN sla_configs s2 ON s1.stage_code = s2.stage_code AND s1.id > s2.id
  `);
  await ensureIndex('sla_configs', 'uq_sla_stage', 'CREATE UNIQUE INDEX uq_sla_stage ON sla_configs (stage_code)');
  await pool.query(`
    INSERT IGNORE INTO sla_configs (stage_code, max_days) VALUES
      ('NEW', 3), ('INTERVIEWING', 7), ('OFFERED', 5)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sla_reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      recipient_id INT NOT NULL,
      stage_code VARCHAR(50) NOT NULL,
      reminder_date DATE NOT NULL,
      overdue_days INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sla_reminder_day (candidate_id, recipient_id, reminder_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_job_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      job_name VARCHAR(100) NOT NULL,
      run_date DATE NOT NULL,
      trigger_type VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
      summary TEXT NULL,
      UNIQUE KEY uq_job_day (job_name, run_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Candidate Application Tracking & Stage History ──
  await ensureColumn('candidate_applications', 'application_code', 'VARCHAR(50) NULL');
  await ensureIndex('candidate_applications', 'uq_cand_app_code', 'CREATE UNIQUE INDEX uq_cand_app_code ON candidate_applications (application_code)');
  await pool.query("UPDATE candidate_applications SET application_code = CONCAT('HS', DATE_FORMAT(applied_at, '%y%m'), '-', LPAD(id, 5, '0')) WHERE application_code IS NULL");

  await ensureColumn('candidates', 'application_code', 'VARCHAR(50) NULL');
  await ensureColumn('candidates', 'rejection_note', 'TEXT NULL');
  await ensureColumn('candidates', 'stage_changed_by', 'INT NULL');
  await pool.query("UPDATE candidates c JOIN candidate_applications ca ON ca.candidate_id = c.id SET c.application_code = ca.application_code WHERE c.application_code IS NULL");
  await pool.query("UPDATE candidates SET application_code = CONCAT('HS', DATE_FORMAT(COALESCE(created_at, NOW()), '%y%m'), '-', LPAD(id, 5, '0')) WHERE application_code IS NULL");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_stage_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      from_stage VARCHAR(50) NULL,
      to_stage VARCHAR(50) NOT NULL,
      rejection_reason_code VARCHAR(50) NULL,
      rejection_note TEXT NULL,
      changed_by INT NULL,
      changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_csh_candidate (candidate_id, changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Auto-seed Master Data (Candidate Sources) & Sample Job Positions / Recruitment Requests ──
  const defaultSources = [
    ['CANDIDATE_SOURCE', 'LINKEDIN', 'LinkedIn', 'Nguồn mạng xã hội LinkedIn', 1],
    ['CANDIDATE_SOURCE', 'TOPCV', 'TopCV', 'Trang tuyển dụng TopCV', 2],
    ['CANDIDATE_SOURCE', 'VIETNAMWORKS', 'VietnamWorks', 'Trang tuyển dụng VietnamWorks', 3],
    ['CANDIDATE_SOURCE', 'REFERRAL', 'Giới thiệu nội bộ', 'Nhân viên công ty giới thiệu', 4],
    ['CANDIDATE_SOURCE', 'FACEBOOK', 'Facebook', 'Mạng xã hội Facebook', 5],
    ['CANDIDATE_SOURCE', 'OTHER', 'Nguồn khác', 'Nguồn tuyển dụng khác', 6]
  ];
  for (const s of defaultSources) {
    await pool.query(
      `INSERT IGNORE INTO master_data (category_group, code, name, description, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      s
    );
  }

  // Seed sample positions if empty
  const [positionsCount] = await pool.query('SELECT COUNT(*) as cnt FROM job_positions');
  if (Number(positionsCount[0]?.cnt || 0) === 0) {
    await pool.query(`
      INSERT IGNORE INTO job_positions (position_code, position_name, position_level, min_salary, max_salary, status) VALUES
      ('FE_DEV', 'Frontend Developer', 'Middle', 15000000, 25000000, 'ACTIVE'),
      ('BE_DEV', 'Backend Developer', 'Senior', 20000000, 35000000, 'ACTIVE'),
      ('FULLSTACK_DEV', 'Fullstack Developer', 'Senior', 22000000, 38000000, 'ACTIVE'),
      ('HR_EXEC', 'HR Executive', 'Junior', 10000000, 16000000, 'ACTIVE'),
      ('TESTER_QA', 'Tester / QA', 'Middle', 12000000, 20000000, 'ACTIVE')
    `);
  }

  // Seed sample recruitment requests if empty
  const [requestsCount] = await pool.query('SELECT COUNT(*) as cnt FROM recruitment_requests');
  if (Number(requestsCount[0]?.cnt || 0) === 0) {
    const [itDept] = await pool.query("SELECT department_id FROM departments WHERE department_code = 'IT' LIMIT 1");
    const [hrDept] = await pool.query("SELECT department_id FROM departments WHERE department_code = 'HR' LIMIT 1");
    const [posList] = await pool.query("SELECT position_id, position_code FROM job_positions");
    const deptId = itDept[0]?.department_id || 1;
    const hrId = hrDept[0]?.department_id || 2;
    for (const p of posList) {
      await pool.query(`
        INSERT INTO recruitment_requests 
          (department_id, position_id, headcount, reason, status, created_by)
        VALUES (?, ?, 2, 'Tuyển dụng nhân sự cho dự án mới', 'APPROVED', 1)
      `, [p.position_code === 'HR_EXEC' ? hrId : deptId, p.position_id]);
    }
  }

  // Seed default rejection reasons in master_data if empty
  const [reasonsCount] = await pool.query("SELECT COUNT(*) as cnt FROM master_data WHERE category_group = 'REJECTION_REASON'");
  if (Number(reasonsCount[0]?.cnt || 0) === 0) {
    await pool.query(`
      INSERT IGNORE INTO master_data (category_group, code, name, description, display_order, is_active) VALUES
      ('REJECTION_REASON', 'LACK_EXPERIENCE', 'Thiếu kinh nghiệm / Chuyên môn', 'Ứng viên không đáp ứng đủ yêu cầu về kinh nghiệm hoặc kỹ năng chuyên môn.', 1, 1),
      ('REJECTION_REASON', 'FAIL_TEST', 'Không đạt Bài test / Ngoại ngữ', 'Ứng viên không vượt qua bài kiểm tra năng lực hoặc yêu cầu ngoại ngữ.', 2, 1),
      ('REJECTION_REASON', 'HIGH_SALARY', 'Kỳ vọng lương quá cao', 'Mức lương kỳ vọng của ứng viên vượt quá ngân sách của công ty.', 3, 1),
      ('REJECTION_REASON', 'NOT_FIT_CULTURE', 'Không hợp Văn hóa / Thái độ', 'Ứng viên có thái độ không phù hợp hoặc không hợp với văn hóa công ty.', 4, 1),
      ('REJECTION_REASON', 'NO_SHOW', 'Bỏ lịch phỏng vấn (No-show)', 'Ứng viên không đến tham gia phỏng vấn như lịch đã hẹn.', 5, 1),
      ('REJECTION_REASON', 'WITHDRAW', 'Ứng viên tự rút / Nhận việc khác', 'Ứng viên chủ động rút lui hoặc đã nhận được lời mời làm việc từ công ty khác.', 6, 1),
      ('REJECTION_REASON', 'CANNOT_CONTACT', 'Không liên lạc được', 'Không thể liên lạc được với ứng viên qua điện thoại hoặc email.', 7, 1),
      ('REJECTION_REASON', 'OTHER', 'Lý do khác (Tự nhập)', 'Lý do đánh trượt khác do người dùng tự nhập', 8, 1)
    `);
  }

  // Seed default interview rooms in master_data if empty
  const [roomsCount] = await pool.query("SELECT COUNT(*) as cnt FROM master_data WHERE category_group = 'INTERVIEW_ROOM'");
  if (Number(roomsCount[0]?.cnt || 0) === 0) {
    await pool.query(`
      INSERT IGNORE INTO master_data (category_group, code, name, description, display_order, is_active) VALUES
      ('INTERVIEW_ROOM', 'ROOM_101', 'Phòng Phỏng Vấn 1 (Tầng 2)', 'Phòng phỏng vấn trực tiếp số 1', 1, 1),
      ('INTERVIEW_ROOM', 'ROOM_102', 'Phòng Phỏng Vấn 2 (Tầng 2)', 'Phòng phỏng vấn trực tiếp số 2', 2, 1),
      ('INTERVIEW_ROOM', 'ROOM_ONLINE', 'Phòng Họp Trực Tuyến (Google Meet)', 'Phòng phỏng vấn online qua Google Meet / Teams', 3, 1),
      ('INTERVIEW_ROOM', 'ROOM_VIP', 'Phòng Họp Ban Giám Đốc (Tầng 3)', 'Phòng phỏng vấn vòng cuối với Ban Giám Đốc', 4, 1)
    `);
  }

  // Ensure candidate_ratings table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      reviewer_id INT NOT NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_cr_candidate_reviewer UNIQUE (candidate_id, reviewer_id),
      CONSTRAINT chk_cr_rating CHECK (rating BETWEEN 1 AND 5),
      CONSTRAINT fk_cr_candidate FOREIGN KEY (candidate_id)
          REFERENCES candidates(id) ON DELETE CASCADE,
      CONSTRAINT fk_cr_reviewer FOREIGN KEY (reviewer_id)
          REFERENCES users(user_id) ON DELETE RESTRICT,
      INDEX idx_cr_reviewer (reviewer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Ensure JOB_POSTING_CLOSE permission exists and assigned to ADMIN & RECRUITER
  await pool.query(`
    INSERT IGNORE INTO permissions (permission_code, permission_name, description)
    VALUES ('JOB_POSTING_CLOSE', 'Ẩn / Gỡ tin tuyển dụng', 'Cho phép ẩn và gỡ tin tuyển dụng')
  `);
  const [jpPerm] = await pool.query("SELECT permission_id FROM permissions WHERE permission_code = 'JOB_POSTING_CLOSE'");
  if (jpPerm.length > 0) {
    await pool.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?), (3, ?)', [jpPerm[0].permission_id, jpPerm[0].permission_id]);
  }
}

module.exports = { runSchemaMigrations 
  // ── SPRINT: ĐÁNH GIÁ PHỎNG VẤN VÀ QUYẾT ĐỊNH CỦA TRƯỞNG BỘ PHẬN ──
  await ensureColumn('candidates', 'interview_decision', 'VARCHAR(30) NULL');
  await ensureColumn('candidates', 'interview_decision_by', 'INT NULL');
  await ensureColumn('candidates', 'interview_decision_at', 'DATETIME NULL');
  await ensureColumn('candidates', 'interview_decision_comment', 'TEXT NULL');

  // Gán manager_user_id cho các phòng ban nếu chưa có
  await pool.query(`UPDATE departments SET manager_user_id = 4 WHERE department_id = 1 AND manager_user_id IS NULL`);
  await pool.query(`UPDATE departments SET manager_user_id = 7 WHERE department_id = 4 AND manager_user_id IS NULL`);

  // Bảng Vòng phỏng vấn (interview_rounds)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_rounds (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT NOT NULL,
      round_number INT NOT NULL,
      round_name VARCHAR(150) NOT NULL,
      interview_date DATETIME NULL,
      expected_evaluations INT NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cand_round (candidate_id, round_number),
      INDEX idx_round_candidate (candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bảng Phiếu đánh giá phỏng vấn (interview_evaluations) - mỗi phiếu có ID duy nhất, không đếm trùng
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_evaluations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      round_id INT NOT NULL,
      candidate_id INT NOT NULL,
      interviewer_id INT NULL,
      interviewer_name VARCHAR(150) NOT NULL,
      interviewer_role VARCHAR(100) NULL,
      overall_score DECIMAL(5,2) NULL,
      max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      result VARCHAR(30) NOT NULL DEFAULT 'PASS',
      comments TEXT NULL,
      strengths TEXT NULL,
      weaknesses TEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
      submitted_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_eval_round (round_id),
      INDEX idx_eval_cand (candidate_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bảng Tiêu chí đánh giá chi tiết của từng phiếu (interview_evaluation_criteria)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_evaluation_criteria (
      id INT AUTO_INCREMENT PRIMARY KEY,
      evaluation_id INT NOT NULL,
      criteria_name VARCHAR(150) NOT NULL,
      weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
      score DECIMAL(5,2) NOT NULL,
      max_score DECIMAL(5,2) NOT NULL DEFAULT 10.00,
      note TEXT NULL,
      INDEX idx_crit_eval (evaluation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bổ sung các cột cho candidate_offers để liên kết trực tiếp ứng viên và người tạo
  await pool.query(`ALTER TABLE candidate_offers MODIFY COLUMN application_id INT NULL`);
  await ensureColumn('candidate_offers', 'candidate_id', 'INT NULL');
  await ensureColumn('candidate_offers', 'position_id', 'INT NULL');
  await ensureColumn('candidate_offers', 'created_by', 'INT NULL');
  await ensureColumn('candidate_offers', 'note', 'TEXT NULL');
  await ensureIndex('candidate_offers', 'idx_cand_offer_cand_id', 'CREATE INDEX idx_cand_offer_cand_id ON candidate_offers (candidate_id)');

}
;
