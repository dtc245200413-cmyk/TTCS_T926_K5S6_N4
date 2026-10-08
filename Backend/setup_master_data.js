const db = require('./src/config/database');

const createTable = async () => {
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS master_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_group VARCHAR(50) NOT NULL,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_group_code (category_group, code)
      )
    `);
    
    // Insert some default data
    await db.pool.query(`
      INSERT IGNORE INTO master_data (category_group, code, name, description, display_order) VALUES
      ('CANDIDATE_SOURCE', 'LINKEDIN', 'LinkedIn', 'Nguồn từ mạng xã hội LinkedIn', 1),
      ('CANDIDATE_SOURCE', 'FACEBOOK', 'Facebook', 'Nguồn từ mạng xã hội Facebook', 2),
      ('CANDIDATE_SOURCE', 'REFERRAL', 'Giới thiệu nội bộ', 'Nhân viên giới thiệu', 3),
      
      ('REJECTION_REASON', 'NOT_MATCH_SKILL', 'Không phù hợp kỹ năng', 'Kỹ năng không đáp ứng yêu cầu', 1),
      ('REJECTION_REASON', 'HIGH_SALARY', 'Lương vượt ngân sách', 'Mức lương kỳ vọng quá cao', 2),
      ('REJECTION_REASON', 'CULTURE_FIT', 'Không phù hợp văn hóa', 'Văn hóa công ty không phù hợp', 3),
      
      ('WORK_LOCATION', 'HN_CAUGIAY', 'Hà Nội - Cầu Giấy', 'Văn phòng Cầu Giấy, Hà Nội', 1),
      ('WORK_LOCATION', 'HCM_Q1', 'TP.HCM - Quận 1', 'Văn phòng Quận 1, TP.HCM', 2),
      
      ('WORK_TYPE', 'FULLTIME', 'Toàn thời gian (Full-time)', 'Làm việc toàn thời gian', 1),
      ('WORK_TYPE', 'PARTTIME', 'Bán thời gian (Part-time)', 'Làm việc bán thời gian', 2),
      ('WORK_TYPE', 'FREELANCE', 'Cộng tác viên (Freelance)', 'Làm việc tự do', 3)
    `);
    
    console.log('Master data table created and seeded');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

createTable();
