const { pool } = require('./src/config/database');

const users = [
  { code: 'EMP001', name: 'Nguyễn Thị Hồng Nhung', email: 'dtc245200413@ictu.edu.vn' },
  { code: 'EMP002', name: 'Hà Đức Minh', email: 'dtc245200002@ictu.edu.vn' },
  { code: 'EMP003', name: 'Nguyễn Anh Sơn', email: 'dtc245200852@ictu.edu.vn' },
  { code: 'EMP004', name: 'Mã Dương Quốc', email: 'dtc245200935@ictu.edu.vn' },
  { code: 'EMP005', name: 'Thàng Xuân Lập', email: 'dtc245200571@ictu.edu.vn' },
  { code: 'EMP006', name: 'Thảo A Pồng', email: 'dtc245200592@ictu.edu.vn' },
  { code: 'EMP007', name: 'Nguyễn Xuân Phú', email: 'dtc245200480@ictu.edu.vn' },
  { code: 'EMP008', name: 'Lưu Quang Lực', email: 'dtc245200349@ictu.edu.vn' },
  { code: 'EMP009', name: 'Long Minh Thành', email: 'dtc245200344@ictu.edu.vn' }
];

async function updateAll() {
  try {
    for (const u of users) {
      const sql = "UPDATE users SET full_name = ?, company_email = ? WHERE employee_code = ?";
      await pool.execute(sql, [u.name, u.email, u.code]);
      console.log(`Updated ${u.code}`);
    }
    console.log('All users updated successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

updateAll();
