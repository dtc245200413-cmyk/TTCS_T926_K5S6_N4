const db = require('./src/config/database');
const insertData = async () => {
  try {
    const connection = await db.pool.getConnection();
    await connection.query("DELETE FROM master_data WHERE category_group = 'REJECTION_REASON'");
    
    const reasons = [
      { code: 'LACK_EXPERIENCE', name: 'Thiếu kinh nghiệm / Chuyên môn', desc: 'Ứng viên không đáp ứng đủ yêu cầu về kinh nghiệm hoặc kỹ năng chuyên môn.', is_ref: true },
      { code: 'FAIL_TEST', name: 'Không đạt Bài test / Ngoại ngữ', desc: 'Ứng viên không vượt qua bài kiểm tra năng lực hoặc yêu cầu ngoại ngữ.', is_ref: false },
      { code: 'HIGH_SALARY', name: 'Kỳ vọng lương quá cao', desc: 'Mức lương kỳ vọng của ứng viên vượt quá ngân sách của công ty.', is_ref: false },
      { code: 'NOT_FIT_CULTURE', name: 'Không hợp Văn hóa / Thái độ', desc: 'Ứng viên có thái độ không phù hợp hoặc không hợp với văn hóa công ty.', is_ref: true },
      { code: 'NO_SHOW', name: 'Bỏ lịch phỏng vấn (No-show)', desc: 'Ứng viên không đến tham gia phỏng vấn như lịch đã hẹn.', is_ref: false },
      { code: 'WITHDRAW', name: 'Ứng viên tự rút / Nhận việc khác', desc: 'Ứng viên chủ động rút lui hoặc đã nhận được lời mời làm việc từ công ty khác.', is_ref: false },
      { code: 'CANNOT_CONTACT', name: 'Không liên lạc được', desc: 'Không thể liên lạc được với ứng viên qua điện thoại hoặc email.', is_ref: false }
    ];

    for (let i = 0; i < reasons.length; i++) {
      const r = reasons[i];
      await connection.query(
        'INSERT INTO master_data (category_group, code, name, description, display_order, is_active, is_referenced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['REJECTION_REASON', r.code, r.name, r.desc, i + 1, true, r.is_ref]
      );
    }
    
    connection.release();
    console.log('Thêm dữ liệu lý do loại hồ sơ thành công!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
insertData();
