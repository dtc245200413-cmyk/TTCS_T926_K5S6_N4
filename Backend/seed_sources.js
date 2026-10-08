const db = require('./src/config/database');
const insertData = async () => {
  try {
    const connection = await db.pool.getConnection();
    await connection.query("DELETE FROM master_data WHERE category_group = 'CANDIDATE_SOURCE'");
    
    const sources = [
      { code: 'SOCIAL_MEDIA', name: 'Mạng xã hội (Social Media)', desc: 'LinkedIn, Facebook, TikTok, Zalo...', is_ref: true },
      { code: 'JOB_BOARDS', name: 'Trang đăng tin (Job Boards)', desc: 'TopCV, VietnamWorks, CareerBuilder, Glints...', is_ref: false },
      { code: 'CAREER_SITE', name: 'Website công ty (Career Site)', desc: 'Cổng tuyển dụng trực tiếp của chính doanh nghiệp.', is_ref: false },
      { code: 'REFERRAL', name: 'Giới thiệu nội bộ (Referral)', desc: 'Do nhân viên trong công ty giới thiệu người quen/đồng nghiệp cũ.', is_ref: true },
      { code: 'AGENCY', name: 'Đơn vị tuyển dụng (Headhunter/Agency)', desc: 'Qua các công ty dịch vụ săn nhân tài.', is_ref: false },
      { code: 'EVENTS', name: 'Sự kiện & Trực tiếp', desc: 'Hội chợ việc làm (Job Fair), hợp tác đại học, ứng viên tự nộp.', is_ref: false }
    ];

    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      await connection.query(
        'INSERT INTO master_data (category_group, code, name, description, display_order, is_active, is_referenced) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['CANDIDATE_SOURCE', s.code, s.name, s.desc, i + 1, true, s.is_ref]
      );
    }
    
    connection.release();
    console.log('Thêm dữ liệu thành công!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
insertData();
