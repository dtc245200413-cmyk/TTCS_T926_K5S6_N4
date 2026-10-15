/**
 * setup_dev_db.js
 * Dựng database DEV riêng (local) để phát triển & kiểm thử độc lập.
 *
 * Cách dùng (trong thư mục Backend, sau khi đã tạo file .env):
 *   node setup_dev_db.js           # tạo DB dev + import database.sql + migration + dữ liệu mẫu
 *   node setup_dev_db.js --reset   # XOÁ rồi dựng lại DB dev từ đầu
 *
 * An toàn: script từ chối chạy nếu DB_NAME trùng với database chính của dự án.
 * Script bỏ qua các lệnh CREATE DATABASE / USE trong database.sql để không đụng DB chính.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PROTECTED_DATABASES = ['internal_recruitment_system'];
const DB_NAME = process.env.DB_NAME;
const RESET = process.argv.includes('--reset');

/** Tách file .sql thành từng câu lệnh, bỏ comment, tôn trọng chuỗi trong dấu nháy. */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (quote) {
      current += ch;
      if (ch === '\\' && quote !== '`') { current += next || ''; i++; }
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '#' || (ch === '-' && next === '-' && /[\s]/.test(sql[i + 2] || '\n'))) {
      while (i < sql.length && sql[i] !== '\n') i++;
      current += '\n';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i++;
      continue;
    }
    if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function importBaseSchema(connection) {
  const file = path.join(__dirname, '..', 'database.sql');
  const statements = splitStatements(fs.readFileSync(file, 'utf8'))
    .filter((s) => !/^(CREATE\s+DATABASE|DROP\s+DATABASE|USE)\b/i.test(s));
  let ok = 0;
  const skipped = [];
  for (const statement of statements) {
    try {
      await connection.query(statement);
      ok++;
    } catch (error) {
      skipped.push(`${statement.split('\n')[0].slice(0, 70)} -> ${error.code}`);
    }
  }
  console.log(`✔ database.sql: ${ok}/${statements.length} lệnh thành công.`);
  if (skipped.length) {
    console.log('  Lệnh bỏ qua (dự kiến: bảng candidates/ghi chú do migration của backend tạo):');
    skipped.forEach((line) => console.log(`   - ${line}`));
  }
}

