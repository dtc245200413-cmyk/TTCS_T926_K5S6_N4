const candidateService = require('./src/services/candidateService');
const { pool } = require('./src/config/database');

async function runTestSearchFilter() {
  console.log('========================================================');
  console.log('🧪 SCRUM-365: KIỂM THỬ TÌM KIẾM, BỘ LỌC ĐA TIÊU CHÍ VÀ PHÂN TRANG');
  console.log('========================================================\n');

  try {
    const adminUser = { user_id: 1, roles: [{ role_code: 'ADMIN' }], department_id: 1 };

    // 1. Test tìm kiếm theo tên, email, SĐT
    console.log('[TEST 1] Tìm kiếm theo từ khóa (Họ tên, Email, SĐT):');
    const searchByName = await candidateService.getAllCandidates(adminUser, { search: 'Nam' });
    console.log(`✅ Tìm theo tên "Nam": ${searchByName.pagination.total} kết quả (Họ tên: ${searchByName.candidates.map(c=>c.full_name).join(', ')})`);
    if (!searchByName.candidates.some(c => c.full_name.includes('Nam'))) throw new Error('Tìm kiếm theo tên thất bại.');

    const searchByEmail = await candidateService.getAllCandidates(adminUser, { search: 'outlook.com' });
    console.log(`✅ Tìm theo email "outlook.com": ${searchByEmail.pagination.total} kết quả (${searchByEmail.candidates[0]?.email})`);
    if (!searchByEmail.candidates.some(c => c.email.includes('outlook.com'))) throw new Error('Tìm kiếm theo email thất bại.');

    const searchByPhone = await candidateService.getAllCandidates(adminUser, { search: '0945678901' });
    console.log(`✅ Tìm theo SĐT "0945678901": ${searchByPhone.pagination.total} kết quả (${searchByPhone.candidates[0]?.full_name})`);
    if (searchByPhone.pagination.total === 0) throw new Error('Tìm kiếm theo SĐT thất bại.');

    // 2. Test lọc theo giai đoạn tuyển dụng
    console.log('\n[TEST 2] Lọc theo giai đoạn tuyển dụng (Pipeline Stage):');
    const filterInterview = await candidateService.getAllCandidates(adminUser, { stage: 'INTERVIEW' });
    console.log(`✅ Giai đoạn "INTERVIEW": ${filterInterview.pagination.total} ứng viên`);
    filterInterview.candidates.forEach(c => {
      if (c.current_stage !== 'INTERVIEW' && c.status !== 'INTERVIEWING') throw new Error('Lọc theo stage không khớp.');
    });

    const filterOffer = await candidateService.getAllCandidates(adminUser, { stage: 'OFFER' });
    console.log(`✅ Giai đoạn "OFFER": ${filterOffer.pagination.total} ứng viên`);

    // 3. Test lọc theo nguồn ứng tuyển
    console.log('\n[TEST 3] Lọc theo nguồn ứng tuyển (CANDIDATE_SOURCE):');
    const filterLinkedIn = await candidateService.getAllCandidates(adminUser, { source: 'LINKEDIN' });
    console.log(`✅ Nguồn "LINKEDIN": ${filterLinkedIn.pagination.total} ứng viên`);
    filterLinkedIn.candidates.forEach(c => {
      if (c.source_code !== 'LINKEDIN') throw new Error('Lọc theo nguồn không khớp.');
    });

    // 4. Test lọc theo nhãn (Tags)
    console.log('\n[TEST 4] Lọc theo nhãn (Tags):');
    const filterReactTag = await candidateService.getAllCandidates(adminUser, { tag: 'React' });
    console.log(`✅ Nhãn "React": ${filterReactTag.pagination.total} ứng viên (Danh sách: ${filterReactTag.candidates.map(c=>c.full_name).join(', ')})`);
    filterReactTag.candidates.forEach(c => {
      if (!c.tags || !c.tags.includes('React')) throw new Error('Lọc theo tag không khớp.');
    });

    // 5. Test lọc theo khoảng thời gian nộp
    console.log('\n[TEST 5] Lọc theo khoảng ngày nộp hồ sơ (from_date -> to_date):');
    const filterDate = await candidateService.getAllCandidates(adminUser, { from_date: '2026-10-01', to_date: '2026-10-15' });
    console.log(`✅ Nộp từ 01/10/2026 đến 15/10/2026: ${filterDate.pagination.total} ứng viên`);
    filterDate.candidates.forEach(c => {
      const d = new Date(c.created_at);
      if (d < new Date('2026-10-01 00:00:00') || d > new Date('2026-10-15 23:59:59')) {
        throw new Error('Ngày nộp ngoài khoảng yêu cầu.');
      }
    });

    // 6. Test kết hợp nhiều điều kiện lọc cùng lúc (Multi-criteria combined filter)
    console.log('\n[TEST 6] Kết hợp nhiều điều kiện lọc cùng lúc (Multi-criteria combined):');
    const combinedFilter = await candidateService.getAllCandidates(adminUser, {
      search: 'Linh',
      source: 'FACEBOOK',
      stage: 'REJECTED'
    });
    console.log(`✅ Kết hợp [search="Linh" + source="FACEBOOK" + stage="REJECTED"]: ${combinedFilter.pagination.total} ứng viên`);
    if (combinedFilter.pagination.total !== 1 || !combinedFilter.candidates[0].full_name.includes('Bùi Phương Linh')) {
      throw new Error('Lọc kết hợp nhiều điều kiện không cho kết quả chính xác.');
    }
    console.log(`   -> Kết quả chính xác: ${combinedFilter.candidates[0].full_name} (${combinedFilter.candidates[0].email})`);

    // 7. Test phân trang (Pagination)
    console.log('\n[TEST 7] Kiểm tra tính năng phân trang (Pagination):');
    const page1 = await candidateService.getAllCandidates(adminUser, { page: 1, limit: 5 });
    const page2 = await candidateService.getAllCandidates(adminUser, { page: 2, limit: 5 });
    console.log(`✅ Tổng số hồ sơ: ${page1.pagination.total} hồ sơ`);
    console.log(`✅ Trang 1: ${page1.candidates.length} hồ sơ | Tổng số trang: ${page1.pagination.totalPages}`);
    console.log(`✅ Trang 2: ${page2.candidates.length} hồ sơ`);
    if (page1.candidates[0].id === page2.candidates[0].id) {
      throw new Error('Dữ liệu giữa các trang bị trùng lặp.');
    }
    console.log('✅ Phân trang hoạt động chính xác, dữ liệu chuyển đổi mượt mà.');

    // 8. Test bộ lọc và quyền hạn truy cập (Scope restriction)
    console.log('\n[TEST 8] Kiểm tra phạm vi dữ liệu theo quyền hạn (Scope restriction):');
    const hmUser = { user_id: 4, roles: [{ role_code: 'HIRING_MANAGER' }], department_id: 1 };
    const hmResults = await candidateService.getAllCandidates(hmUser, {});
    console.log(`✅ Hiring Manager phòng ban 1 thấy: ${hmResults.pagination.total} ứng viên`);
    hmResults.candidates.forEach(c => {
      if (c.department_id && c.department_id !== 1 && c.hiring_manager_id !== 4) {
        throw new Error('Hiring manager thấy hồ sơ ngoài phạm vi phòng ban được phép.');
      }
    });
    console.log('✅ PASS: Dữ liệu tìm kiếm chỉ nằm trong phạm vi người dùng được phép xem.');

    console.log('\n========================================================');
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ (SCRUM-365) ĐÃ ĐẠT 100%!');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTestSearchFilter();

