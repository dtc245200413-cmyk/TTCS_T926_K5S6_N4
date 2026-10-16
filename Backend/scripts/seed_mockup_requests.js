const { pool } = require('../src/config/database');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const passwordHash = await bcrypt.hash('123456', 10);
    const recruiters = [
      { code: 'EMP-REC-01', email: 'tranlan@techcorp.vn', name: 'Trần Thị Lan', phone: '0912345671' },
      { code: 'EMP-REC-02', email: 'hoangphuong@techcorp.vn', name: 'Hoàng Phương', phone: '0912345672' },
      { code: 'EMP-REC-03', email: 'thutrang@techcorp.vn', name: 'Đỗ Thu Trang', phone: '0912345673' },
      { code: 'EMP-REC-04', email: 'vanhung@techcorp.vn', name: 'Nguyễn Văn Hùng', phone: '0912345674' }
    ];

    const [roleRow] = await pool.execute("SELECT role_id FROM roles WHERE role_code = 'RECRUITER'");
    const recruiterRoleId = roleRow[0]?.role_id || 3;

    for (const r of recruiters) {
      const [existing] = await pool.execute('SELECT user_id FROM users WHERE company_email = ?', [r.email]);
      let uId;
      if (existing.length === 0) {
        const [res] = await pool.execute(
          'INSERT INTO users (employee_code, full_name, company_email, phone_number, password_hash, job_title, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.code, r.name, r.email, r.phone, passwordHash, 'Nhân viên Tuyển dụng', 'ACTIVE']
        );
        uId = res.insertId;
        await pool.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [uId, recruiterRoleId]);
        console.log('Created recruiter:', r.name, uId);
      } else {
        uId = existing[0].user_id;
      }
    }

    // Update code for existing requests
    const [reqs] = await pool.execute('SELECT id, code FROM recruitment_requests ORDER BY id ASC');
    for (const r of reqs) {
      if (!r.code) {
        const codeStr = 'YC-2026-0' + String(r.id).padStart(2, '0');
        await pool.execute('UPDATE recruitment_requests SET code = ? WHERE id = ?', [codeStr, r.id]);
      }
    }

    // Check if YC-2026-015 exists
    const [check15] = await pool.execute("SELECT id FROM recruitment_requests WHERE code = 'YC-2026-015'");
    if (check15.length === 0) {
      const [uNA] = await pool.execute("SELECT user_id FROM users WHERE full_name LIKE '%Sơn%' LIMIT 1");
      const [uTL] = await pool.execute("SELECT user_id FROM users WHERE full_name LIKE '%Lan%' LIMIT 1");
      const [uHP] = await pool.execute("SELECT user_id FROM users WHERE full_name LIKE '%Phương%' LIMIT 1");
      const [uDT] = await pool.execute("SELECT user_id FROM users WHERE full_name LIKE '%Trang%' LIMIT 1");
      const [uNV] = await pool.execute("SELECT user_id FROM users WHERE full_name LIKE '%Hùng%' LIMIT 1");

      const idNA = uNA[0]?.user_id || 3;
      const idTL = uTL[0]?.user_id || null;
      const idHP = uHP[0]?.user_id || null;
      const idDT = uDT[0]?.user_id || null;
      const idNV = uNV[0]?.user_id || null;

      // 1. YC-2026-015
      await pool.execute(`
        INSERT INTO recruitment_requests 
        (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, status, recruiter_id, assistant_recruiter_id, created_by, created_at, budget, level_salary, skills)
        VALUES 
        ('YC-2026-015', 'Tuyển Kỹ sư Backend', 1, 5, 3, 'Mở rộng đội ngũ phát triển để triển khai dự án sản phẩm mới trong Q4/2026.', 15000000, 30000000, '2026-11-30', 
         'Tuyển dụng Kỹ sư Backend tham gia phát triển hệ thống sản phẩm của công ty. Ứng viên có kinh nghiệm với Java/Spring Boot, ưu tiên có kinh nghiệm xây dựng hệ thống lớn, hiểu biết về microservices.',
         'Tốt nghiệp chuyên ngành CNTT hoặc liên quan. Có ít nhất 2 năm kinh nghiệm Java/Spring Boot. Hiểu biết về Docker, SQL, Microservices.',
         'IN_PROGRESS', ?, ?, 2, '2026-10-10 08:30:00', 450000000, 'Junior - Middle (15 - 30 triệu)', 'Java, Spring Boot, Microservices, SQL, Docker')
      `, [idNA, idTL]);

      // 2. YC-2026-014
      await pool.execute(`
        INSERT INTO recruitment_requests 
        (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, status, recruiter_id, created_by, created_at, budget, level_salary, skills)
        VALUES 
        ('YC-2026-014', 'Tuyển Chuyên viên Marketing', 4, 12, 2, 'Triển khai chiến dịch tiếp thị số quý cuối năm.', 12000000, 20000000, '2026-11-15', 
         'Xây dựng và phát triển kênh Digital Marketing, quảng cáo đa kênh.',
         'Có kinh nghiệm SEO, Google Ads, Facebook Ads từ 1-2 năm.',
         'DRAFT', ?, 2, '2026-10-12 09:00:00', 180000000, 'Junior (12 - 20 triệu)', 'Digital Marketing, SEO, Ads, Content')
      `, [idTL]);

      // 3. YC-2026-013
      await pool.execute(`
        INSERT INTO recruitment_requests 
        (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, status, recruiter_id, pause_reason, created_by, created_at, budget, level_salary, skills)
        VALUES 
        ('YC-2026-013', 'Tuyển Nhân viên Kinh doanh', 13, 3, 5, 'Chờ duyệt ngân sách quý 4.', 10000000, 18000000, '2026-11-25', 
         'Tìm kiếm khách hàng doanh nghiệp B2B và đàm phán hợp đồng thương mại.',
         'Kỹ năng giao tiếp và thuyết phục tốt.',
         'PAUSED', ?, 'Chờ duyệt ngân sách', 2, '2026-10-08 10:00:00', 300000000, 'Fresher - Junior (10 - 18 triệu)', 'Sales B2B, Giao tiếp, Đàm phán')
      `, [idHP]);

      // 4. YC-2026-012
      await pool.execute(`
        INSERT INTO recruitment_requests 
        (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, status, recruiter_id, close_reason, created_by, created_at, budget, level_salary, skills)
        VALUES 
        ('YC-2026-012', 'Tuyển Thiết kế UI/UX', 11, 1, 1, 'Đã tuyển đủ số lượng theo yêu cầu.', 18000000, 28000000, '2026-10-20', 
         'Thiết kế giao diện ứng dụng web và mobile app theo chuẩn Design System.',
         'Thành thạo Figma, Design System, UX Research.',
         'CLOSED', ?, 'Đã tuyển đủ chỉ tiêu', 2, '2026-10-05 08:00:00', 150000000, 'Middle (18 - 28 triệu)', 'Figma, UI/UX, Design System')
      `, [idDT]);

      // 5. YC-2026-011
      await pool.execute(`
        INSERT INTO recruitment_requests 
        (code, title, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, status, recruiter_id, cancel_reason, created_by, created_at, budget, level_salary, skills)
        VALUES 
        ('YC-2026-011', 'Tuyển Kế toán tổng hợp', 3, 4, 1, 'Thay đổi kế hoạch nhân sự nội bộ công ty.', 12000000, 16000000, '2026-10-15', 
         'Quản lý sổ sách kế toán, báo cáo tài chính hàng tháng.',
         'Tốt nghiệp chuyên ngành Kế toán - Kiểm toán, ít nhất 2 năm kinh nghiệm.',
         'CANCELLED', ?, 'Thay đổi cơ cấu tổ chức', 2, '2026-10-02 09:30:00', 90000000, 'Junior (12 - 16 triệu)', 'Kế toán tổng hợp, MISA, Excel')
      `, [idNV]);

      // Add audit logs for YC-2026-015
      const [res15] = await pool.execute("SELECT id FROM recruitment_requests WHERE code = 'YC-2026-015'");
      const reqId15 = res15[0]?.id;
      if (reqId15) {
        await pool.execute(`
          INSERT INTO audit_logs (user_id, performed_by, action, entity_type, entity_id, description, created_at)
          VALUES 
          (2, 2, 'Tạo yêu cầu tuyển dụng', 'recruitment_requests', ?, 'Tạo yêu cầu tuyển dụng mới cho vị trí Backend Engineer', '2026-10-10 08:30:00'),
          (?, ?, 'Cập nhật thông tin', 'recruitment_requests', ?, 'Cập nhật mô tả yêu cầu tuyển dụng', '2026-10-12 10:30:00'),
          (2, 2, 'Phân công recruiter', 'recruitment_requests', ?, 'Phân công recruiter Nguyễn Anh Sơn làm recruiter chính', '2026-10-14 09:15:00')
        `, [reqId15, idTL, idTL, reqId15, reqId15]);
      }
    }
    console.log('Seeding script finished successfully.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    process.exit(0);
  }
})();
