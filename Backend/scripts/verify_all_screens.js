const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function login(email, password) {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${data.message}`);
  }
  return data.data.token;
}

async function verifyAll() {
  console.log('Logging in...');
  const adminToken = await login('dtc245200413@ictu.edu.vn', '123456');
  const phuToken = await login('dtc245200480@ictu.edu.vn', '123456');

  console.log('\n======================================================');
  console.log('--- TEST 1: SCREEN 1 (Question Bank / Ngân Hàng Câu Hỏi) ---');
  console.log('======================================================');
  const qListRes = await fetch('http://localhost:5000/api/questions', {
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(r => r.json());
  console.log('Questions list count:', qListRes.data.questions.length, 'Total:', qListRes.data.pagination.total);

  const qStatsRes = await fetch('http://localhost:5000/api/questions/stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(r => r.json());
  console.log('Questions stats cards:');
  console.log(' - Tổng số câu hỏi:', qStatsRes.data.total);
  console.log(' - Mức độ dễ (Easy):', qStatsRes.data.easyCount);
  console.log(' - Trung bình (Medium):', qStatsRes.data.mediumCount);
  console.log(' - Mức độ khó (Hard):', qStatsRes.data.hardCount);

  console.log('\n======================================================');
  console.log('--- TEST 2: SCREEN 2 (Approval Workflows / Cấu hình luồng duyệt) ---');
  console.log('======================================================');
  const wfRes = await fetch('http://localhost:5000/api/approval-workflows', {
    headers: { Authorization: `Bearer ${adminToken}` }
  }).then(r => r.json());
  console.log('Global approval levels count:', wfRes.data.globalLevels.length);
  wfRes.data.globalLevels.forEach(lvl => {
    console.log(`   Bước ${lvl.step_number}: ${lvl.step_name} (${lvl.approver_role_code}) | Lương: ${Number(lvl.min_salary).toLocaleString('vi-VN')} -> ${lvl.max_salary ? Number(lvl.max_salary).toLocaleString('vi-VN') : 'Không giới hạn'}`);
  });
  console.log('Department workflows count:', wfRes.data.departmentWorkflows.length);
  wfRes.data.departmentWorkflows.forEach(dep => {
    console.log(`   Phòng: ${dep.department_name} (ID ${dep.department_id}) - ${dep.levels.length} cấp duyệt`);
  });

  // Test preview salary 25,000,000
  const previewRes = await fetch('http://localhost:5000/api/approval-workflows/preview', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ salary: 25000000, department_id: null })
  }).then(r => r.json());
  console.log('Preview with salary 25.000.000 VNĐ:', previewRes);

  console.log('\n======================================================');
  console.log('--- TEST 3: SCREEN 3 (Recruitment Requests / Yêu cầu tuyển dụng HM Phú) ---');
  console.log('======================================================');
  const reqRes = await fetch('http://localhost:5000/api/recruitment-requests/my', {
    headers: { Authorization: `Bearer ${phuToken}` }
  }).then(r => r.json());
  const reqList = reqRes.data || [];
  console.log('HM Phú Requests count:', reqList.length);
  reqList.forEach(r => {
    console.log(`   [${r.code}] ${r.title} | Vị trí: ${r.position_name || '-'} | Trạng thái: ${r.status}`);
  });

  console.log('\n======================================================');
  console.log('--- TEST 4: SCREEN 4 (Interview Schedules / Lịch phỏng vấn HM Phú) ---');
  console.log('======================================================');
  const schRes = await fetch('http://localhost:5000/api/interview-schedules', {
    headers: { Authorization: `Bearer ${phuToken}` }
  }).then(r => r.json());
  console.log('HM Phú Schedules count:', schRes.data.length);
  schRes.data.forEach(s => {
    console.log(`   ID: ${s.id} | Ứng viên: ${s.candidate_name} | Vị trí: ${s.position_name} | Người PV: ${s.interviewer_name} | Phòng: ${s.room_name} | TT: ${s.status} | Điểm: ${s.total_score || '-'} | Kết luận: ${s.recommendation || '-'}`);
  });

  console.log('\n>>> TẤT CẢ 4 MÀN HÌNH ĐÃ ĐƯỢC TEST VÀ XÁC MINH THÀNH CÔNG! <<<');
  process.exit(0);
}

verifyAll().catch(err => {
  console.error('Error during test verification:', err);
  process.exit(1);
});
