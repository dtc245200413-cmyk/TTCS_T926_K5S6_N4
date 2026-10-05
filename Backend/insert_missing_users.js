const { pool } = require('./src/config/database');

async function insertMissingUsers() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const hash = '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52';

    const usersToInsert = [
      [4, 'EMP007', 'Nguyễn Xuân Phú', 'dtc245200480@ictu.edu.vn', '0988888888', 'Trưởng bộ phận Marketing', hash, 'ACTIVE'],
      [3, 'EMP008', 'Lưu Quang Lực', 'dtc245200349@ictu.edu.vn', '0988888888', 'Chuyên viên Phỏng vấn Tài chính', hash, 'ACTIVE'],
      [2, 'EMP009', 'Long Minh Thành', 'dtc245200344@ictu.edu.vn', '0988888888', 'Nhân viên Tuyển dụng', hash, 'ACTIVE']
    ];

    for (const u of usersToInsert) {
      // Check if user already exists
      const [existing] = await connection.query('SELECT user_id FROM users WHERE employee_code = ?', [u[1]]);
      if (existing.length === 0) {
        await connection.query(`
          INSERT INTO users 
            (department_id, employee_code, full_name, company_email, phone_number, job_title, password_hash, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, u);
      }
    }

    // Now insert roles if missing
    const userRoles = [
      [7, 'HIRING_MANAGER'],
      [8, 'INTERVIEWER'],
      [9, 'RECRUITER']
    ];

    for (const ur of userRoles) {
      const [user] = await connection.query('SELECT user_id FROM users WHERE user_id = ?', [ur[0]]);
      if (user.length > 0) {
        const [role] = await connection.query('SELECT role_id FROM roles WHERE role_code = ?', [ur[1]]);
        if (role.length > 0) {
          const roleId = role[0].role_id;
          const [existingRole] = await connection.query('SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?', [ur[0], roleId]);
          if (existingRole.length === 0) {
            await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [ur[0], roleId]);
          }
        }
      }
    }

    await connection.commit();
    console.log('Missing users inserted successfully');
  } catch(e) {
    await connection.rollback();
    console.error(e);
  } finally {
    connection.release();
    process.exit(0);
  }
}

insertMissingUsers();
