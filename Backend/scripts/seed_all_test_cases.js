const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log('--- 1. SEEDING COMPETENCIES & QUESTIONS (SCREEN 1) ---');
    // Ensure competencies exist
    const competenciesData = [
      { id: 1, name: 'Chuyên môn Kỹ thuật & Công nghệ', description: 'Kiến thức nền tảng về lập trình, kiến trúc hệ thống, cơ sở dữ liệu và xử lý hiệu năng cao.' },
      { id: 2, name: 'Kỹ năng Tiếp thị số & Truyền thông', description: 'Kỹ năng Digital Marketing, chạy quảng cáo đa kênh, tối ưu chuyển đổi và phân tích dữ liệu thị trường.' },
      { id: 3, name: 'Tư duy phản biện & Giải quyết vấn đề', description: 'Khả năng phân tích nguyên nhân gốc rễ (Root Cause Analysis) và đưa ra giải pháp đột phá, bền vững.' },
      { id: 4, name: 'Kỹ năng Giao tiếp & Thuyết trình', description: 'Truyền đạt thông tin rõ ràng, mạch lạc; kỹ năng lắng nghe và thuyết phục khách hàng/đối tác.' },
      { id: 5, name: 'Làm việc nhóm & Quản lý thời gian', description: 'Kỹ năng cộng tác liên phòng ban, làm việc theo phương pháp Agile/Scrum và kiểm soát tiến độ công việc.' }
    ];

    for (const comp of competenciesData) {
      await conn.query(`
        INSERT INTO competencies (id, name, description, created_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
      `, [comp.id, comp.name, comp.description]);
    }

    // Seed questions table (12 questions: 4 Easy, 5 Medium, 3 Hard)
    const questionsData = [
      // Easy (4)
      {
        competency_id: 1,
        difficulty: 'Easy',
        question_text: 'Trình bày sự khác biệt cơ bản giữa phương thức GET và POST trong giao thức HTTP?',
        sample_answer: 'GET gửi dữ liệu thông qua URL query string, thích hợp cho việc lấy dữ liệu, có giới hạn độ dài và có thể cache. POST gửi dữ liệu trong request body, thích hợp cho việc tạo mới dữ liệu, bảo mật hơn và không bị giới hạn độ dài.'
      },
      {
        competency_id: 2,
        difficulty: 'Easy',
        question_text: 'Nêu các kênh Digital Marketing phổ biến hiện nay và mục tiêu chính của từng kênh?',
        sample_answer: 'Các kênh gồm: SEO/Website (traffic tự nhiên, bền vững), Google Search Ads (khai thác nhu cầu chủ động), Facebook/TikTok Ads (tạo nhận thức, tiếp cận số lượng lớn), Email Marketing (nuôi dưỡng và giữ chân khách hàng cũ).'
      },
      {
        competency_id: 4,
        difficulty: 'Easy',
        question_text: 'Khi nhận được phản hồi tiêu cực hoặc đóng góp thẳng thắn từ đồng nghiệp, bạn sẽ phản ứng như thế nào?',
        sample_answer: 'Lắng nghe tích cực, không phản bác phòng thủ ngay. Cảm ơn sự góp ý chân thành, phân tích khách quan xem điểm nào mình có thể cải thiện và chủ động trao đổi lại giải pháp khắc phục.'
      },
      {
        competency_id: 5,
        difficulty: 'Easy',
        question_text: 'Bạn quản lý và ưu tiên các công việc hàng ngày của mình theo phương pháp nào?',
        sample_answer: 'Áp dụng ma trận Eisenhower (Quan trọng - Khẩn cấp) hoặc quy tắc Pomodoro. Lên kế hoạch to-do list vào đầu ngày và định kỳ review tiến độ vào cuối buổi làm việc.'
      },

      // Medium (5)
      {
        competency_id: 1,
        difficulty: 'Medium',
        question_text: 'Phân biệt State và Props trong React? Khi nào nên sử dụng Redux hoặc Context API thay vì nâng state lên cha (lifting state up)?',
        sample_answer: 'Props là tham số truyền từ component cha xuống con (bất biến với con). State là trạng thái nội tại do component tự quản lý. Nên dùng Context API hoặc Redux khi dữ liệu cần chia sẻ cho nhiều component ở các cấp sâu khác nhau trong component tree (tránh prop drilling).'
      },
      {
        competency_id: 2,
        difficulty: 'Medium',
        question_text: 'Làm thế nào để tối ưu hóa SEO On-page cho một bài viết để đạt thứ hạng cao trên Google?',
        sample_answer: 'Tối ưu thẻ Title và Meta Description hấp dẫn chứa từ khóa chính; cấu trúc Heading (H1, H2, H3) logic; mật độ từ khóa tự nhiên; tối ưu Alt text hình ảnh; tăng tốc độ tải trang; gắn Internal link và External link uy tín; tối ưu trải nghiệm đọc trên di động.'
      },
      {
        competency_id: 2,
        difficulty: 'Medium',
        question_text: 'Bạn tính toán và tối ưu hóa chỉ số CAC (Chi phí có được 1 khách hàng) và ROAS như thế nào trong một chiến dịch quảng cáo?',
        sample_answer: 'CAC = Tổng chi phí marketing / Số khách hàng mới kiếm được. ROAS = Doanh thu từ quảng cáo / Chi phí quảng cáo. Để tối ưu: A/B testing nội dung và hình ảnh banner, thu hẹp tệp target đúng chân dung khách hàng lý tưởng, tối ưu trang đích (landing page) để tăng tỷ lệ chuyển đổi.'
      },
      {
        competency_id: 3,
        difficulty: 'Medium',
        question_text: 'Mô tả một tình huống dự án gặp sự cố nghiêm trọng sát hạn chót (deadline) và cách bạn cùng nhóm xử lý?',
        sample_answer: 'Ưu tiên cô lập vấn đề để giảm thiểu thiệt hại; tổ chức họp nhanh 15 phút xác định nguyên nhân cốt lõi; phân chia lại nhiệm vụ khẩn cấp; tạm thời gác lại tính năng phụ và tập trung 100% tài nguyên cho luồng chính (happy path); thông báo minh bạch cho các bên liên quan về tình trạng và kế hoạch giải quyết.'
      },
      {
        competency_id: 1,
        difficulty: 'Medium',
        question_text: 'Trình bày cách xử lý bất đồng bộ trong JavaScript: Callback, Promise và Async/Await khác nhau như thế nào?',
        sample_answer: 'Callback dễ dẫn đến Callback Hell khi lồng nhau nhiều tầng. Promise ra đời giải quyết với chuỗi .then().catch(), hỗ trợ Promise.all/race. Async/Await là cú pháp syntactic sugar trên nền Promise, giúp viết code bất đồng bộ nhìn tuần tự, dễ đọc, dễ debug với try/catch.'
      },

      // Hard (3)
      {
        competency_id: 1,
        difficulty: 'Hard',
        question_text: 'Thiết kế kiến trúc hệ thống phục vụ 10,000 requests/giây đảm bảo High Availability (Sẵn sàng cao) và Zero Downtime?',
        sample_answer: 'Sử dụng Nginx Load Balancer phân tải dạng Round-robin/Least Connections; chia nhỏ dịch vụ theo Microservices/Stateless API; sử dụng Redis Cache tầng dữ liệu nóng để giảm tải DB; Master-Slave Replication cho MySQL với Read/Write splitting; triển khai Kubernetes tự động Auto-scaling (HPA) và Rolling Update deployment.'
      },
      {
        competency_id: 2,
        difficulty: 'Hard',
        question_text: 'Chiến lược xây dựng phễu Marketing (Funnel) từ nhận thức (Awareness), cân nhắc (Consideration) đến giữ chân (Retention) cho sản phẩm SaaS B2B?',
        sample_answer: 'Top of Funnel: Bài viết chuyên môn, infographic, webinar giải quyết nỗi đau của khách hàng. Middle of Funnel: Case study, bảng so sánh tính năng, demo tương tác trực tiếp, bản dùng thử 14 ngày. Bottom of Funnel: Báo giá linh hoạt, buổi tư vấn 1-1 của Sales Engineer. Retention: Email onboarding theo hành vi người dùng, customer success hỗ trợ 24/7 và chương trình tích điểm/giới thiệu.'
      },
      {
        competency_id: 3,
        difficulty: 'Hard',
        question_text: 'Giải thích nguyên lý hoạt động của Indexing trong MySQL (B-Tree vs Hash). Khi nào một câu lệnh SELECT không thể sử dụng Index và cách khắc phục?',
        sample_answer: 'B-Tree sắp xếp dữ liệu phân cấp, tối ưu cho tìm kiếm khoảng (range queries) và so sánh =. Hash chỉ tối ưu cho phép toán = chính xác. Index bị vô hiệu khi: dùng hàm trên cột được đánh index (ví dụ DATE(created_at) = ...), ép kiểu ngầm định (implicit casting), tìm kiếm wildcard bắt đầu bằng % (LIKE %abc), hoặc điều kiện OR không được đánh index đồng bộ. Khắc phục: viết lại query sargable, dùng generated column có index hoặc composite index chuẩn thứ tự cột.'
      }
    ];

    await conn.query('DELETE FROM questions');
    for (const q of questionsData) {
      await conn.query(`
        INSERT INTO questions (competency_criteria_id, difficulty_level, question_text, sample_answer, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [q.competency_id, q.difficulty, q.question_text, q.sample_answer]);
    }
    console.log(`✓ Inserted ${questionsData.length} questions into 'questions' table.`);

    console.log('--- 2. SEEDING APPROVAL WORKFLOWS (SCREEN 2) ---');
    // Global workflow & Department 4 (Marketing) workflow
    await conn.query('DELETE FROM approval_workflows');
    const globalLevels = [
      {
        department_id: null,
        min_salary: 0,
        max_salary: 15000000,
        step_number: 1,
        step_name: 'Trưởng bộ phận',
        step_description: 'Sơ duyệt định biên nhân sự và bản mô tả công việc (JD)',
        approver_role_code: 'HIRING_MANAGER'
      },
      {
        department_id: null,
        min_salary: 15000000,
        max_salary: 30000000,
        step_number: 2,
        step_name: 'Quản lý nhân sự (HR Manager)',
        step_description: 'Thẩm định ngân sách tuyển dụng và khung dải lương thị trường',
        approver_role_code: 'HR_MANAGER'
      },
      {
        department_id: null,
        min_salary: 30000000,
        max_salary: null,
        step_number: 3,
        step_name: 'Giám đốc điều hành (Director)',
        step_description: 'Phê duyệt cuối cùng đối với nhân sự cấp cao hoặc mức lương vượt khung ngân sách',
        approver_role_code: 'APPROVER'
      }
    ];

    const mktLevels = [
      {
        department_id: 4,
        min_salary: 0,
        max_salary: 20000000,
        step_number: 1,
        step_name: 'Trưởng phòng Marketing',
        step_description: 'Duyệt kế hoạch tuyển dụng theo kế hoạch chiến dịch Marketing',
        approver_role_code: 'HIRING_MANAGER'
      },
      {
        department_id: 4,
        min_salary: 20000000,
        max_salary: 35000000,
        step_number: 2,
        step_name: 'Quản lý nhân sự (HR Manager)',
        step_description: 'Xác nhận nguồn ngân sách và chi phí tuyển mộ Marketing',
        approver_role_code: 'HR_MANAGER'
      },
      {
        department_id: 4,
        min_salary: 35000000,
        max_salary: null,
        step_number: 3,
        step_name: 'Giám đốc',
        step_description: 'Phê duyệt vị trí Trưởng nhóm / Quản lý Marketing chiến lược',
        approver_role_code: 'APPROVER'
      }
    ];

    for (const lvl of [...globalLevels, ...mktLevels]) {
      await conn.query(`
        INSERT INTO approval_workflows (department_id, min_salary, max_salary, step_number, step_name, step_description, approver_role_code, updated_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `, [lvl.department_id, lvl.min_salary, lvl.max_salary, lvl.step_number, lvl.step_name, lvl.step_description, lvl.approver_role_code]);
    }
    console.log(`✓ Inserted ${globalLevels.length + mktLevels.length} approval workflow levels (Global & Marketing).`);

    console.log('--- 3. SEEDING JOB POSITIONS & RECRUITMENT REQUESTS (SCREEN 3) ---');
    // Marketing Job Positions
    const positions = [
      { id: 10, code: 'MKT_DIGITAL', name: 'Chuyên viên Tiếp thị số & Truyền thông', level: 'Middle', min: 14000000, max: 25000000 },
      { id: 11, code: 'MKT_CONTENT', name: 'Chuyên viên Content Marketing Sáng tạo', level: 'Middle', min: 12000000, max: 20000000 },
      { id: 12, code: 'MKT_SEO', name: 'Chuyên viên SEO & Tối ưu chuyển đổi', level: 'Middle', min: 13000000, max: 22000000 },
      { id: 13, code: 'MKT_DESIGN', name: 'Chuyên viên Thiết kế Đồ họa (Graphic & UI)', level: 'Middle', min: 12000000, max: 20000000 },
      { id: 14, code: 'MKT_LEAD', name: 'Trưởng nhóm Quảng cáo Đa kênh (Performance Lead)', level: 'Senior', min: 25000000, max: 40000000 }
    ];

    for (const p of positions) {
      await conn.query(`
        INSERT INTO job_positions (position_id, position_code, position_name, position_level, min_salary, max_salary, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
        ON DUPLICATE KEY UPDATE position_name = VALUES(position_name), position_code = VALUES(position_code)
      `, [p.id, p.code, p.name, p.level, p.min, p.max]);
    }

    // Recruitment requests for Department 4 (Nguyễn Xuân Phú, user_id = 7)
    // Satisfies all tabs: MOI_TAO, DANG_TUYEN, TAM_DUNG, DA_DONG, DA_HUY
    const requestsData = [
      {
        id: 34,
        code: 'REQ-2026-005',
        title: 'Tuyển Chuyên viên Tiếp thị số & Truyền thông (Digital Marketing)',
        position_id: 10,
        department_id: 4,
        status: 'PENDING', // MOI_TAO
        headcount: 2,
        proposed_salary_min: 15000000,
        proposed_salary_max: 22000000,
        needed_by_date: '2026-11-30',
        recruiter_id: 3, // Nguyễn Anh Sơn
        created_by: 7
      },
      {
        id: 35,
        code: 'REQ-2026-006',
        title: 'Tuyển Chuyên viên Content Marketing Sáng tạo',
        position_id: 11,
        department_id: 4,
        status: 'APPROVED', // DANG_TUYEN
        headcount: 2,
        proposed_salary_min: 12000000,
        proposed_salary_max: 18000000,
        needed_by_date: '2026-11-15',
        recruiter_id: 3,
        created_by: 7
      },
      {
        id: 36,
        code: 'REQ-2026-007',
        title: 'Tuyển Chuyên viên SEO & Tối ưu chuyển đổi (SEO Specialist)',
        position_id: 12,
        department_id: 4,
        status: 'IN_PROGRESS', // DANG_TUYEN
        headcount: 1,
        proposed_salary_min: 14000000,
        proposed_salary_max: 22000000,
        needed_by_date: '2026-11-20',
        recruiter_id: 9, // Long Minh Thành
        created_by: 7
      },
      {
        id: 37,
        code: 'REQ-2026-008',
        title: 'Tuyển Thực tập sinh Marketing & Tổ chức sự kiện',
        position_id: 11,
        department_id: 4,
        status: 'PAUSED', // TAM_DUNG
        headcount: 3,
        proposed_salary_min: 4000000,
        proposed_salary_max: 6000000,
        needed_by_date: '2026-12-01',
        recruiter_id: 3,
        created_by: 7
      },
      {
        id: 38,
        code: 'REQ-2026-009',
        title: 'Tuyển Chuyên viên Thiết kế Đồ họa (Graphic & UI)',
        position_id: 13,
        department_id: 4,
        status: 'COMPLETED', // DA_DONG
        headcount: 1,
        proposed_salary_min: 15000000,
        proposed_salary_max: 20000000,
        needed_by_date: '2026-10-15',
        recruiter_id: 9,
        created_by: 7
      },
      {
        id: 39,
        code: 'REQ-2026-010',
        title: 'Tuyển Trưởng nhóm Quảng cáo Đa kênh (Performance Lead)',
        position_id: 14,
        department_id: 4,
        status: 'REJECTED', // DA_HUY
        headcount: 1,
        proposed_salary_min: 25000000,
        proposed_salary_max: 38000000,
        needed_by_date: '2026-10-31',
        recruiter_id: 3,
        created_by: 7
      }
    ];

    for (const r of requestsData) {
      await conn.query(`
        INSERT INTO recruitment_requests (
          id, code, title, position_id, department_id, status, headcount,
          proposed_salary_min, proposed_salary_max, needed_by_date,
          job_description, candidate_requirements, recruiter_id, created_by,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          'Mô tả trách nhiệm công việc chi tiết', 'Yêu cầu chuyên môn và kinh nghiệm thực tế', ?, ?,
          NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          title = VALUES(title),
          position_id = VALUES(position_id),
          department_id = VALUES(department_id),
          status = VALUES(status),
          headcount = VALUES(headcount),
          recruiter_id = VALUES(recruiter_id),
          created_by = VALUES(created_by)
      `, [r.id, r.code, r.title, r.position_id, r.department_id, r.status, r.headcount, r.proposed_salary_min, r.proposed_salary_max, r.needed_by_date, r.recruiter_id, r.created_by]);
    }
    console.log(`✓ Inserted/Updated ${requestsData.length} recruitment requests for Marketing (Department 4).`);

    console.log('--- 4. SEEDING CANDIDATES, INTERVIEW SCHEDULES & EVALUATIONS (SCREEN 4) ---');
    // Candidates for Marketing
    const candidatesData = [
      { id: 51, name: 'Trần Bảo Ngọc', email: 'bao.ngoc.tran@gmail.com', phone: '0912345678', req_id: 35 },
      { id: 52, name: 'Lê Hoàng Long', email: 'hoanglong.mkt@gmail.com', phone: '0923456789', req_id: 36 },
      { id: 53, name: 'Phạm Quỳnh Anh', email: 'quynhanh.mkt@gmail.com', phone: '0934567890', req_id: 34 },
      { id: 54, name: 'Vũ Đức Thắng', email: 'thang.vu.design@gmail.com', phone: '0945678901', req_id: 38 },
      { id: 55, name: 'Đặng Mai Phương', email: 'maiphuong.media@gmail.com', phone: '0956789012', req_id: 35 }
    ];

    for (const c of candidatesData) {
      await conn.query(`
        INSERT INTO candidates (id, application_code, full_name, email, phone, status, recruitment_request_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'INTERVIEWING', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), recruitment_request_id = VALUES(recruitment_request_id)
      `, [c.id, `APP-MKT-${c.id}`, c.name, c.email, c.phone, c.req_id]);
    }

    // Interview schedules for Marketing candidates
    // Note: room_id references master_data (13: Room 101, 14: Room 102, 15: Google Meet, 16: Room VIP)
    // Interviewer: Nguyễn Xuân Phú (user_id = 7)
    const schedulesData = [
      {
        id: 21,
        candidate_id: 51, // Trần Bảo Ngọc
        position_id: 11, // Chuyên viên Content Marketing
        interviewer_id: 7, // Nguyễn Xuân Phú
        room_id: 13, // Room 101
        start_at: '2026-10-22 09:00:00',
        end_at: '2026-10-22 10:00:00',
        status: 'SCHEDULED',
        eval: null
      },
      {
        id: 22,
        candidate_id: 52, // Lê Hoàng Long
        position_id: 12, // Chuyên viên SEO
        interviewer_id: 7, // Nguyễn Xuân Phú
        room_id: 15, // Google Meet
        start_at: '2026-10-18 14:00:00',
        end_at: '2026-10-18 15:00:00',
        status: 'COMPLETED',
        eval: {
          total_score: 8.5,
          recommendation: 'RECOMMENDED',
          general_comments: 'Ứng viên nắm rất vững kỹ thuật SEO On-page và Off-page, có kinh nghiệm quản trị hệ thống vệ tinh và tư duy dữ liệu sắc bén.'
        }
      },
      {
        id: 23,
        candidate_id: 53, // Phạm Quỳnh Anh
        position_id: 10, // Chuyên viên Tiếp thị số
        interviewer_id: 7, // Nguyễn Xuân Phú
        room_id: 14, // Room 102
        start_at: '2026-10-17 10:30:00',
        end_at: '2026-10-17 11:30:00',
        status: 'COMPLETED',
        eval: {
          total_score: 5.0,
          recommendation: 'NOT_RECOMMENDED',
          general_comments: 'Chưa có kinh nghiệm thực tế về tối ưu ngân sách lớn, kiến thức đo lường conversion tracking còn yếu.'
        }
      },
      {
        id: 24,
        candidate_id: 54, // Vũ Đức Thắng
        position_id: 13, // Thiết kế đồ họa
        interviewer_id: 7, // Nguyễn Xuân Phú
        room_id: 13, // Room 101
        start_at: '2026-10-16 15:30:00',
        end_at: '2026-10-16 16:30:00',
        status: 'CANCELLED',
        eval: null
      },
      {
        id: 25,
        candidate_id: 55, // Đặng Mai Phương
        position_id: 11, // Chuyên viên Content Marketing
        interviewer_id: 7, // Nguyễn Xuân Phú
        room_id: 16, // Room VIP
        start_at: '2026-10-23 14:00:00',
        end_at: '2026-10-23 15:00:00',
        status: 'SCHEDULED',
        eval: null
      }
    ];

    for (const s of schedulesData) {
      await conn.query(`
        INSERT INTO interview_schedules (
          id, candidate_id, position_id, round_number, round_name,
          interviewer_id, room_id, mode, start_at, end_at, status,
          created_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, 1, 'Phỏng vấn chuyên môn',
          ?, ?, 'OFFLINE', ?, ?, ?,
          1, NOW(), NOW()
        ) ON DUPLICATE KEY UPDATE
          candidate_id = VALUES(candidate_id),
          position_id = VALUES(position_id),
          interviewer_id = VALUES(interviewer_id),
          room_id = VALUES(room_id),
          start_at = VALUES(start_at),
          end_at = VALUES(end_at),
          status = VALUES(status)
      `, [s.id, s.candidate_id, s.position_id, s.interviewer_id, s.room_id, s.start_at, s.end_at, s.status]);

      if (s.eval) {
        await conn.query(`
          INSERT INTO interview_evaluations (
            interview_schedule_id, candidate_id, interviewer_id,
            round_number, total_score, recommendation, general_comments,
            status, submitted_at, created_at, updated_at
          ) VALUES (
            ?, ?, ?,
            1, ?, ?, ?,
            'SUBMITTED', NOW(), NOW(), NOW()
          ) ON DUPLICATE KEY UPDATE
            total_score = VALUES(total_score),
            recommendation = VALUES(recommendation),
            general_comments = VALUES(general_comments),
            status = 'SUBMITTED'
        `, [s.id, s.candidate_id, s.interviewer_id, s.eval.total_score, s.eval.recommendation, s.eval.general_comments]);

        // Get inserted evaluation id
        const [evalRows] = await conn.query('SELECT id FROM interview_evaluations WHERE interview_schedule_id = ? AND interviewer_id = ?', [s.id, s.interviewer_id]);
        const evalId = evalRows[0]?.id;
        if (evalId) {
          await conn.query('DELETE FROM interview_evaluation_details WHERE evaluation_id = ?', [evalId]);
          const score1 = s.eval.total_score >= 8 ? 5 : 3;
          const score2 = s.eval.total_score >= 8 ? 4 : 2;
          const score3 = s.eval.total_score >= 8 ? 4 : 3;
          await conn.query(`
            INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments, created_at)
            VALUES 
            (?, 1, 'Tư duy logic & Thuật toán', 0.40, ?, 'Đánh giá năng lực chuyên môn và xử lý tình huống', NOW()),
            (?, 2, 'Kiến thức Chuyên môn Kỹ thuật', 0.40, ?, 'Đánh giá kinh nghiệm thực chiến và công cụ sử dụng', NOW()),
            (?, 4, 'Làm việc nhóm & Giao tiếp kỹ thuật', 0.20, ?, 'Đánh giá kỹ năng diễn đạt và tinh thần trách nhiệm', NOW())
          `, [evalId, score1, evalId, score2, evalId, score3]);
        }
      }
    }
    console.log(`✓ Inserted/Updated ${schedulesData.length} interview schedules & evaluations for Marketing.`);

    await conn.commit();
    console.log('=== SEEDING COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    await conn.rollback();
    console.error('Seeding error:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
