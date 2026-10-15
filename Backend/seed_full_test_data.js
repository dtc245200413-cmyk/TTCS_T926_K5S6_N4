const { pool } = require('./src/config/database');

async function seedData() {
  console.log('🚀 Bắt đầu nạp dữ liệu kiểm thử (10 trường hợp cho mỗi chức năng)...');

  try {
    // 1. Hồ sơ công ty (company_profile)
    console.log('1. Đang nạp Hồ sơ công ty (company_profile)...');
    const [existingProfile] = await pool.query('SELECT id FROM company_profile LIMIT 1');
    if (existingProfile.length === 0) {
      await pool.query(`
        INSERT INTO company_profile (name, description, logo_url, banner_url, website)
        VALUES (
          'Tập đoàn Công nghệ & Viễn thông TechCorp',
          'TechCorp là tập đoàn công nghệ tiên phong tại Việt Nam chuyên cung cấp các giải pháp chuyển đổi số, phần mềm quản trị doanh nghiệp và hạ tầng điện toán đám mây cho các doanh nghiệp trong nước và quốc tế.',
          '',
          '',
          'https://techcorp.vn'
        )
      `);
      console.log('   ✓ Đã tạo hồ sơ công ty');
    } else {
      console.log('   ✓ Hồ sơ công ty đã có sẵn');
    }

    // 2. Danh mục tuyển dụng (master_data) - Đảm bảo đủ ít nhất 10 mục cho mỗi danh mục chính
    console.log('2. Đang cập nhật Danh mục tuyển dụng (master_data)...');
    const masterItems = [
      // CANDIDATE_SOURCE (10 nguồn)
      ['CANDIDATE_SOURCE', 'LINKEDIN', 'LinkedIn', 'Nguồn từ mạng xã hội việc làm LinkedIn', 1],
      ['CANDIDATE_SOURCE', 'TOPCV', 'TopCV', 'Nền tảng tuyển dụng TopCV Việt Nam', 2],
      ['CANDIDATE_SOURCE', 'VIETNAMWORKS', 'VietnamWorks', 'Cổng việc làm VietnamWorks', 3],
      ['CANDIDATE_SOURCE', 'FACEBOOK', 'Facebook / Meta Groups', 'Cộng đồng mạng xã hội Facebook', 4],
      ['CANDIDATE_SOURCE', 'REFERRAL', 'Giới thiệu nội bộ (Employee Referral)', 'Cán bộ nhân viên công ty tiến cử', 5],
      ['CANDIDATE_SOURCE', 'CAREER_SITE', 'Website Tuyển dụng TechCorp', 'Ứng tuyển trực tiếp qua website công ty', 6],
      ['CANDIDATE_SOURCE', 'HEADHUNTER', 'Headhunter / Agency chuyên nghiệp', 'Đơn vị săn đầu người và cung ứng nhân sự', 7],
      ['CANDIDATE_SOURCE', 'JOB_FAIR', 'Ngày hội việc làm / Trường Đại học', 'Hội chợ việc làm tại các trường ĐH', 8],
      ['CANDIDATE_SOURCE', 'ITVIECT', 'ITviec', 'Chuyên trang tuyển dụng việc làm IT chất', 9],
      ['CANDIDATE_SOURCE', 'DIRECT_EMAIL', 'Email ứng tuyển trực tiếp', 'Ứng viên gửi CV về email tuyển dụng', 10],

      // REJECTION_REASON (10 lý do loại)
      ['REJECTION_REASON', 'NOT_MATCH_SKILL', 'Không đáp ứng yêu cầu kỹ năng chuyên môn', 'Chuyên môn chưa đạt tiêu chuẩn công việc', 1],
      ['REJECTION_REASON', 'HIGH_SALARY', 'Mức lương kỳ vọng vượt khung ngân sách', 'Đề xuất lương cao hơn dải lương cho phép', 2],
      ['REJECTION_REASON', 'CULTURE_FIT', 'Chưa phù hợp với văn hóa tổ chức', 'Khả năng hòa nhập môi trường công ty chưa tốt', 3],
      ['REJECTION_REASON', 'LACK_EXPERIENCE', 'Thiếu kinh nghiệm thực chiến theo yêu cầu', 'Số năm kinh nghiệm chưa đáp ứng tiêu chí', 4],
      ['REJECTION_REASON', 'FAILED_TEST', 'Không đạt bài kiểm tra năng lực đầu vào', 'Điểm bài test kỹ thuật dưới mức yêu cầu', 5],
      ['REJECTION_REASON', 'POOR_COMMUNICATION', 'Kỹ năng giao tiếp và làm việc nhóm hạn chế', 'Không thể hiện tốt trong phỏng vấn', 6],
      ['REJECTION_REASON', 'LANGUAGE_BARRIER', 'Trình độ ngoại ngữ không đáp ứng công việc', 'Không giao tiếp được bằng tiếng Anh', 7],
      ['REJECTION_REASON', 'CANDIDATE_DECLINED', 'Ứng viên chủ động từ chối lời mời', 'Ứng viên chọn đơn vị khác hoặc đổi định hướng', 8],
      ['REJECTION_REASON', 'OVERQUALIFIED', 'Vượt quá tiêu chuẩn cần thiết của vị trí', 'Ứng viên quá cao cấp so với mô tả công việc', 9],
      ['REJECTION_REASON', 'REFERENCE_CHECK_FAILED', 'Không đạt thẩm tra lý lịch (Reference check)', 'Thông tin kinh nghiệm không trùng khớp', 10],

      // WORK_LOCATION (10 địa điểm làm việc)
      ['WORK_LOCATION', 'HN_CAUGIAY', 'Hà Nội - Trụ sở Cầu Giấy (Tòa nhà TechCorp)', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội', 1],
      ['WORK_LOCATION', 'HN_DONGDA', 'Hà Nội - Chi nhánh Đống Đa', 'Tòa nhà Landmark, Huỳnh Thúc Kháng, Đống Đa', 2],
      ['WORK_LOCATION', 'HCM_Q1', 'TP.HCM - Trụ sở Quận 1 (Bitexco Office)', 'Số 2 Hải Triều, Bến Nghé, Quận 1', 3],
      ['WORK_LOCATION', 'HCM_Q7', 'TP.HCM - Chi nhánh Quận 7', 'Khu chế xuất Tân Thuận, Quận 7', 4],
      ['WORK_LOCATION', 'DANANG_HAI_CHAU', 'Đà Nẵng - Trung tâm Phần mềm Hải Châu', 'Đường Bạch Đằng, Hải Châu, Đà Nẵng', 5],
      ['WORK_LOCATION', 'CANTHO_NINHKIEU', 'Cần Thơ - Chi nhánh Tây Nam Bộ', 'Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ', 6],
      ['WORK_LOCATION', 'HAIPHONG_LECHAN', 'Hải Phòng - Chi nhánh Cảng', 'Đường Lê Hồng Phong, Hải Phòng', 7],
      ['WORK_LOCATION', 'BINHDUONG_THUDAUMOT', 'Bình Dương - Trung tâm R&D', 'Đại lộ Bình Dương, Thủ Dầu Một', 8],
      ['WORK_LOCATION', 'DONGNAI_BIENHOA', 'Đồng Nai - Văn phòng Kỹ thuật', 'Khu công nghiệp Biên Hòa 2', 9],
      ['WORK_LOCATION', 'REMOTE_ALL', 'Làm việc từ xa hoàn toàn (Full Remote)', 'Làm việc linh hoạt tại bất kỳ tỉnh thành', 10],

      // WORK_TYPE
      ['WORK_TYPE', 'FULLTIME', 'Toàn thời gian (Full-time)', 'Làm việc 40 giờ/tuần từ T2 đến T6', 1],
      ['WORK_TYPE', 'PARTTIME', 'Bán thời gian (Part-time)', 'Làm việc theo ca hoặc 20 giờ/tuần', 2],
      ['WORK_TYPE', 'HYBRID', 'Làm việc kết hợp (Hybrid)', '3 ngày tại văn phòng, 2 ngày tại nhà', 3],
      ['WORK_TYPE', 'FREELANCE', 'Cộng tác viên / Hợp đồng dự án (Freelance)', 'Theo giai đoạn phát triển dự án', 4],
      ['WORK_TYPE', 'INTERNSHIP', 'Thực tập sinh (Internship)', 'Dành cho sinh viên năm cuối', 5]
    ];

    for (const item of masterItems) {
      await pool.query(`
        INSERT INTO master_data (category_group, code, name, description, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), display_order = VALUES(display_order)
      `, item);
    }
    console.log('   ✓ Đã cập nhật 35 mục danh mục dùng chung (10 nguồn, 10 lý do, 10 địa điểm, 5 hình thức)');

    // 3. Quản lý phòng ban (departments) - Đảm bảo đủ 10 phòng ban
    console.log('3. Đang cập nhật Danh sách Phòng ban (10 phòng ban)...');
    const deptList = [
      ['IT', 'Công nghệ thông tin', 'Phát triển phần mềm, hạ tầng hệ thống và bảo mật CNTT'],
      ['HR', 'Nhân sự & Đào tạo', 'Tuyển dụng, quản trị phúc lợi và đào tạo phát triển nguồn nhân lực'],
      ['FIN', 'Tài chính - Kế toán', 'Quản trị ngân sách, kế toán kiểm toán và báo cáo thuế'],
      ['MKT', 'Tiếp thị & Truyền thông', 'Quảng bá thương hiệu, tiếp thị số và truyền thông nội bộ'],
      ['OPS', 'Vận hành doanh nghiệp', 'Quản trị quy trình vận hành và cơ sở vật chất'],
      ['RD', 'Nghiên cứu & Phát triển (R&D)', 'Nghiên cứu công nghệ AI, Cloud và phát triển sản phẩm mới'],
      ['QA', 'Quản lý chất lượng (QA/QC)', 'Kiểm định chất lượng sản phẩm phần mềm và kiểm thử'],
      ['SALES', 'Kinh doanh & Phát triển thị trường', 'Mở rộng khách hàng doanh nghiệp B2B và quản lý đối tác'],
      ['CS', 'Chăm sóc & Hỗ trợ khách hàng', 'Tiếp nhận phản hồi và hỗ trợ người dùng giải pháp phần mềm'],
      ['BOD', 'Ban Giám đốc & Chiến lược', 'Định hướng chiến lược phát triển bền vững của tập đoàn']
    ];

    for (const [code, name, desc] of deptList) {
      await pool.query(`
        INSERT INTO departments (department_code, department_name, description, status)
        VALUES (?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE department_name = VALUES(department_name), description = VALUES(description)
      `, [code, name, desc]);
    }
    console.log('   ✓ Đã cập nhật đủ 10 phòng ban');

    // 4. Chức danh & Dải lương (job_positions) - Đảm bảo đủ 10 chức danh
    console.log('4. Đang cập nhật Chức danh & Dải lương (10 chức danh)...');
    const posList = [
      ['SYS-ADMIN', 'Thực tập sinh Lập trình Web', 'Intern', 3000000, 6000000, 'Sinh viên năm cuối ngành CNTT, hỗ trợ kiểm thử và phát triển giao diện cơ bản.'],
      ['FRESHER-QA', 'Kỹ sư Kiểm thử phần mềm Fresher', 'Fresher', 8000000, 12000000, 'Viết kịch bản kiểm thử Manual, phối hợp lập trình viên truy tìm bug hệ thống.'],
      ['HR-REC-JR', 'Nhân viên Tuyển dụng', 'Junior', 10000000, 16000000, 'Sàng lọc hồ sơ ứng viên, sắp xếp lịch phỏng vấn và hỗ trợ tiếp nhận nhân sự.'],
      ['MKT-SPEC', 'Chuyên viên Tiếp thị số (Digital Marketing)', 'Junior', 12000000, 18000000, 'Triển khai chiến dịch quảng bá tuyển dụng, quản trị fanpage và website tuyển dụng.'],
      ['FIN-SPEC-MID', 'Chuyên viên Phỏng vấn Tài chính', 'Middle', 16000000, 24000000, 'Đánh giá năng lực nghiệp vụ kế toán - tài chính và tham gia hội đồng phỏng vấn.'],
      ['DEVOPS-ENG', 'Kỹ sư Vận hành hệ thống (DevOps & Cloud)', 'Middle', 22000000, 32000000, 'Triển khai CI/CD pipeline, quản lý container Docker, Kubernetes và giám sát server.'],
      ['DEV-SR', 'Lập trình viên Senior (Interviewer)', 'Senior', 25000000, 40000000, 'Thiết kế kiến trúc phần mềm, phát triển backend API và chấm điểm năng lực IT.'],
      ['TECH-LEAD', 'Trưởng bộ phận Kỹ thuật (Tech Lead)', 'Lead', 35000000, 50000000, 'Quản lý tiến độ dự án kỹ thuật, phân công công việc và đánh giá hiệu quả nhóm.'],
      ['HR-MGR', 'Trưởng phòng Nhân sự', 'Manager', 35000000, 55000000, 'Hoạch định chiến lược nhân sự, kiểm soát ngân sách và phê duyệt luồng duyệt.'],
      ['COO-DIR', 'Giám đốc Vận hành', 'Director', 50000000, 85000000, 'Điều hành toàn bộ hoạt động khối Vận hành và ban hành chính sách công ty.']
    ];

    for (const [code, name, level, minSal, maxSal, desc] of posList) {
      await pool.query(`
        INSERT INTO job_positions (position_code, position_name, position_level, min_salary, max_salary, description, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE position_name = VALUES(position_name), position_level = VALUES(position_level), min_salary = VALUES(min_salary), max_salary = VALUES(max_salary), description = VALUES(description)
      `, [code, name, level, minSal, maxSal, desc]);
    }
    console.log('   ✓ Đã cập nhật đủ 10 chức danh và dải lương');

    // 5. Khung năng lực & Tiêu chí & Ngân hàng câu hỏi (10 câu hỏi)
    console.log('5. Đang cập nhật Khung năng lực & Ngân hàng câu hỏi (10 câu hỏi)...');
    const compList = [
      ['Tư duy logic', 'Đánh giá khả năng suy luận logic, giải quyết bài toán phức tạp và tư duy phản biện.'],
      ['Giải quyết vấn đề', 'Khả năng phân tích nguyên nhân gốc rễ, đề xuất giải pháp khả thi và xử lý sự cố.'],
      ['Kỹ năng làm việc nhóm', 'Khả năng phối hợp, giao tiếp hiệu quả và hỗ trợ đồng đội trong công việc.'],
      ['Kiến thức chuyên môn backend', 'Hiểu biết chuyên sâu về kiến trúc hệ thống, cơ sở dữ liệu, API và tối ưu hiệu năng.'],
      ['Tiếng Anh giao tiếp', 'Khả năng đọc hiểu tài liệu kỹ thuật và trao đổi công việc bằng tiếng Anh.'],
      ['Kiến thức Kiến trúc Cloud & DevOps', 'Hiểu biết về Docker, K8s, CI/CD và kiến trúc Microservices.'],
      ['Kỹ năng Thuyết phục & Đàm phán', 'Khả năng thuyết phục ứng viên, đàm phán mức đãi ngộ và giải quyết xung đột.'],
      ['Năng lực Lãnh đạo & Quản lý', 'Khả năng dẫn dắt đội ngũ, phân chia mục tiêu OKR và truyền cảm hứng.'],
      ['Tư duy Hướng khách hàng', 'Thấu hiểu nhu cầu của người dùng nội bộ và đối tác bên ngoài.'],
      ['Đạo đức nghề nghiệp & Trách nhiệm', 'Tính trung thực, bảo mật thông tin doanh nghiệp và cam kết hoàn thành công việc.']
    ];

    for (const [name, desc] of compList) {
      const [ex] = await pool.query('SELECT id FROM competencies WHERE name = ?', [name]);
      if (ex.length === 0) {
        await pool.query('INSERT INTO competencies (name, description) VALUES (?, ?)', [name, desc]);
      }
    }

    // Câu hỏi phỏng vấn (10 câu)
    const questionsList = [
      [1, 'Medium', 'Bạn hãy giải thích sự khác biệt giữa synchronous và asynchronous programming? Khi nào nên áp dụng từng loại?', 'Ứng viên nêu rõ khái niệm blocking vs non-blocking I/O, event loop, ứng dụng trong xử lý tác vụ tốn thời gian hoặc song song.'],
      [2, 'Hard', 'Kể lại một sự cố lỗi nghiêm trọng trên production bạn từng xử lý. Các bước điều tra nguyên nhân gốc rễ và biện pháp phòng ngừa là gì?', 'Ứng viên trình bày theo mô hình STAR, thể hiện quy trình phân tích log, rollback hoặc hotfix, và viết post-mortem.'],
      [3, 'Easy', 'Khi có xung đột ý kiến với một thành viên trong nhóm về giải pháp kỹ thuật, bạn sẽ xử lý thế nào để đạt được sự đồng thuận?', 'Ứng viên đề xuất thảo luận dựa trên số liệu/dẫn chứng kỹ thuật (trade-offs), lắng nghe tích cực và tôn trọng quyết định chung.'],
      [4, 'Medium', 'Giải thích nguyên lý hoạt động của cơ chế Database Connection Pool và cách cấu hình phù hợp với tải hệ thống.', 'Ứng viên giải thích việc tái sử dụng connection thay vì mở mới liên tục, tránh quá tải RAM/CPU của DB server.'],
      [5, 'Easy', 'Can you introduce yourself and talk briefly about the most recent technology stack you worked with?', 'Ứng viên phát âm rõ ràng, sử dụng đúng từ vựng chuyên ngành, ngữ pháp cơ bản ổn định và tự tin giao tiếp.'],
      [1, 'Hard', 'Bạn tối ưu hóa một câu truy vấn SQL bị nghẽn (slow query) khi bảng dữ liệu có hơn 10 triệu bản ghi như thế nào?', 'Ứng viên trình bày việc dùng EXPLAIN ANALYZE, tạo Index phù hợp (Composite Index), tránh SELECT *, và cân nhắc Partitioning/Sharding.'],
      [2, 'Medium', 'Hãy mô tả quy trình triển khai CI/CD tự động từ khâu commit code đến khi release lên môi trường Production.', 'Ứng viên giải thích quy trình: Lint/Test -> Build Docker Image -> Push Registry -> Deploy Staging -> Automated E2E Test -> Zero-downtime Prod Deploy.'],
      [3, 'Medium', 'Bạn xử lý thế nào khi ứng viên tiềm năng nhận offer nhưng có ý định từ chối do được công ty khác trả lương cao hơn?', 'Ứng viên tìm hiểu nguyên nhân cốt lõi, làm rõ giá trị về lộ trình thăng tiến, môi trường văn hóa và đề xuất gói đãi ngộ linh hoạt.'],
      [4, 'Hard', 'Khi thiết kế hệ thống Microservices, làm sao bạn đảm bảo tính toàn vẹn dữ liệu giữa các dịch vụ phân tán?', 'Ứng viên trình bày về Saga Pattern (Choreography / Orchestration), Outbox Pattern và nguyên lý Eventual Consistency.'],
      [5, 'Medium', 'Tell me about a time you had to deliver a critical project under a very tight deadline. How did you prioritize tasks?', 'Ứng viên mô tả phương pháp phân rã công việc (MoSCoW/Eisenhower), quản lý kỳ vọng của stakeholder và đảm bảo chất lượng cốt lõi.']
    ];

    const [[{ qCount }]] = await pool.query('SELECT COUNT(*) as qCount FROM questions');
    if (qCount < 10) {
      for (let i = qCount; i < questionsList.length; i++) {
        const [cId, diff, qText, sAns] = questionsList[i];
        await pool.query(`
          INSERT INTO questions (competency_criteria_id, difficulty_level, question_text, sample_answer)
          VALUES (?, ?, ?, ?)
        `, [cId, diff, qText, sAns]);
      }
    }
    console.log('   ✓ Đã cập nhật đủ 10 câu hỏi phỏng vấn trong Ngân hàng câu hỏi');

    // 6. Yêu cầu tuyển dụng (recruitment_requests) - Đảm bảo đủ ít nhất 10 yêu cầu
    console.log('6. Đang kiểm tra Yêu cầu tuyển dụng (recruitment_requests)...');
    const [[{ reqCount }]] = await pool.query('SELECT COUNT(*) as reqCount FROM recruitment_requests');
    if (reqCount < 10) {
      await pool.query(`
        INSERT INTO recruitment_requests (department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, candidate_requirements, salary_explanation, status, recruiter_id, created_by, current_step)
        VALUES
        (1, 6, 2, 'Mở rộng quy trình DevOps cho dự án Cloud mới', 22000000, 32000000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Xây dựng CI/CD, quản lý cụm Kubernetes', 'Tối thiểu 2 năm kinh nghiệm DevOps', 'Phù hợp dải lương chức danh Kỹ sư DevOps', 'IN_PROGRESS', 3, 2, 2),
        (4, 4, 3, 'Tăng cường nhân sự chạy chiến dịch Digital Marketing Q4', 12000000, 18000000, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'Triển khai chiến dịch tiếp thị đa kênh', 'Kinh nghiệm chạy ads Facebook, Google Ads', 'Đạt chuẩn ngân sách phòng Marketing', 'DRAFT', 3, 2, 1)
      `);
    }
    console.log('   ✓ Đã có đủ ít nhất 10 yêu cầu tuyển dụng');

    // 7. Tin tuyển dụng (job_postings) - Đảm bảo có ít nhất 10 tin tuyển dụng trải đều các trạng thái
    console.log('7. Đang cập nhật Tin tuyển dụng (job_postings) đủ các trạng thái...');
    // Thêm các tin ở trạng thái DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CLOSED
    const additionalJobPostings = [
      {
        recruitment_request_id: 1,
        title: 'Kỹ sư Vận hành hệ thống (DevOps & Cloud)',
        description: '- Thiết kế và quản trị hạ tầng điện toán đám mây AWS/GCP.\n- Xây dựng và duy trì đường ống tự động CI/CD cho các dịch vụ Backend.\n- Tối ưu hóa chi phí server và thiết lập hệ thống cảnh báo Prometheus/Grafana.',
        requirements: '- Tối thiểu 2 năm kinh nghiệm làm việc với Linux, Docker, Kubernetes.\n- Thành thạo công cụ tự động hóa Terraform, Ansible hoặc Jenkins.\n- Kỹ năng xử lý sự cố mạng, bảo mật và lưu trữ dữ liệu.',
        benefits: '- Thưởng dự án theo quý hấp dẫn.\n- Cung cấp Macbook Pro M3 và màn hình 4K làm việc.\n- Gói bảo hiểm sức khỏe cao cấp Bảo Việt Care.',
        work_location: 'Hà Nội - Trụ sở Cầu Giấy',
        job_type: 'Toàn thời gian (Full-time)',
        salary_display: '22.000.000 - 32.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 25 * 86400000),
        status: 'DRAFT',
        created_by: 2
      },
      {
        recruitment_request_id: 2,
        title: 'Chuyên viên Tiếp thị số (Digital Marketing)',
        description: '- Lên kế hoạch và thực thi các chiến dịch tiếp thị thương hiệu tuyển dụng trên social.\n- Sáng tạo nội dung truyền thông, thiết kế ấn phẩm và viết bài tuyển dụng.\n- Phân tích hiệu quả các kênh thu hút ứng viên và tối ưu hóa chi phí.',
        requirements: '- Tốt nghiệp Đại học chuyên ngành Marketing, Truyền thông hoặc liên quan.\n- Có ít nhất 1 năm kinh nghiệm làm Content/Digital Marketing.\n- Biết sử dụng Photoshop/Canva cơ bản là một lợi thế.',
        benefits: '- Phụ cấp ăn trưa và gửi xe miễn phí.\n- Tham gia các khóa đào tạo nâng cao kỹ năng Marketing hàng quý.\n- Du lịch nghỉ dưỡng 2 lần/năm cùng toàn thể công ty.',
        work_location: 'TP.HCM - Trụ sở Quận 1',
        job_type: 'Toàn thời gian (Full-time)',
        salary_display: '12.000.000 - 18.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 20 * 86400000),
        status: 'PENDING_APPROVAL',
        created_by: 2,
        submitted_by: 2,
        submitted_at: new Date()
      },
      {
        recruitment_request_id: 3,
        title: 'Thực tập sinh Lập trình Web Frontend',
        description: '- Tham gia phát triển giao diện người dùng bằng ReactJS và TailwindCSS.\n- Phối hợp với đội ngũ Backend tích hợp API và hoàn thiện giao diện.\n- Tham gia viết unit test và kiểm tra tính tương thích trên các thiết bị.',
        requirements: '- Sinh viên năm cuối hoặc mới tốt nghiệp chuyên ngành CNTT/Khoa học máy tính.\n- Nắm vững kiến thức HTML, CSS, JavaScript và kiến thức cơ bản ReactJS.\n- Tinh thần học hỏi cao, chăm chỉ và chủ động trong công việc.',
        benefits: '- Hỗ trợ thực tập từ 3.000.000 - 6.000.000 VNĐ/tháng.\n- Được Senior Developer hướng dẫn trực tiếp 1-1.\n- Cơ hội được ký hợp đồng chính thức sau thời gian thực tập.',
        work_location: 'Đà Nẵng - Trung tâm Phần mềm Hải Châu',
        job_type: 'Thực tập sinh (Internship)',
        salary_display: '3.000.000 - 6.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 15 * 86400000),
        status: 'APPROVED',
        created_by: 2,
        submitted_by: 2,
        submitted_at: new Date(Date.now() - 2 * 86400000),
        reviewed_by: 2,
        reviewed_at: new Date(Date.now() - 1 * 86400000)
      },
      {
        recruitment_request_id: 4,
        title: 'Kỹ sư Kiểm thử phần mềm Fresher (Automation / Manual QA)',
        description: '- Thiết kế test case, chuẩn bị dữ liệu kiểm thử và thực hiện kiểm thử chức năng.\n- Ghi nhận lỗi lên hệ thống quản lý Jira và theo dõi quá trình sửa lỗi.\n- Tìm hiểu và tham gia xây dựng kịch bản kiểm thử tự động với Playwright.',
        requirements: '- Nắm vững quy trình kiểm thử phần mềm (STLC).\n- Cẩn thận, tỉ mỉ, có tư duy logic tốt và khả năng phát hiện lỗi sắc bén.\n- Có chứng chỉ ISTQB là một điểm cộng lớn.',
        benefits: '- Đào tạo bài bản theo lộ trình Automation QA chuyên nghiệp.\n- Môi trường làm việc trẻ trung, năng động, khuyến khích sáng tạo.\n- Teambuilding và quà tặng vào các dịp lễ tết.',
        work_location: 'Hà Nội - Trụ sở Cầu Giấy',
        job_type: 'Toàn thời gian (Full-time)',
        salary_display: '8.000.000 - 12.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 18 * 86400000),
        status: 'REJECTED',
        created_by: 2,
        submitted_by: 2,
        submitted_at: new Date(Date.now() - 5 * 86400000),
        reviewed_by: 2,
        reviewed_at: new Date(Date.now() - 3 * 86400000),
        review_note: 'Yêu cầu điều chỉnh lại dải lương đề xuất cho phù hợp với kinh nghiệm fresher.'
      },
      {
        recruitment_request_id: 5,
        title: 'Chuyên viên Nhân sự & Phúc lợi (C&B Specialist)',
        description: '- Quản lý bảng lương, thưởng và chế độ bảo hiểm xã hội của nhân viên.\n- Theo dõi chấm công, phép năm và các thủ tục hợp đồng lao động.\n- Đề xuất các chính sách phúc lợi cạnh tranh để giữ chân nhân tài.',
        requirements: '- Tối thiểu 2 năm kinh nghiệm ở vị trí C&B.\n- Am hiểu sâu về Luật Lao động và chính sách BHXH hiện hành.\n- Sử dụng thành thạo Excel nâng cao.',
        benefits: '- Lương thỏa thuận xứng đáng với năng lực.\n- Khám sức khỏe định kỳ hàng năm tại bệnh viện quốc tế.\n- Xét tăng lương định kỳ 1 năm/lần.',
        work_location: 'Hà Nội - Chi nhánh Đống Đa',
        job_type: 'Toàn thời gian (Full-time)',
        salary_display: '15.000.000 - 22.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() - 5 * 86400000),
        status: 'CLOSED',
        created_by: 2,
        submitted_by: 2,
        submitted_at: new Date(Date.now() - 40 * 86400000),
        reviewed_by: 2,
        reviewed_at: new Date(Date.now() - 38 * 86400000),
        published_by: 2,
        published_at: new Date(Date.now() - 35 * 86400000),
        closed_at: new Date(Date.now() - 2 * 86400000)
      },
      {
        recruitment_request_id: 1,
        title: 'Lập trình viên ReactJS Frontend Senior',
        description: '- Thiết kế cấu trúc giao diện Single Page Application hiện đại với ReactJS.\n- Tối ưu hiệu suất hiển thị (Core Web Vitals), SEO và trải nghiệm người dùng.\n- Phối hợp chặt chẽ với UI/UX Designer và Backend Engineer.',
        requirements: '- Tối thiểu 3 năm kinh nghiệm lập trình chuyên sâu với ReactJS, Redux/Zustand.\n- Khả năng viết clean code, áp dụng Design Patterns và Module Federation.\n- Kỹ năng giao tiếp và review code cho các thành viên junior.',
        benefits: '- Thưởng tháng 13 + thưởng hiệu quả kinh doanh từ 1-3 tháng lương.\n- Tham gia các hội thảo công nghệ quốc tế do công ty đài thọ.\n- Chế độ làm việc kết hợp linh hoạt Hybrid 2 ngày/tuần tại nhà.',
        work_location: 'Làm việc từ xa hoàn toàn (Full Remote)',
        job_type: 'Làm việc kết hợp (Hybrid)',
        salary_display: '28.000.000 - 42.000.000 VNĐ/tháng',
        deadline: new Date(Date.now() + 30 * 86400000),
        status: 'PUBLISHED',
        created_by: 2,
        submitted_by: 2,
        submitted_at: new Date(Date.now() - 10 * 86400000),
        reviewed_by: 2,
        reviewed_at: new Date(Date.now() - 9 * 86400000),
        published_by: 2,
        published_at: new Date(Date.now() - 8 * 86400000)
      }
    ];

    for (const jp of additionalJobPostings) {
      const [ex] = await pool.query('SELECT id FROM job_postings WHERE title = ?', [jp.title]);
      if (ex.length === 0) {
        await pool.query(`
          INSERT INTO job_postings (
            recruitment_request_id, title, description, requirements, benefits,
            work_location, job_type, salary_display, deadline, status,
            created_by, review_note, submitted_by, submitted_at, reviewed_by, reviewed_at,
            published_by, published_at, closed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          jp.recruitment_request_id, jp.title, jp.description, jp.requirements, jp.benefits,
          jp.work_location, jp.job_type, jp.salary_display, jp.deadline, jp.status,
          jp.created_by, jp.review_note || null, jp.submitted_by || null, jp.submitted_at || null,
          jp.reviewed_by || null, jp.reviewed_at || null, jp.published_by || null, jp.published_at || null,
          jp.closed_at || null
        ]);
      }
    }
    console.log('   ✓ Đã cập nhật đủ 12 tin tuyển dụng bao gồm tất cả các trạng thái: Bản nháp, Chờ duyệt, Đã duyệt, Đã xuất bản, Bị từ chối, Đã đóng');

    // 8. Quản lý ứng viên (candidates) - 10 TRƯỜNG HỢP KIỂM THỬ ĐẶC TRƯNG
    console.log('8. Đang nạp 10 trường hợp kiểm thử cho Quản lý ứng viên (candidates)...');
    await pool.query('DELETE FROM candidate_offers');
    await pool.query('DELETE FROM candidate_interviews');
    await pool.query('DELETE FROM candidate_applications');
    await pool.query('DELETE FROM candidates');

    const testCandidates = [
      {
        full_name: 'Trần Văn Hoàng Long',
        email: 'hoanglong.tran@gmail.com',
        phone: '0912345671',
        status: 'NEW',
        source_code: 'LINKEDIN',
        recruitment_request_id: 1,
        created_by: 2,
        resume_url: 'cv_tran_van_hoang_long.pdf'
      },
      {
        full_name: 'Nguyễn Thị Mai Phương',
        email: 'maiphuong.nguyen@gmail.com',
        phone: '0912345672',
        status: 'NEW',
        source_code: 'TOPCV',
        recruitment_request_id: 2,
        created_by: 2,
        resume_url: 'cv_nguyen_thi_mai_phuong.pdf'
      },
      {
        full_name: 'Đặng Tuấn Kiệt',
        email: 'tuankiet.dang@gmail.com',
        phone: '0912345673',
        status: 'INTERVIEWING',
        source_code: 'VIETNAMWORKS',
        recruitment_request_id: 1,
        created_by: 2,
        resume_url: 'cv_dang_tuan_kiet.pdf'
      },
      {
        full_name: 'Lê Hoàng Yến Nhi',
        email: 'yennhi.le@gmail.com',
        phone: '0912345674',
        status: 'INTERVIEWING',
        source_code: 'REFERRAL',
        recruitment_request_id: 3,
        created_by: 2,
        resume_url: 'cv_le_hoang_yen_nhi.pdf'
      },
      {
        full_name: 'Vũ Đức Thành Đạt',
        email: 'thanhdat.vu@gmail.com',
        phone: '0912345675',
        status: 'INTERVIEWING',
        source_code: 'CAREER_SITE',
        recruitment_request_id: 1,
        created_by: 2,
        resume_url: 'cv_vu_duc_thanh_dat.pdf'
      },
      {
        full_name: 'Phạm Bảo Ngọc',
        email: 'baongoc.pham@gmail.com',
        phone: '0912345676',
        status: 'OFFERED',
        source_code: 'HEADHUNTER',
        recruitment_request_id: 4,
        created_by: 2,
        resume_url: 'cv_pham_bao_ngoc.pdf'
      },
      {
        full_name: 'Bùi Quang Huy',
        email: 'quanghuy.bui@gmail.com',
        phone: '0912345677',
        status: 'OFFERED',
        source_code: 'ITVIECT',
        recruitment_request_id: 1,
        created_by: 2,
        resume_url: 'cv_bui_quang_huy.pdf'
      },
      {
        full_name: 'Ngô Đình Trí',
        email: 'dinhtri.ngo@gmail.com',
        phone: '0912345678',
        status: 'HIRED',
        source_code: 'REFERRAL',
        recruitment_request_id: 2,
        created_by: 2,
        resume_url: 'cv_ngo_dinh_tri.pdf'
      },
      {
        full_name: 'Hoàng Minh Châu',
        email: 'minhchau.hoang@gmail.com',
        phone: '0912345679',
        status: 'REJECTED',
        source_code: 'FACEBOOK',
        rejection_reason_code: 'NOT_MATCH_SKILL',
        recruitment_request_id: 3,
        created_by: 2,
        resume_url: 'cv_hoang_minh_chau.pdf'
      },
      {
        full_name: 'Đỗ Hữu Phước',
        email: 'huuphuoc.do@gmail.com',
        phone: '0912345680',
        status: 'REJECTED',
        source_code: 'TOPCV',
        rejection_reason_code: 'HIGH_SALARY',
        recruitment_request_id: 1,
        created_by: 2,
        resume_url: 'cv_do_huu_phuoc.pdf'
      }
    ];

    const insertedCandidateIds = [];
    for (const c of testCandidates) {
      const [res] = await pool.query(`
        INSERT INTO candidates (
          full_name, email, phone, status, source_code, rejection_reason_code,
          recruitment_request_id, created_by, resume_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        c.full_name, c.email, c.phone, c.status, c.source_code,
        c.rejection_reason_code || null, c.recruitment_request_id, c.created_by, c.resume_url
      ]);
      insertedCandidateIds.push(res.insertId);
    }
    console.log(`   ✓ Đã tạo thành công 10 ứng viên kiểm thử (IDs: ${insertedCandidateIds.join(', ')})`);

    // 9. Nạp 10 đơn ứng tuyển (candidate_applications), 10 lịch phỏng vấn, 10 Offer kiểm thử
    console.log('9. Đang nạp Đơn ứng tuyển, Lịch phỏng vấn và Thư mời nhận việc (10 trường hợp)...');
    for (let i = 0; i < insertedCandidateIds.length; i++) {
      const candId = insertedCandidateIds[i];
      const cand = testCandidates[i];

      // Đơn ứng tuyển (Application)
      const [appRes] = await pool.query(`
        INSERT INTO candidate_applications (
          candidate_id, job_posting_id, recruitment_request_id, status, resume_url, cover_letter, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        candId,
        (i % 5) + 1,
        cand.recruitment_request_id,
        cand.status,
        cand.resume_url,
        `Kính gửi bộ phận Tuyển dụng TechCorp, tôi là ${cand.full_name}, rất hào hứng được ứng tuyển vào vị trí của công ty.`
      ]);
      const appId = appRes.insertId;

      // Lịch phỏng vấn (10 lịch phỏng vấn)
      await pool.query(`
        INSERT INTO candidate_interviews (
          application_id, starts_at, ends_at, mode, location, meeting_url, interviewer_name, notes, status
        ) VALUES (?, DATE_ADD(NOW(), INTERVAL ? DAY), DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, ?, ?, ?, ?)
      `, [
        appId,
        i + 1,
        i + 1,
        i % 2 === 0 ? 'ONLINE' : 'OFFLINE',
        i % 2 === 0 ? 'Google Meet Trực tuyến' : 'Phòng họp Tầng 8 - Trụ sở Cầu Giấy',
        'https://meet.google.com/tc-interview-' + (i + 1),
        'Hội đồng phỏng vấn TechCorp (Hà Đức Minh, Thàng Xuân Lập)',
        `Phỏng vấn đánh giá năng lực ứng viên ${cand.full_name}`,
        cand.status === 'HIRED' || cand.status === 'OFFERED' ? 'COMPLETED' : 'SCHEDULED'
      ]);

      // Thư mời nhận việc (Offer)
      if (cand.status === 'OFFERED' || cand.status === 'HIRED') {
        await pool.query(`
          INSERT INTO candidate_offers (
            application_id, salary_amount, currency, start_date, response_deadline, message, status
          ) VALUES (?, ?, 'VND', DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), ?, ?)
        `, [
          appId,
          28000000 + i * 2000000,
          `Chúc mừng ${cand.full_name} đã xuất sắc vượt qua các vòng phỏng vấn của TechCorp!`,
          cand.status === 'HIRED' ? 'ACCEPTED' : 'PENDING'
        ]);
      }
    }
    console.log('   ✓ Đã tạo 10 đơn ứng tuyển và 10 lịch phỏng vấn/offer liên kết');

    console.log('✅ TOÀN BỘ DỮ LIỆU KIỂM THỬ ĐÃ ĐƯỢC NẠP THÀNH CÔNG VỚI ĐỦ 10 TRƯỜNG HỢP CHO TỪNG CHỨC NĂNG!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi nạp dữ liệu kiểm thử:', err);
    process.exit(1);
  }
}

seedData();
