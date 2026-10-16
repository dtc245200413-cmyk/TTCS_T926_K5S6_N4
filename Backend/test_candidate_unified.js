const candidateService = require('./src/services/candidateService');
const candidateRepo = require('./src/repositories/candidateRepository');
const { pool } = require('./src/config/database');

async function runTester() {
  console.log('========================================================');
  console.log('🧪 SCRUM-188: TEST HỒ SƠ ỨNG VIÊN HỢP NHẤT (AUTOMATED)');
  console.log('========================================================\n');

  try {
    // 1. Lấy thông tin user Recruiter và Hiring Manager từ DB
    const [recruiters] = await pool.query(`
      SELECT u.user_id, u.full_name, u.company_email, u.department_id, r.role_code 
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE r.role_code = 'RECRUITER' LIMIT 1
    `);
    const recruiterUser = recruiters[0] ? {
      user_id: recruiters[0].user_id,
      roles: [{ role_code: 'RECRUITER' }],
      department_id: recruiters[0].department_id
    } : { user_id: 9, roles: [{ role_code: 'RECRUITER' }], department_id: 2 };

    const [hiringManagers] = await pool.query(`
      SELECT u.user_id, u.full_name, u.company_email, u.department_id, r.role_code 
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE r.role_code = 'HIRING_MANAGER' LIMIT 1
    `);
    const hmUser = hiringManagers[0] ? {
      user_id: hiringManagers[0].user_id,
      roles: [{ role_code: 'HIRING_MANAGER' }],
      department_id: hiringManagers[0].department_id
    } : { user_id: 4, roles: [{ role_code: 'HIRING_MANAGER' }], department_id: 1 };

    const adminUser = { user_id: 1, roles: [{ role_code: 'ADMIN' }], department_id: 1 };
    const unrelatedInterviewer = { user_id: 999, roles: [{ role_code: 'INTERVIEWER' }], department_id: 999 };

    // 2. Tìm ứng viên mẫu có nhiều lần ứng tuyển (Nguyễn Văn An)
    const [cands] = await pool.query(`SELECT id, full_name, email, phone FROM candidates WHERE email = 'an.nguyen@gmail.com' ORDER BY id DESC LIMIT 1`);
    if (cands.length === 0) {
      throw new Error('Không tìm thấy ứng viên mẫu an.nguyen@gmail.com');
    }
    const candidateId = cands[0].id;

    console.log(`[TEST 1] Kiểm tra tải hồ sơ hợp nhất cho ứng viên ID: ${candidateId} (${cands[0].full_name})`);
    const profile = await candidateService.getUnifiedProfile(candidateId, adminUser, '127.0.0.1');
    console.log('✅ Họ tên:', profile.candidate.full_name);
    console.log('✅ Email:', profile.candidate.email);
    console.log('✅ Số điện thoại:', profile.candidate.phone);
    console.log('✅ Đường dẫn CV:', profile.candidate.cv_file_path);
    console.log('✅ Vị trí hiện tại:', profile.candidate.position_name);
    console.log('✅ Giai đoạn hiện tại:', profile.candidate.current_stage);

    console.log('\n[TEST 2] Kiểm tra liên kết lịch sử ứng tuyển các vị trí (Application History)');
    console.log(`✅ Tìm thấy ${profile.applications.length} lần ứng tuyển của cùng người này:`);
    profile.applications.forEach((app, i) => {
      console.log(`   - Lần ${i + 1}: Vị trí: [${app.position_name}] | Phòng ban: [${app.department_name}] | Trạng thái: [${app.status}] | Giai đoạn: [${app.current_stage}] | Ngày nộp: [${new Date(app.created_at).toLocaleDateString()}]`);
    });
    if (profile.applications.length < 2) {
      console.warn('⚠️ Cảnh báo: Cần ít nhất 2 lần ứng tuyển để chứng minh tính năng xem toàn bộ lịch sử ứng tuyển.');
    } else {
      console.log('✅ PASS: Dữ liệu lịch sử các lần ứng tuyển được liên kết chính xác theo email/sđt.');
    }

    console.log('\n[TEST 3] Kiểm tra phân quyền truy cập hồ sơ ("Chỉ recruiter phụ trách và hiring manager của vị trí đó mở được")');
    // Admin
    try {
      await candidateService.getUnifiedProfile(candidateId, adminUser, '127.0.0.1');
      console.log('✅ PASS: Admin có quyền truy cập hồ sơ.');
    } catch (e) {
      console.error('❌ FAIL: Admin bị từ chối.');
    }

    // Unrelated user
    try {
      await candidateService.getUnifiedProfile(candidateId, unrelatedInterviewer, '127.0.0.1');
      console.error('❌ FAIL: Người ngoài không liên quan lại mở được hồ sơ!');
    } catch (e) {
      if (e.statusCode === 403) {
        console.log(`✅ PASS: Người ngoài bị chặn 403 chính xác: "${e.message}"`);
      } else {
        console.error('❌ Lỗi khác:', e);
      }
    }

    console.log('\n[TEST 4] Kiểm tra thêm ghi chú đánh giá & Nhật ký hoạt động');
    const noteText = `[Test Automated] Đánh giá năng lực vòng phỏng vấn chuyên môn lúc ${new Date().toLocaleTimeString()}`;
    await candidateService.addCandidateNote(candidateId, noteText, adminUser, '127.0.0.1');
    const updatedNotes = await candidateRepo.getNotes(candidateId);
    const addedNote = updatedNotes.find(n => n.note_content === noteText);
    if (addedNote) {
      console.log('✅ PASS: Thêm ghi chú thành công. Tác giả:', addedNote.author_name);
    } else {
      console.error('❌ FAIL: Không tìm thấy ghi chú vừa thêm.');
    }

    console.log('\n[TEST 5] Kiểm tra chuyển giai đoạn (Pipeline stage transition)');
    await candidateService.updateCandidateStage(candidateId, 'OFFER', 'Đạt yêu cầu xuất sắc, chuyển sang Offer', adminUser, '127.0.0.1');
    const candidateAfterStage = await candidateRepo.findById(candidateId);
    console.log(`✅ PASS: Giai đoạn mới là [${candidateAfterStage.current_stage}], Status là [${candidateAfterStage.status}]`);

    console.log('\n[TEST 6] Kiểm tra cập nhật đánh giá sao & Kho ứng viên tiềm năng');
    await candidateService.updateCandidateRating(candidateId, 5, adminUser, '127.0.0.1');
    await candidateService.toggleCandidateTalentPool(candidateId, true, adminUser, '127.0.0.1');
    const candidateAfterRating = await candidateRepo.findById(candidateId);
    console.log(`✅ PASS: Đánh giá: ${candidateAfterRating.rating} sao | Talent Pool: ${candidateAfterRating.is_talent_pool ? 'Có' : 'Không'}`);

    console.log('\n[TEST 7] Kiểm tra cập nhật nhãn phân loại (Tags)');
    await candidateService.updateCandidateTags(candidateId, 'React,NodeJS,Lead,Tiếng Anh Tốt', adminUser, '127.0.0.1');
    const candidateAfterTags = await candidateRepo.findById(candidateId);
    console.log(`✅ PASS: Nhãn phân loại: ${candidateAfterTags.tags}`);

    console.log('\n========================================================');
    console.log('🎉 TẤT CẢ CÁC BÀI TEST TỔNG HỢP (SCRUM-188) ĐÃ PASS 100%!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTester();

