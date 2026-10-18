const { pool } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function updateData() {
  try {
    const hash = await bcrypt.hash('123456', 12);
    
    const updates = [
      { id: 1, name: 'Nguyễn Thị Hồng Nhung', email: 'nhung.nguyen@company.com' },
      { id: 2, name: 'Hà Đức Minh', email: 'minh.ha@company.com' },
      { id: 3, name: 'Nguyễn Anh Sơn', email: 'son.nguyen@company.com' },
      { id: 4, name: 'Nguyễn Xuân Phú', email: 'phu.nguyen@company.com' },
      { id: 5, name: 'Long Minh Thành', email: 'thanh.long@company.com' },
      { id: 6, name: 'Thàng Xuân Lập', email: 'lap.thang@company.com' },
    ];

    for (const u of updates) {
      await pool.execute('UPDATE users SET full_name = ?, company_email = ? WHERE user_id = ?', [u.name, u.email, u.id]);
    }

    const inserts = [
      { name: 'Lưu Quang Lực', email: 'luc.luu@company.com', code: 'EMP007' },
      { name: 'Thào a Pông', email: 'pong.thao@company.com', code: 'EMP008' },
    ];

    for (const u of inserts) {
      // Check if they already exist
      const [rows] = await pool.execute('SELECT user_id FROM users WHERE company_email = ?', [u.email]);
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO users (department_id, employee_code, full_name, company_email, password_hash, status) VALUES (1, ?, ?, ?, ?, "ACTIVE")',
          [u.code, u.name, u.email, hash]
        );
      }
    }

    console.log("Database updated successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
updateData();