async function seedSampleData(pool) {
  const q = (sql, params) => pool.query(sql, params);

  const sources = [
    ['LINKEDIN', 'LinkedIn', 1], ['TOPCV', 'TopCV', 2], ['REFERRAL', 'Giới thiệu nội bộ (Referral)', 3],
    ['FACEBOOK', 'Facebook', 4], ['CAREER_SITE', 'Website công ty', 5], ['OTHER', 'Nguồn khác', 6]
  ];
  for (const [code, name, order] of sources) {
    await q(`INSERT IGNORE INTO master_data (category_group, code, name, display_order, is_active) VALUES ('CANDIDATE_SOURCE', ?, ?, ?, 1)`, [code, name, order]);
  }
  const reasons = [['NOT_MATCH_SKILL', 'Không phù hợp kỹ năng'], ['HIGH_SALARY', 'Mức lương vượt ngân sách'], ['CULTURE_FIT', 'Không phù hợp văn hóa']];
  for (let i = 0; i < reasons.length; i++) {
    await q(`INSERT IGNORE INTO master_data (category_group, code, name, display_order, is_active) VALUES ('REJECTION_REASON', ?, ?, ?, 1)`, [reasons[i][0], reasons[i][1], i + 1]);
  }

  const [[{ positions }]] = await q('SELECT COUNT(*) AS positions FROM job_positions');
  if (!positions) {
    await q(`INSERT INTO job_positions (position_code, position_name, position_level) VALUES ('DEV_BE', 'Lập trình viên Backend', 'Senior')`);
  }
  const [[position]] = await q('SELECT MIN(position_id) AS id FROM job_positions');

  const [[{ requests }]] = await q('SELECT COUNT(*) AS requests FROM recruitment_requests');
  if (!requests) {
    await q(
      `INSERT INTO recruitment_requests (department_id, position_id, headcount, reason, status, recruiter_id, created_by)
       VALUES (1, ?, 2, 'EXPANSION', 'APPROVED', 3, 3)`, [position.id]
    );
  }
  const [[request]] = await q('SELECT MIN(id) AS id FROM recruitment_requests');

  const [[{ candidates }]] = await q('SELECT COUNT(*) AS candidates FROM candidates');
  if (!candidates) {
    await q(
      `INSERT INTO candidates (full_name, email, phone, status, source_code, recruitment_request_id, created_by) VALUES
        ('Trần Văn An',  'an.tran@example.com',  '0901234567', 'NEW',          'LINKEDIN', ?, 3),
        ('Lê Thị Bình',  'binh.le@example.com',  '0912345678', 'INTERVIEWING', 'TOPCV',    ?, 3),
        ('Phạm Quốc Cường', 'cuong.pham@example.com', '0923456789', 'REJECTED', 'REFERRAL', NULL, 9)`,
      [request.id, request.id]
    );
    const [[first]] = await q(`SELECT id FROM candidates WHERE email = 'an.tran@example.com'`);
    await q(`INSERT INTO candidate_notes (candidate_id, author_id, note_content) VALUES (?, 3, 'Ứng viên có 5 năm kinh nghiệm Node.js, cần hẹn phỏng vấn kỹ thuật.')`, [first.id]);
    await q(
      `INSERT INTO job_postings (recruitment_request_id, title, description, status, created_by)
       VALUES (?, 'Lập trình viên Backend', 'Mô tả công việc mẫu cho môi trường dev.', 'PUBLISHED', 3)`, [request.id]
    );
    const [[posting]] = await q('SELECT MAX(id) AS id FROM job_postings');
    await q(
      `INSERT INTO candidate_applications (candidate_id, job_posting_id, recruitment_request_id, status) VALUES (?, ?, ?, 'SUBMITTED')`,
      [first.id, posting.id, request.id]
    );
  }
  console.log('✔ Đã nạp dữ liệu mẫu (nguồn ứng viên, lý do loại, yêu cầu tuyển dụng, ứng viên, ghi chú, đơn ứng tuyển).');
}

async function main() {
  if (!DB_NAME) throw new Error('Thiếu DB_NAME trong Backend/.env');
  if (PROTECTED_DATABASES.includes(DB_NAME.toLowerCase())) {
    throw new Error(`DB_NAME="${DB_NAME}" là database chính của dự án. Hãy đặt tên khác, ví dụ internal_recruitment_system_dev.`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4'
  });

  if (RESET) {
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    console.log(`✔ Đã xoá database dev "${DB_NAME}".`);
  }
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${DB_NAME}\``);
  console.log(`✔ Database dev: ${DB_NAME}`);

  const [existing] = await connection.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' LIMIT 1`, [DB_NAME]
  );
  if (existing.length) {
    console.log('• Bảng users đã tồn tại → bỏ qua bước import database.sql (dùng --reset để dựng lại).');
  } else {
    await importBaseSchema(connection);
  }
  await connection.end();

  // Dùng chính migration & pool của backend để đảm bảo cấu trúc đúng với code
  const { runSchemaMigrations } = require('./src/config/schemaMigrations');
  const { pool } = require('./src/config/database');
  await runSchemaMigrations();
  console.log('✔ Đã chạy schema migrations của backend.');
  await seedSampleData(pool);
  await pool.end();

  console.log('\nHoàn tất. Tài khoản test (mật khẩu chung: 123456):');
  console.log('  Recruiter    : dtc245200852@ictu.edu.vn');
  console.log('  HR Manager   : dtc245200002@ictu.edu.vn');
  console.log('  Admin        : dtc245200413@ictu.edu.vn');
  console.log('  Không đủ quyền (Hiring Manager): dtc245200935@ictu.edu.vn');
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
