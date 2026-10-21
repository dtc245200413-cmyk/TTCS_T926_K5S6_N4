const { pool } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function seedTestData() {
  console.log('Seeding test data for Offer workflow...');

  // 1. Ensure candidates exist
  const candidatesData = [
    [1, 'Trần Văn Mạnh', 'manh.tran@gmail.com', '0912345671', 'OFFERED', 'UV-2026-0001'],
    [2, 'Nguyễn Quỳnh Anh', 'quynhanh.nguyen@gmail.com', '0912345672', 'OFFERED', 'UV-2026-0002'],
    [3, 'Đặng Tuấn Kiệt', 'tuankiet.dang@gmail.com', '0912345673', 'OFFERED', 'UV-2026-0003'],
    [4, 'Lê Hoàng Yến Nhi', 'yennhi.le@gmail.com', '0912345674', 'OFFERED', 'UV-2026-0004']
  ];

  for (const c of candidatesData) {
    await pool.execute(`
      INSERT INTO candidates (id, full_name, email, phone, status, application_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone)
    `, c);
  }

  // 2. Candidate accounts
  const hash = await bcrypt.hash('123456', 10);
  const candidateAccounts = [
    [2, 'quynhanh.nguyen@gmail.com'],
    [1, 'manh.tran@gmail.com']
  ];

  for (const [candId, email] of candidateAccounts) {
    await pool.execute(`
      INSERT INTO candidate_accounts (candidate_id, email, password_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'ACTIVE'
    `, [candId, email, hash]);
  }

  // 3. Clear existing approvals and onboardings for clean test
  await pool.execute('DELETE FROM offer_approvals');
  await pool.execute('DELETE FROM candidate_onboardings');

  // 4. Seed Offers meeting ALL test requirements:
  // - Ít nhất 2 Offer ở trạng thái 'Chờ duyệt' (PENDING_APPROVAL)
  // - 1 Offer 'Đã duyệt' (APPROVED) để Recruiter phát hành
  // - 1 Offer 'Đã phát hành' (SENT) cho ứng viên Quỳnh Anh
  // - 1 Offer 'Hết hạn' (EXPIRED) cho ứng viên Quỳnh Anh test chặn
  const offersData = [
    {
      id: 1,
      offer_code: 'OFF-202610-0001',
      candidate_id: 1,
      department_id: 2,
      position_id: 2,
      job_title: 'Frontend Developer (ReactJS)',
      basic_salary: 25000000,
      salary_amount: 25000000,
      probation_salary: 21250000,
      probation_period_months: 2,
      currency: 'VND',
      expected_start_date: '2026-11-15',
      response_deadline: '2026-11-10',
      work_location: 'Tầng 8, Tòa nhà TechCorp, Hà Nội',
      benefits: 'Thưởng hiệu quả hàng quý, Bảo hiểm sức khỏe PTI cao cấp, 15 ngày phép/năm',
      message: 'Chào mừng bạn gia nhập đội ngũ Frontend chuyên nghiệp tại TechCorp.',
      status: 'PENDING_APPROVAL',
      created_by: 3
    },
    {
      id: 2,
      offer_code: 'OFF-202610-0002',
      candidate_id: 4,
      department_id: 1,
      position_id: 4,
      job_title: 'Chuyên viên Tuyển dụng Cao cấp (Senior Recruiter)',
      basic_salary: 19500000,
      salary_amount: 19500000,
      probation_salary: 16500000,
      probation_period_months: 2,
      currency: 'VND',
      expected_start_date: '2026-11-20',
      response_deadline: '2026-11-12',
      work_location: 'Tầng 8, Tòa nhà TechCorp, Hà Nội',
      benefits: 'Thưởng tuyển dụng theo KPI, Máy tính xách tay MacBook Pro, Phụ cấp điện thoại',
      message: 'Chúng tôi rất ấn tượng với kinh nghiệm tuyển dụng công nghệ của bạn.',
      status: 'PENDING_APPROVAL',
      created_by: 3
    },
    {
      id: 3,
      offer_code: 'OFF-202610-0003',
      candidate_id: 3,
      department_id: 2,
      position_id: 1,
      job_title: 'DevOps & Cloud Engineer',
      basic_salary: 32000000,
      salary_amount: 32000000,
      probation_salary: 27200000,
      probation_period_months: 2,
      currency: 'VND',
      expected_start_date: '2026-12-01',
      response_deadline: '2026-11-25',
      work_location: 'Tầng 8, Tòa nhà TechCorp, Hà Nội',
      benefits: 'Tài trợ 100% chi phí chứng chỉ AWS/GCP, Thưởng dự án, Khám sức khỏe định kỳ',
      message: 'Vị trí này sẽ đóng vai trò then chốt trong hạ tầng Cloud của TechCorp.',
      status: 'APPROVED',
      created_by: 3
    },
    {
      id: 4,
      offer_code: 'OFF-202610-0004',
      candidate_id: 2,
      department_id: 2,
      position_id: 1,
      job_title: 'Senior Backend Developer (Node.js/Go)',
      basic_salary: 28000000,
      salary_amount: 28000000,
      probation_salary: 23800000,
      probation_period_months: 2,
      currency: 'VND',
      expected_start_date: '2026-12-01',
      response_deadline: '2026-12-31',
      work_location: 'Tầng 8, Tòa nhà TechCorp, Hà Nội',
      benefits: 'Lương tháng 13 + thưởng thành tích 2-3 tháng, Gói bảo hiểm sức khỏe cho người thân',
      message: 'Chúc mừng Quỳnh Anh! Ban Giám đốc đã chính thức phê duyệt đề xuất tuyển dụng vị trí Senior Backend Developer dành cho bạn.',
      status: 'SENT',
      created_by: 3
    },
    {
      id: 5,
      offer_code: 'OFF-202610-0005',
      candidate_id: 2,
      department_id: 2,
      position_id: 2,
      job_title: 'UI/UX Product Designer',
      basic_salary: 22000000,
      salary_amount: 22000000,
      probation_salary: 18700000,
      probation_period_months: 2,
      currency: 'VND',
      expected_start_date: '2025-01-15',
      response_deadline: '2025-01-01',
      work_location: 'Tầng 8, Tòa nhà TechCorp, Hà Nội',
      benefits: 'Trang bị iMac 27 inch, Khóa đào tạo thiết kế quốc tế',
      message: 'Thư mời thử nghiệm đã quá hạn phản hồi.',
      status: 'SENT',
      created_by: 3
    }
  ];

  for (const o of offersData) {
    await pool.execute(`
      INSERT INTO candidate_offers (
        id, offer_code, candidate_id, department_id, position_id, job_title, basic_salary, salary_amount, probation_salary,
        probation_period_months, currency, expected_start_date, response_deadline, work_location, benefits,
        message, status, created_by, submitted_at, approved_at, sent_to_candidate_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(),
        ${o.status === 'APPROVED' || o.status === 'SENT' ? 'NOW()' : 'NULL'},
        ${o.status === 'SENT' ? 'NOW()' : 'NULL'},
        NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        offer_code = VALUES(offer_code),
        candidate_id = VALUES(candidate_id),
        department_id = VALUES(department_id),
        position_id = VALUES(position_id),
        job_title = VALUES(job_title),
        basic_salary = VALUES(basic_salary),
        salary_amount = VALUES(salary_amount),
        probation_salary = VALUES(probation_salary),
        probation_period_months = VALUES(probation_period_months),
        currency = VALUES(currency),
        expected_start_date = VALUES(expected_start_date),
        response_deadline = VALUES(response_deadline),
        work_location = VALUES(work_location),
        benefits = VALUES(benefits),
        message = VALUES(message),
        status = VALUES(status),
        created_by = VALUES(created_by),
        approved_at = VALUES(approved_at),
        sent_to_candidate_at = VALUES(sent_to_candidate_at),
        candidate_response = NULL,
        responded_at = NULL,
        updated_at = NOW()
    `, [
      o.id, o.offer_code, o.candidate_id, o.department_id, o.position_id, o.job_title, o.basic_salary, o.salary_amount,
      o.probation_salary, o.probation_period_months, o.currency, o.expected_start_date, o.response_deadline,
      o.work_location, o.benefits, o.message, o.status, o.created_by
    ]);
  }

  // Insert initial approval history for Offer 3 (APPROVED)
  await pool.execute(`
    INSERT INTO offer_approvals (offer_id, approver_id, action, reason, action_at)
    VALUES (3, 6, 'APPROVED', 'Đồng ý phê duyệt tuyển dụng mức lương 32 triệu.', NOW())
  `);

  console.log('Seed test data completed successfully!');
  process.exit(0);
}

seedTestData().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
