const { pool } = require('../src/config/database');

async function fixCompetency() {
  console.log('🔧 Bắt đầu sửa phân quyền và nạp dữ liệu Khung năng lực...');

  try {
    // 1. Thêm quyền COMPETENCY_VIEW vào bảng permissions
    await pool.query(`
      INSERT INTO permissions (permission_code, permission_name)
      VALUES ('COMPETENCY_VIEW', 'Xem khung năng lực')
      ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name)
    `);
    console.log('   ✓ Đã thêm quyền COMPETENCY_VIEW vào bảng permissions');

    // Lấy ID của COMPETENCY_VIEW và COMPETENCY_MANAGE
    const [perms] = await pool.query(`
      SELECT permission_id, permission_code FROM permissions 
      WHERE permission_code IN ('COMPETENCY_VIEW', 'COMPETENCY_MANAGE')
    `);
    const viewId = perms.find(p => p.permission_code === 'COMPETENCY_VIEW')?.permission_id;
    const manageId = perms.find(p => p.permission_code === 'COMPETENCY_MANAGE')?.permission_id;

    // Gán quyền COMPETENCY_VIEW cho ADMIN (1), HR_MANAGER (2), RECRUITER (3), HIRING_MANAGER (4), INTERVIEWER (5)
    for (const roleId of [1, 2, 3, 4, 5]) {
      if (viewId) {
        await pool.query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
        `, [roleId, viewId]);
      }
    }
    // Gán quyền COMPETENCY_MANAGE cho ADMIN (1), HR_MANAGER (2)
    for (const roleId of [1, 2]) {
      if (manageId) {
        await pool.query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
        `, [roleId, manageId]);
      }
    }
    console.log('   ✓ Đã gán quyền xem và quản lý khung năng lực cho các vai trò');

    // 2. Nạp thêm các khung năng lực phong phú
    const frameworks = [
      {
        code: 'CF_BUSINESS',
        name: 'Khung Năng Lực Khối Kinh Doanh & Tiếp Thị (Sales & Marketing)',
        desc: 'Đánh giá kỹ năng đàm phán, tìm kiếm khách hàng, thấu hiểu thị trường và đạt mục tiêu doanh số.',
        criteria: [
          ['Kỹ năng Đàm phán & Thuyết phục', 35, 'Khả năng thuyết phục khách hàng, xử lý phản bác và chốt hợp đồng'],
          ['Thấu hiểu Thị trường & Sản phẩm', 25, 'Hiểu biết sâu sắc về sản phẩm công nghệ và đối thủ cạnh tranh'],
          ['Kỹ năng Giao tiếp & Xây dựng Mối quan hệ', 25, 'Xây dựng mạng lưới đối tác bền vững, tạo dựng lòng tin'],
          ['Quản trị Mục tiêu & Chỉ số KPI/OKR', 15, 'Cam kết hoàn thành chỉ tiêu doanh thu và báo cáo tiến độ minh bạch']
        ]
      },
      {
        code: 'CF_QA_QC',
        name: 'Khung Năng Lực Kỹ Sư Kiểm Thử Phần Mềm (QA/QC Engineer)',
        desc: 'Đánh giá năng lực thiết kế test case, kiểm thử tự động, truy tìm lỗi và bảo đảm chất lượng sản phẩm.',
        criteria: [
          ['Tư duy Kiểm thử & Thiết kế Test Case', 40, 'Nắm vững quy trình STLC, kỹ thuật phân vùng tương đương và phân tích giá trị biên'],
          ['Kỹ năng Kiểm thử Tự động (Automation QA)', 25, 'Kinh nghiệm viết script kiểm thử tự động với Playwright, Selenium, Cypress'],
          ['Phân tích & Quản lý Lỗi (Bug Lifecycle)', 20, 'Khả năng tái hiện bug, phân tích log và mô tả lỗi chi tiết trên Jira'],
          ['Tỉ mỉ & Chú trọng Chi tiết', 15, 'Tính cẩn trọng cao độ, không bỏ sót các trường hợp ngoại lệ (Edge Cases)']
        ]
      },
      {
        code: 'CF_HR_REC',
        name: 'Khung Năng Lực Chuyên Viên Tuyển Dụng & Nhân Sự (HR & Recruiter)',
        desc: 'Đánh giá năng lực thu hút nhân tài, đánh giá ứng viên, thấu hiểu luật lao động và văn hóa tổ chức.',
        criteria: [
          ['Kỹ năng Phỏng vấn & Đánh giá Con người', 35, 'Áp dụng mô hình STAR để khai thác năng lực và độ phù hợp văn hóa của ứng viên'],
          ['Kỹ năng Tìm nguồn Ứng viên (Talent Sourcing)', 30, 'Sử dụng thành thạo LinkedIn Recruiter, TopCV và các cộng đồng IT để tìm ứng viên'],
          ['Hiểu biết Luật Lao động & Chế độ Phúc lợi', 20, 'Nắm vững luật lao động, chính sách BHXH và xây dựng gói offer hấp dẫn'],
          ['Kỹ năng Giao tiếp & Trải nghiệm Ứng viên', 15, 'Tạo trải nghiệm ứng tuyển tích cực, giữ liên lạc chuyên nghiệp với ứng viên']
        ]
      },
      {
        code: 'CF_LEADERSHIP',
        name: 'Khung Năng Lực Quản Lý & Lãnh Đạo (Team Lead & Manager)',
        desc: 'Đánh giá năng lực dẫn dắt đội ngũ, hoạch định chiến lược, ra quyết định và truyền cảm hứng.',
        criteria: [
          ['Tầm nhìn Chiến lược & Hoạch định Mục tiêu', 35, 'Xây dựng kế hoạch dài hạn, phân bổ nguồn lực và kiểm soát tiến độ'],
          ['Năng lực Dẫn dắt & Đào tạo Đội ngũ', 30, 'Kèm cặp 1-1, trao quyền cho nhân viên và xây dựng văn hóa làm việc tích cực'],
          ['Ra Quyết định & Quản trị Rủi ro', 20, 'Đưa ra quyết định quyết đoán dựa trên số liệu và xử lý khủng hoảng nhanh nhạy'],
          ['Trí tuệ Cảm xúc (EQ) & Giải quyết Xung đột', 15, 'Thấu hiểu tâm lý nhân sự, lắng nghe tích cực và hòa giải xung đột nội bộ']
        ]
      }
    ];

    for (const f of frameworks) {
      const [ex] = await pool.query('SELECT framework_id FROM competency_frameworks WHERE framework_code = ?', [f.code]);
      let fId;
      if (ex.length > 0) {
        fId = ex[0].framework_id;
        await pool.query('UPDATE competency_frameworks SET framework_name = ?, description = ? WHERE framework_id = ?', [f.name, f.desc, fId]);
        // Xóa tiêu chí cũ để nạp lại đầy đủ
        await pool.query('DELETE FROM competency_criteria WHERE framework_id = ?', [fId]);
      } else {
        const [ins] = await pool.query(`
          INSERT INTO competency_frameworks (framework_code, framework_name, description)
          VALUES (?, ?, ?)
        `, [f.code, f.name, f.desc]);
        fId = ins.insertId;
      }

      for (const [name, weight, desc] of f.criteria) {
        await pool.query(`
          INSERT INTO competency_criteria (framework_id, criteria_name, weight, description)
          VALUES (?, ?, ?, ?)
        `, [fId, name, weight, desc]);
      }
    }

    console.log('✅ Đã nạp thành công các khung năng lực phong phú!');
    await pool.end();
  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  }
}

fixCompetency();
