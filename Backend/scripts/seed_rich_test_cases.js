const { pool } = require('../src/config/database');

async function seedRichTestCases() {
  console.log('🚀 Đang bắt đầu nạp dữ liệu kiểm thử phong phú cho toàn hệ thống...');

  try {
    // ----------------------------------------------------
    // 1. Đảm bảo phòng phỏng vấn trong master_data
    // ----------------------------------------------------
    console.log('1. Cập nhật phòng phỏng vấn...');
    const rooms = [
      ['INTERVIEW_ROOM', 'ROOM_A', 'Phòng họp A', 'Tầng 8, Tòa nhà TechCorp, 1 Duy Tân, Cầu Giấy', 1],
      ['INTERVIEW_ROOM', 'ROOM_B', 'Phòng họp B', 'Tầng 8, Tòa nhà TechCorp, 1 Duy Tân, Cầu Giấy', 2],
      ['INTERVIEW_ROOM', 'ROOM_C', 'Phòng họp C', 'Tầng 9, Tòa nhà TechCorp, 1 Duy Tân, Cầu Giấy', 3],
      ['INTERVIEW_ROOM', 'ROOM_D', 'Phòng họp D (VIP)', 'Tầng 10, Tòa nhà TechCorp, 1 Duy Tân, Cầu Giấy', 4],
      ['INTERVIEW_ROOM', 'ROOM_ONLINE', 'Phòng trực tuyến Google Meet', 'Họp trực tuyến qua Google Meet / Zoom', 5]
    ];
    for (const r of rooms) {
      await pool.query(`
        INSERT INTO master_data (category_group, code, name, description, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = 1
      `, r);
    }

    // ----------------------------------------------------
    // 2. Yêu cầu tuyển dụng (recruitment_requests) - Đa dạng trạng thái
    // ----------------------------------------------------
    console.log('2. Nạp dữ liệu Yêu cầu tuyển dụng (Đủ mọi trạng thái & tab)...');
    // Xóa dữ liệu cũ nếu muốn làm mới sạch sẽ
    await pool.query('DELETE FROM recruitment_request_approvals');
    await pool.query('DELETE FROM recruitment_request_approval_steps');
    await pool.query('DELETE FROM recruitment_requests');

    const sampleRequests = [
      {
        code: 'REQ-2026-001',
        title: 'Tuyển dụng Backend Developer (Node.js/Microservices)',
        dept_id: 1, // IT
        pos_id: 1,  // Backend Developer
        headcount: 3,
        reason: 'Mở rộng đội ngũ phát triển dự án Cloud Banking',
        salary_min: 20000000,
        salary_max: 35000000,
        needed_by: '2026-11-20',
        job_desc: 'Phát triển backend API, thiết kế cơ sở dữ liệu MySQL, tối ưu Redis cache và triển khai Docker.',
        cand_req: 'Tối thiểu 3 năm kinh nghiệm Node.js/TypeScript. Có kiến trúc microservices và message queue.',
        salary_exp: 'Phù hợp khung lương chức danh Senior Backend Developer',
        status: 'APPROVED',
        recruiter_id: 3, // Nguyễn Anh Sơn
        created_by: 4    // Mã Dương Quốc (Hiring Manager IT)
      },
      {
        code: 'REQ-2026-002',
        title: 'Tuyển dụng Frontend Developer (ReactJS/TypeScript)',
        dept_id: 1, // IT
        pos_id: 2,  // Frontend Developer
        headcount: 2,
        reason: 'Xây dựng giao diện hệ thống Quản trị tuyển dụng & Cổng ứng viên',
        salary_min: 15000000,
        salary_max: 25000000,
        needed_by: '2026-11-25',
        job_desc: 'Xây dựng Single Page Application hiện đại với ReactJS, TailwindCSS, Vite và Zustand.',
        cand_req: 'Thành thạo ReactJS, CSS responsive, có kinh nghiệm tối ưu trải nghiệm người dùng.',
        salary_exp: 'Theo quy chuẩn chức danh Middle Frontend Developer',
        status: 'IN_PROGRESS',
        recruiter_id: 3,
        created_by: 4
      },
      {
        code: 'REQ-2026-003',
        title: 'Tuyển Chuyên viên Tuyển dụng & Thu hút nhân tài (Talent Acquisition)',
        dept_id: 2, // HR
        pos_id: 3,  // Chuyên viên Tuyển dụng
        headcount: 1,
        reason: 'Bổ sung nhân sự tuyển dụng mảng Công nghệ thông tin',
        salary_min: 12000000,
        salary_max: 18000000,
        needed_by: '2026-11-15',
        job_desc: 'Tìm kiếm nguồn ứng viên IT, sàng lọc CV, tổ chức phỏng vấn và hỗ trợ onboard.',
        cand_req: 'Có 1-2 năm kinh nghiệm Tech Recruiter, kỹ năng giao tiếp và đàm phán tốt.',
        salary_exp: 'Dải lương chuẩn phòng Nhân sự',
        status: 'APPROVED',
        recruiter_id: 2, // Hà Đức Minh
        created_by: 2
      },
      {
        code: 'REQ-2026-004',
        title: 'Tuyển Kỹ sư Kiểm thử phần mềm (Automation QA)',
        dept_id: 1, // IT
        pos_id: 4,  // Kỹ sư Kiểm thử phần mềm
        headcount: 2,
        reason: 'Tăng cường chất lượng sản phẩm trước khi ra mắt thị trường',
        salary_min: 13000000,
        salary_max: 22000000,
        needed_by: '2026-12-01',
        job_desc: 'Viết kịch bản test tự động Playwright, Selenium, test API bằng Postman.',
        cand_req: 'Có kinh nghiệm Automation QA từ 1.5 năm, nắm vững quy trình STLC.',
        salary_exp: 'Phù hợp dải lương Middle QA',
        status: 'DRAFT',
        recruiter_id: null,
        created_by: 4
      },
      {
        code: 'REQ-2026-005',
        title: 'Tuyển Chuyên viên Tiếp thị số & Truyền thông (Digital Marketing)',
        dept_id: 4, // MKT
        pos_id: 5,  // Marketing
        headcount: 2,
        reason: 'Triển khai chiến dịch truyền thông quảng bá thương hiệu quý 4',
        salary_min: 12000000,
        salary_max: 20000000,
        needed_by: '2026-11-30',
        job_desc: 'Quản trị kênh mạng xã hội, chạy quảng cáo Facebook/Google, sản xuất nội dung.',
        cand_req: 'Tối thiểu 2 năm kinh nghiệm Digital Marketing, sáng tạo và có tư duy số liệu.',
        salary_exp: 'Ngân sách phòng Marketing đã được duyệt',
        status: 'PENDING',
        recruiter_id: 3,
        created_by: 7 // Nguyễn Xuân Phú (Hiring Manager MKT)
      },
      {
        code: 'REQ-2026-006',
        title: 'Tuyển Chuyên viên Kế toán Thuế & Kiểm toán nội bộ',
        dept_id: 3, // FIN
        pos_id: 3,
        headcount: 1,
        reason: 'Thay thế nhân viên chuyển công tác',
        salary_min: 14000000,
        salary_max: 22000000,
        needed_by: '2026-11-10',
        job_desc: 'Lập báo cáo tài chính, quyết toán thuế, đối soát công nợ khách hàng.',
        cand_req: 'Tốt nghiệp ĐH chuyên ngành Kế toán - Kiểm toán, có chứng chỉ hành nghề.',
        salary_exp: 'Phù hợp dải lương Senior Accountant',
        status: 'NEEDS_REVISION',
        recruiter_id: null,
        created_by: 1
      },
      {
        code: 'REQ-2026-007',
        title: 'Tuyển Kỹ sư DevOps & Quản trị hạ tầng Cloud',
        dept_id: 1, // IT
        pos_id: 1,
        headcount: 1,
        reason: 'Tạm hoãn do đang tái cấu trúc trung tâm dữ liệu',
        salary_min: 25000000,
        salary_max: 40000000,
        needed_by: '2026-12-15',
        job_desc: 'Quản trị Kubernetes, AWS EKS, thiết lập CI/CD pipeline tự động.',
        cand_req: 'Tối thiểu 3 năm kinh nghiệm DevOps, chứng chỉ AWS/CKA là lợi thế.',
        salary_exp: 'Mức lương cạnh tranh cho chuyên gia Cloud',
        status: 'PAUSED',
        recruiter_id: 3,
        created_by: 4
      },
      {
        code: 'REQ-2026-008',
        title: 'Tuyển 02 Thực tập sinh Lập trình Web',
        dept_id: 1, // IT
        pos_id: 2,
        headcount: 2,
        reason: 'Đã hoàn thành tuyển dụng đủ số lượng thực tập sinh đợt 1',
        salary_min: 3000000,
        salary_max: 6000000,
        needed_by: '2026-10-01',
        job_desc: 'Hỗ trợ viết mã nguồn HTML/CSS/JS và kiểm thử giao diện cơ bản.',
        cand_req: 'Sinh viên năm cuối các trường ĐH ngành CNTT, có tinh thần cầu tiến.',
        salary_exp: 'Mức trợ cấp thực tập theo quy định công ty',
        status: 'CLOSED',
        recruiter_id: 3,
        created_by: 4
      },
      {
        code: 'REQ-2026-009',
        title: 'Tuyển Trưởng phòng Vận hành Doanh nghiệp (COO Assistant)',
        dept_id: 5, // OPS
        pos_id: 3,
        headcount: 1,
        reason: 'Hủy kế hoạch mở rộng chi nhánh miền Trung trong năm nay',
        salary_min: 30000000,
        salary_max: 50000000,
        needed_by: '2026-10-15',
        job_desc: 'Điều phối hoạt động chuỗi cung ứng và cơ sở hạ tầng doanh nghiệp.',
        cand_req: 'Kinh nghiệm quản lý vận hành từ 5 năm trở lên.',
        salary_exp: 'Theo quyết định của Ban Tổng giám đốc',
        status: 'CANCELLED',
        recruiter_id: 2,
        created_by: 6
      }
    ];

    const insertedReqIds = [];
    for (const req of sampleRequests) {
      const [res] = await pool.query(`
        INSERT INTO recruitment_requests (
          code, title, department_id, position_id, headcount, reason,
          proposed_salary_min, proposed_salary_max, needed_by_date,
          job_description, candidate_requirements, salary_explanation,
          status, recruiter_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        req.code, req.title, req.dept_id, req.pos_id, req.headcount, req.reason,
        req.salary_min, req.salary_max, req.needed_by,
        req.job_desc, req.cand_req, req.salary_exp,
        req.status, req.recruiter_id, req.created_by
      ]);
      insertedReqIds.push(res.insertId);
    }
    console.log(`   ✓ Đã tạo ${insertedReqIds.length} yêu cầu tuyển dụng với đầy đủ các tab (Mới tạo, Đang tuyển, Tạm dừng, Đã đóng, Đã hủy).`);

    // ----------------------------------------------------
    // 3. Tin tuyển dụng (job_postings) - Đầy đủ các tab
    // ----------------------------------------------------
    console.log('3. Nạp dữ liệu Tin tuyển dụng (Đầy đủ các tab & trạng thái)...');
    await pool.query('DELETE FROM job_postings');

    const samplePostings = [
      {
        req_id: insertedReqIds[0] || 1,
        title: 'Tuyển dụng Backend Developer (Node.js/Microservices)',
        desc: 'Thiết kế và phát triển các dịch vụ backend phục vụ hàng triệu người dùng. Tối ưu hóa truy vấn cơ sở dữ liệu lớn.',
        reqs: 'Tối thiểu 2 năm kinh nghiệm với Node.js, Express, MySQL. Nắm chắc cấu trúc dữ liệu và giải thuật.',
        benefits: 'Lương 20 - 35 triệu. Thưởng tháng 13 + thưởng hiệu quả kinh doanh. Bảo hiểm sức khỏe cao cấp Bảo Việt Care.',
        location: 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)',
        type: 'Toàn thời gian (Full-time)',
        salary: '20.000.000 - 35.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 30 * 86400000),
        status: 'PUBLISHED',
        created_by: 2,
        published_by: 2,
        published_at: new Date(Date.now() - 5 * 86400000)
      },
      {
        req_id: insertedReqIds[1] || 1,
        title: 'Tuyển dụng Frontend Developer (ReactJS/TypeScript)',
        desc: 'Tham gia xây dựng giao diện ứng dụng web Single Page Application cho các dự án trọng điểm của tập đoàn.',
        reqs: 'Thành thạo ReactJS, HTML5, CSS3, JavaScript ES6+, TypeScript và TailwindCSS.',
        benefits: 'Lương 15 - 25 triệu. Làm việc kết hợp linh hoạt Hybrid 2 ngày/tuần tại nhà. Trang bị Macbook Pro.',
        location: 'TP.HCM - Trụ sở Quận 1 (Bitexco Office)',
        type: 'Toàn thời gian (Full-time)',
        salary: '15.000.000 - 25.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 25 * 86400000),
        status: 'PUBLISHED',
        created_by: 2,
        published_by: 2,
        published_at: new Date(Date.now() - 7 * 86400000)
      },
      {
        req_id: insertedReqIds[2] || 1,
        title: 'Chuyên viên Tuyển dụng & Thu hút nhân tài (Talent Acquisition)',
        desc: 'Phụ trách toàn bộ quy trình tuyển dụng nhân sự IT từ sourcing đến phỏng vấn và tiếp nhận ứng viên.',
        reqs: 'Có từ 1 năm kinh nghiệm tuyển dụng IT. Kỹ năng giao tiếp và quan hệ ứng viên xuất sắc.',
        benefits: 'Lương 12 - 18 triệu + thưởng tuyển dụng theo chỉ tiêu. Môi trường làm việc năng động, trẻ trung.',
        location: 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)',
        type: 'Toàn thời gian (Full-time)',
        salary: '12.000.000 - 18.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 20 * 86400000),
        status: 'PENDING_APPROVAL',
        created_by: 3,
        submitted_by: 3,
        submitted_at: new Date(Date.now() - 1 * 86400000)
      },
      {
        req_id: insertedReqIds[4] || 1,
        title: 'Chuyên viên Tiếp thị số & Truyền thông (Digital Marketing)',
        desc: 'Xây dựng kế hoạch nội dung đa kênh, chạy quảng cáo chuyển đổi và quản trị hình ảnh thương hiệu.',
        reqs: 'Kinh nghiệm triển khai chiến dịch quảng cáo đa nền tảng, kỹ năng sáng tạo nội dung và viết bài thu hút.',
        benefits: 'Lương 12 - 20 triệu. Du lịch nghỉ dưỡng hàng năm, khám sức khỏe tại bệnh viện quốc tế.',
        location: 'Hà Nội - Chi nhánh Đống Đa',
        type: 'Toàn thời gian (Full-time)',
        salary: '12.000.000 - 20.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 15 * 86400000),
        status: 'PENDING_APPROVAL',
        created_by: 3,
        submitted_by: 3,
        submitted_at: new Date(Date.now() - 2 * 86400000)
      },
      {
        req_id: insertedReqIds[3] || 1,
        title: 'Kỹ sư Kiểm thử phần mềm Fresher (Automation / Manual QA)',
        desc: 'Thiết kế kịch bản kiểm thử, phối hợp với dev tái hiện và truy tìm lỗi phần mềm.',
        reqs: 'Nắm vững quy trình STLC, cẩn thận, có kiến thức về SQL và Postman.',
        benefits: 'Lương 8 - 14 triệu. Được đào tạo 1-1 bởi chuyên gia kiểm thử giàu kinh nghiệm.',
        location: 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)',
        type: 'Toàn thời gian (Full-time)',
        salary: '8.000.000 - 14.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 18 * 86400000),
        status: 'REJECTED',
        created_by: 3,
        review_note: 'Yêu cầu điều chỉnh lại dải lương đề xuất cho phù hợp với kinh nghiệm fresher.'
      },
      {
        req_id: insertedReqIds[0] || 1,
        title: 'Kỹ sư Vận hành hệ thống (DevOps & Cloud Engineer)',
        desc: 'Quản trị hệ thống hạ tầng Kubernetes, CI/CD pipeline và giám sát hiệu năng dịch vụ.',
        reqs: 'Có kinh nghiệm thực tế với Linux, Docker, K8s, Terraform, Prometheus/Grafana.',
        benefits: 'Lương 25 - 40 triệu. Chế độ làm việc linh hoạt từ xa, trợ cấp chứng chỉ quốc tế AWS.',
        location: 'Làm việc từ xa hoàn toàn (Full Remote)',
        type: 'Làm việc kết hợp (Hybrid)',
        salary: '25.000.000 - 40.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 35 * 86400000),
        status: 'DRAFT',
        created_by: 2
      },
      {
        req_id: insertedReqIds[1] || 1,
        title: 'Thực tập sinh Lập trình Web Frontend',
        desc: 'Tham gia xây dựng giao diện ứng dụng web dưới sự hướng dẫn của các Senior Developer.',
        reqs: 'Sinh viên năm cuối ngành CNTT, nắm vững HTML, CSS, JavaScript cơ bản.',
        benefits: 'Trợ cấp thực tập 3 - 6 triệu/tháng. Đóng dấu thực tập tốt nghiệp và cơ hội lên chính thức.',
        location: 'Đà Nẵng - Trung tâm Phần mềm Hải Châu',
        type: 'Thực tập sinh (Internship)',
        salary: '3.000.000 - 6.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 14 * 86400000),
        status: 'APPROVED',
        created_by: 2,
        reviewed_by: 2,
        reviewed_at: new Date(Date.now() - 1 * 86400000)
      },
      {
        req_id: insertedReqIds[0] || 1,
        title: 'Senior Software Solution Architect',
        desc: 'Quy hoạch kiến trúc hệ thống công nghệ thông tin cho các giải pháp chuyển đổi số toàn diện.',
        reqs: 'Tối thiểu 7 năm kinh nghiệm lập trình và 3 năm ở vị trí Solution Architect.',
        benefits: 'Lương 50 - 80 triệu. Cổ phần ESOP thưởng định kỳ hàng năm.',
        location: 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)',
        type: 'Toàn thời gian (Full-time)',
        salary: '50.000.000 - 80.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 40 * 86400000),
        status: 'HIDDEN',
        created_by: 2
      },
      {
        req_id: insertedReqIds[7] || 1,
        title: 'Chuyên viên Phân tích nghiệp vụ BA (Đã tuyển đủ)',
        desc: 'Thu thập yêu cầu nghiệp vụ, viết tài liệu SRS và phân tích luồng dữ liệu.',
        reqs: 'Tối thiểu 2 năm kinh nghiệm BA mảng phần mềm tài chính ngân hàng.',
        benefits: 'Lương 18 - 28 triệu.',
        location: 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)',
        type: 'Toàn thời gian (Full-time)',
        salary: '18.000.000 - 28.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() - 10 * 86400000),
        status: 'CLOSED',
        created_by: 2,
        closed_at: new Date(Date.now() - 2 * 86400000)
      }
    ];

    const insertedJobIds = [];
    for (const jp of samplePostings) {
      const [res] = await pool.query(`
        INSERT INTO job_postings (
          recruitment_request_id, title, description, requirements, benefits,
          work_location, job_type, salary_display, deadline, status,
          created_by, review_note, submitted_by, submitted_at, reviewed_by, reviewed_at,
          published_by, published_at, closed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        jp.req_id, jp.title, jp.desc, jp.reqs, jp.benefits,
        jp.location, jp.type, jp.salary, jp.deadline, jp.status,
        jp.created_by, jp.review_note || null, jp.submitted_by || null, jp.submitted_at || null,
        jp.reviewed_by || null, jp.reviewed_at || null, jp.published_by || null, jp.published_at || null,
        jp.closed_at || null
      ]);
      insertedJobIds.push(res.insertId);
    }
    console.log(`   ✓ Đã tạo ${insertedJobIds.length} tin tuyển dụng đầy đủ các trạng thái (Bản nháp, Chờ duyệt, Yêu cầu sửa, Đã duyệt, Đang xuất bản, Đang ẩn, Đã đóng).`);

    // ----------------------------------------------------
    // 4. Quản lý Hồ sơ Ứng viên (candidates) - Đủ 6 cột Kanban
    // ----------------------------------------------------
    console.log('4. Nạp dữ liệu Ứng viên (Đủ 6 cột Pipeline Kanban)...');
    await pool.query('DELETE FROM candidate_offers');
    await pool.query('DELETE FROM candidate_interviews');
    await pool.query('DELETE FROM candidate_applications');
    await pool.query('DELETE FROM interview_evaluation_details');
    await pool.query('DELETE FROM interview_evaluations');
    await pool.query('DELETE FROM interview_schedules');
    await pool.query('DELETE FROM candidates');

    const sampleCandidates = [
      // 1. Cột HỒ SƠ MỚI (NEW)
      {
        name: 'Trần Văn Hoàng Long',
        email: 'hoanglong.tran@gmail.com',
        phone: '0912345671',
        status: 'NEW',
        source: 'TOPCV',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_tran_van_hoang_long.pdf'
      },
      {
        name: 'Nguyễn Thị Mai Phương',
        email: 'maiphuong.nguyen@gmail.com',
        phone: '0912345672',
        status: 'NEW',
        source: 'LINKEDIN',
        req_id: insertedReqIds[1] || 1,
        cv: 'cv_nguyen_thi_mai_phuong.pdf'
      },
      {
        name: 'Hoàng Gia Bảo',
        email: 'giabao.hoang@gmail.com',
        phone: '0912345681',
        status: 'NEW',
        source: 'VIETNAMWORKS',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_hoang_gia_bao.pdf'
      },

      // 2. Cột SÀNG LỌC (SCREENING)
      {
        name: 'Vũ Đức Thành Đạt',
        email: 'thanhdat.vu@gmail.com',
        phone: '0912345675',
        status: 'SCREENING',
        source: 'REFERRAL',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_vu_duc_thanh_dat.pdf'
      },
      {
        name: 'Lê Thị Ánh Tuyết',
        email: 'anhtuyet.le@gmail.com',
        phone: '0912345682',
        status: 'SCREENING',
        source: 'CAREER_SITE',
        req_id: insertedReqIds[2] || 1,
        cv: 'cv_le_thi_anh_tuyet.pdf'
      },
      {
        name: 'Đỗ Quang Minh',
        email: 'quangminh.do@gmail.com',
        phone: '0912345683',
        status: 'SCREENING',
        source: 'FACEBOOK',
        req_id: insertedReqIds[4] || 1,
        cv: 'cv_do_quang_minh.pdf'
      },

      // 3. Cột PHỎNG VẤN (INTERVIEWING)
      {
        name: 'Đặng Tuấn Kiệt',
        email: 'tuankiet@gmail.com',
        phone: '0987654321',
        status: 'INTERVIEWING',
        source: 'LINKEDIN',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_dang_tuan_kiet.pdf'
      },
      {
        name: 'Lê Hoàng Yến Nhi',
        email: 'nhi.le@gmail.com',
        phone: '0987654322',
        status: 'INTERVIEWING',
        source: 'TOPCV',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_le_hoang_yen_nhi.pdf'
      },
      {
        name: 'Nguyễn Quỳnh Anh',
        email: 'quynhanh@gmail.com',
        phone: '0987654323',
        status: 'INTERVIEWING',
        source: 'VIETNAMWORKS',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_nguyen_quynh_anh.pdf'
      },
      {
        name: 'Phạm Minh Tuấn',
        email: 'minhtuan@gmail.com',
        phone: '0987654324',
        status: 'INTERVIEWING',
        source: 'ITVIECT',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_pham_minh_tuan.pdf'
      },
      {
        name: 'Trần Thị Vân',
        email: 'vantran@gmail.com',
        phone: '0987654325',
        status: 'INTERVIEWING',
        source: 'CAREER_SITE',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_tran_thi_van.pdf'
      },

      // 4. Cột ĐỀ XUẤT OFFER (OFFERED)
      {
        name: 'Bùi Quang Huy',
        email: 'quanghuy.bui@gmail.com',
        phone: '0912345677',
        status: 'OFFERED',
        source: 'ITVIECT',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_bui_quang_huy.pdf'
      },
      {
        name: 'Phạm Bảo Ngọc',
        email: 'baongoc.pham@gmail.com',
        phone: '0912345676',
        status: 'OFFERED',
        source: 'HEADHUNTER',
        req_id: insertedReqIds[3] || 1,
        cv: 'cv_pham_bao_ngoc.pdf'
      },

      // 5. Cột NHẬN VIỆC (HIRED)
      {
        name: 'Ngô Đình Trí',
        email: 'dinhtri.ngo@gmail.com',
        phone: '0912345678',
        status: 'HIRED',
        source: 'REFERRAL',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_ngo_dinh_tri.pdf'
      },
      {
        name: 'Nguyễn Văn An',
        email: 'an.nguyen@gmail.com',
        phone: '0912345684',
        status: 'HIRED',
        source: 'TOPCV',
        req_id: insertedReqIds[1] || 1,
        cv: 'cv_nguyen_van_an.pdf'
      },

      // 6. Cột TỪ CHỐI / LOẠI (REJECTED)
      {
        name: 'Hoàng Minh Châu',
        email: 'minhchau.hoang@gmail.com',
        phone: '0912345679',
        status: 'REJECTED',
        source: 'FACEBOOK',
        reject_reason: 'NOT_MATCH_SKILL',
        req_id: insertedReqIds[1] || 1,
        cv: 'cv_hoang_minh_chau.pdf'
      },
      {
        name: 'Đỗ Hữu Phước',
        email: 'huuphuoc.do@gmail.com',
        phone: '0912345680',
        status: 'REJECTED',
        reject_reason: 'HIGH_SALARY',
        req_id: insertedReqIds[0] || 1,
        cv: 'cv_do_huu_phuoc.pdf'
      }
    ];

    const insertedCandMap = {};
    for (const c of sampleCandidates) {
      const [res] = await pool.query(`
        INSERT INTO candidates (
          full_name, email, phone, status, source_code, rejection_reason_code,
          recruitment_request_id, created_by, resume_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?, NOW(), NOW())
      `, [
        c.name, c.email, c.phone, c.status, c.source,
        c.reject_reason || null, c.req_id, c.cv
      ]);
      insertedCandMap[c.email] = res.insertId;

      // Tạo candidate_applications tương ứng
      await pool.query(`
        INSERT INTO candidate_applications (
          candidate_id, job_posting_id, recruitment_request_id, status, resume_url, applied_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [res.insertId, insertedJobIds[0] || 1, c.req_id, c.status, c.cv]);
    }
    console.log(`   ✓ Đã tạo ${sampleCandidates.length} ứng viên phân bổ đều qua tất cả các cột Kanban.`);

    // ----------------------------------------------------
    // 5. Lịch phỏng vấn (interview_schedules) - Khớp chính xác Ảnh 1
    // ----------------------------------------------------
    console.log('5. Nạp Lịch phỏng vấn & Đánh giá (Khớp chính xác giao diện Ảnh 1, 2, 3)...');
    
    // Lấy ID phòng họp A, B, C
    const [roomRows] = await pool.query(`SELECT id, code, name FROM master_data WHERE category_group = 'INTERVIEW_ROOM'`);
    const roomA = roomRows.find(r => r.code === 'ROOM_A')?.id || roomRows[0]?.id || 1;
    const roomB = roomRows.find(r => r.code === 'ROOM_B')?.id || roomRows[1]?.id || 2;
    const roomC = roomRows.find(r => r.code === 'ROOM_C')?.id || roomRows[2]?.id || 3;

    // Người phỏng vấn: Thàng Xuân Lập (user_id = 5)
    const interviewerId = 5;
    const backendPosId = 1;

    // STT 1: Đặng Tuấn Kiệt (Đã chấm, 4.6, Nên tuyển)
    const [sch1] = await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Chuyên môn', ?, ?, 'OFFLINE', '2026-10-15 10:00:00', '2026-10-15 11:30:00', 'COMPLETED', 2)
    `, [insertedCandMap['tuankiet@gmail.com'], backendPosId, interviewerId, roomA]);

    const [eval1] = await pool.query(`
      INSERT INTO interview_evaluations (
        interview_schedule_id, candidate_id, interviewer_id, round_number,
        total_score, recommendation, general_comments, status, submitted_at
      ) VALUES (?, ?, ?, 1, 4.6, 'RECOMMENDED', 'Ứng viên có kiến thức chuyên môn tốt, tư duy giải quyết vấn đề nhanh, giao tiếp rõ ràng. Phù hợp với vị trí Backend Developer.', 'SUBMITTED', '2026-10-15 11:45:00')
    `, [sch1.insertId, insertedCandMap['tuankiet@gmail.com'], interviewerId]);

    const details1 = [
      [1, 'Kiến thức chuyên môn', 40, 4, 'Nắm vững kiến thức backend, database và caching'],
      [2, 'Kỹ năng giải quyết vấn đề', 25, 5, 'Tư duy logic tốt, phản ứng nhanh'],
      [3, 'Kỹ năng giao tiếp', 20, 4, 'Diễn đạt lưu loát, rõ ràng'],
      [4, 'Tinh thần làm việc nhóm', 15, 5, 'Thái độ tích cực, hòa đồng']
    ];
    for (const [cId, name, weight, score, comment] of details1) {
      await pool.query(`
        INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [eval1.insertId, cId, name, weight, score, comment]);
    }

    // STT 2: Lê Hoàng Yến Nhi (Đã chấm, 2.3, Không nên tuyển)
    const [sch2] = await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Chuyên môn', ?, ?, 'OFFLINE', '2026-10-16 09:00:00', '2026-10-16 10:00:00', 'COMPLETED', 2)
    `, [insertedCandMap['nhi.le@gmail.com'], backendPosId, interviewerId, roomB]);

    const [eval2] = await pool.query(`
      INSERT INTO interview_evaluations (
        interview_schedule_id, candidate_id, interviewer_id, round_number,
        total_score, recommendation, general_comments, status, submitted_at
      ) VALUES (?, ?, ?, 1, 2.3, 'NOT_RECOMMENDED', 'Kỹ năng chuyên môn chưa đáp ứng yêu cầu của dự án. Thiếu kinh nghiệm thực tế về cơ sở dữ liệu phân tán.', 'SUBMITTED', '2026-10-16 10:15:00')
    `, [sch2.insertId, insertedCandMap['nhi.le@gmail.com'], interviewerId]);

    const details2 = [
      [1, 'Kiến thức chuyên môn', 40, 2, 'Kiến thức còn hổng nhiều phần core'],
      [2, 'Kỹ năng giải quyết vấn đề', 25, 2, 'Chưa đưa ra được giải pháp tối ưu'],
      [3, 'Kỹ năng giao tiếp', 20, 3, 'Giao tiếp bình thường'],
      [4, 'Tinh thần làm việc nhóm', 15, 3, 'Tương đối hòa đồng']
    ];
    for (const [cId, name, weight, score, comment] of details2) {
      await pool.query(`
        INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [eval2.insertId, cId, name, weight, score, comment]);
    }

    // STT 3: Nguyễn Quỳnh Anh (Đã chấm, 4.5, Nên tuyển)
    const [sch3] = await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Chuyên môn', ?, ?, 'OFFLINE', '2026-10-18 14:00:00', '2026-10-18 15:30:00', 'COMPLETED', 2)
    `, [insertedCandMap['quynhanh@gmail.com'], backendPosId, interviewerId, roomC]);

    const [eval3] = await pool.query(`
      INSERT INTO interview_evaluations (
        interview_schedule_id, candidate_id, interviewer_id, round_number,
        total_score, recommendation, general_comments, status, submitted_at
      ) VALUES (?, ?, ?, 1, 4.5, 'RECOMMENDED', 'Ứng viên sáng giá, tư duy thuật toán xuất sắc và tiếng Anh giao tiếp thành thạo.', 'SUBMITTED', '2026-10-18 15:45:00')
    `, [sch3.insertId, insertedCandMap['quynhanh@gmail.com'], interviewerId]);

    for (const [cId, name, weight, score, comment] of details1) {
      await pool.query(`
        INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [eval3.insertId, cId, name, weight, score, comment]);
    }

    // STT 4: Phạm Minh Tuấn (Đã hoàn thành - Chờ chấm điểm)
    await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Chuyên môn', ?, ?, 'OFFLINE', '2026-10-20 09:00:00', '2026-10-20 10:30:00', 'COMPLETED', 2)
    `, [insertedCandMap['minhtuan@gmail.com'], backendPosId, interviewerId, roomA]);

    // STT 5: Trần Thị Vân (Đang phỏng vấn)
    await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Chuyên môn', ?, ?, 'OFFLINE', '2026-10-22 07:00:00', '2026-10-22 08:30:00', 'IN_PROGRESS', 2)
    `, [insertedCandMap['vantran@gmail.com'], backendPosId, interviewerId, roomB]);

    // STT 6: Trần Văn Hoàng Long (Đã lên lịch)
    await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Kỹ thuật', ?, ?, 'OFFLINE', '2026-10-25 02:00:00', '2026-10-25 03:30:00', 'SCHEDULED', 2)
    `, [insertedCandMap['hoanglong.tran@gmail.com'], backendPosId, interviewerId, roomC]);

    // STT 7: Nguyễn Thị Mai Phương (Đã lên lịch - Online)
    await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Phỏng vấn trực tuyến', ?, ?, 'ONLINE', '2026-10-26 03:00:00', '2026-10-26 04:30:00', 'SCHEDULED', 2)
    `, [insertedCandMap['maiphuong.nguyen@gmail.com'], 2, interviewerId, roomRows.find(r => r.code === 'ROOM_ONLINE')?.id || roomA]);

    // STT 8: Đỗ Hữu Phước (Đã hủy)
    await pool.query(`
      INSERT INTO interview_schedules (
        candidate_id, position_id, round_number, round_name, interviewer_id,
        room_id, mode, start_at, end_at, status, created_by
      ) VALUES (?, ?, 1, 'Vòng 1 - Kỹ thuật', ?, ?, 'OFFLINE', '2026-10-12 07:00:00', '2026-10-12 08:00:00', 'CANCELLED', 2)
    `, [insertedCandMap['huuphuoc.do@gmail.com'], backendPosId, interviewerId, roomA]);

    console.log('   ✓ Đã tạo 8 lịch phỏng vấn phong phú bao gồm: Đã chấm, Đã hoàn thành (Chờ chấm), Đang phỏng vấn, Đã lên lịch, Đã hủy.');

    console.log('🎉 TOÀN BỘ DỮ LIỆU KIỂM THỬ ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀ SẴN SÀNG ĐỂ BẠN TEST TẤT CẢ CÁC TRƯỜNG HỢP!');
    await pool.end();
  } catch (error) {
    console.error('❌ Lỗi nạp dữ liệu kiểm thử:', error);
    process.exit(1);
  }
}

seedRichTestCases();
