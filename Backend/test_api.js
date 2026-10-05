/**
 * Script kiểm thử API SCRUM-71: Quản lý khung năng lực & Kiểm tra trọng số 100%
 */
const BASE_URL = 'http://localhost:5000/api/competencies';

async function runTests() {
  console.log('==================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ API SCRUM-71 (Node.js & MySQL)');
  console.log('==================================================\n');

  // TEST 1: Thử tạo với tổng trọng số != 100% (Nghiệp vụ cốt lõi)
  console.log('🧪 TEST 1: Kiểm tra validate tổng trọng số != 100% (Kỳ vọng: Bị từ chối)...');
  const invalidData = {
    job_title: 'Lập trình viên Backend',
    framework_name: 'Khung năng lực Backend Junior',
    description: 'Đánh giá năng lực ứng viên Backend',
    criteria: [
      { criterion_name: 'Kỹ năng Node.js & Express', weight: 40 },
      { criterion_name: 'Kỹ năng CSDL MySQL', weight: 30 }
      // Tổng mới có 70% -> Thiếu 30%
    ]
  };

  try {
    const res1 = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    });
    const result1 = await res1.json();
    if (!result1.success) {
      console.log('   ✅ PASS TEST 1! Server đã chặn thành công:');
      console.log(`      👉 Thông báo lỗi: "${result1.message}"\n`);
    } else {
      console.log('   ❌ FAIL TEST 1: Server không chặn khi trọng số khác 100%!\n');
    }
  } catch (err) {
    console.log('   ❌ Lỗi kết nối server:', err.message);
  }

  // TEST 2: Tạo với tổng trọng số chuẩn 100% (40 + 30 + 30 = 100)
  console.log('🧪 TEST 2: Tạo khung năng lực với tổng trọng số đúng 100% (Kỳ vọng: Thành công)...');
  const validData = {
    job_title: 'Lập trình viên Backend',
    framework_name: 'Khung năng lực Backend Chuẩn',
    description: 'Bộ tiêu chí đánh giá tuyển dụng nội bộ',
    criteria: [
      { criterion_name: 'Kỹ năng Node.js & Express', weight: 40, description: 'RESTful API, Middleware' },
      { criterion_name: 'Kỹ năng CSDL MySQL', weight: 30, description: 'Thiết kế bảng, tối ưu query' },
      { criterion_name: 'Kỹ năng Git & Teamwork', weight: 30, description: 'Quản lý nhánh, giải quyết conflict' }
    ]
  };

  let createdId = null;
  try {
    const res2 = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData)
    });
    const result2 = await res2.json();
    if (result2.success) {
      createdId = result2.data.framework_id;
      console.log('   ✅ PASS TEST 2! Tạo thành công khung năng lực:');
      console.log(`      👉 ID: ${result2.data.framework_id} | Chức danh: ${result2.data.job_title}`);
      console.log(`      👉 Số tiêu chí đã lưu: ${result2.data.criteria.length} tiêu chí\n`);
    } else {
      console.log('   ❌ FAIL TEST 2:', result2.message, '\n');
    }
  } catch (err) {
    console.log('   ❌ Lỗi kết nối server:', err.message);
  }

  // TEST 3: Lấy danh sách khung năng lực
  console.log('🧪 TEST 3: Gọi API GET /api/competencies (Kỳ vọng: Lấy danh sách thành công)...');
  try {
    const res3 = await fetch(BASE_URL);
    const result3 = await res3.json();
    if (result3.success) {
      console.log('   ✅ PASS TEST 3! Lấy danh sách thành công:');
      console.log(`      👉 Tổng số khung năng lực hiện có: ${result3.data.length}\n`);
    }
  } catch (err) {
    console.log('   ❌ Lỗi kết nối server:', err.message);
  }

  console.log('==================================================');
  console.log('🎉 HOÀN THÀNH KIỂM THỬ SCRUM-71!');
  console.log('==================================================');
}

runTests();