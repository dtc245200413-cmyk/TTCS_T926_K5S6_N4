require('dotenv').config();
const { pool } = require('./src/config/database');

async function createTables() {
  try {
    console.log('⏳ Đang tạo 2 bảng cho Khung năng lực & Tiêu chí...');

    // 1. Tạo bảng competency_frameworks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competency_frameworks (
          framework_id INT NOT NULL AUTO_INCREMENT,
          job_title VARCHAR(100) NOT NULL,
          framework_name VARCHAR(150) NOT NULL,
          description TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (framework_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tạo bảng competency_criteria
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competency_criteria (
          criterion_id INT NOT NULL AUTO_INCREMENT,
          framework_id INT NOT NULL,
          criterion_name VARCHAR(150) NOT NULL,
          weight DECIMAL(5, 2) NOT NULL,
          description TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (criterion_id),
          CONSTRAINT fk_criteria_framework
              FOREIGN KEY (framework_id) 
              REFERENCES competency_frameworks (framework_id) 
              ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ ĐÃ TẠO THÀNH CÔNG 2 BẢNG TRONG DATABASE MYSQL!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi tạo bảng:', error.message);
    process.exit(1);
  }
}

createTables();