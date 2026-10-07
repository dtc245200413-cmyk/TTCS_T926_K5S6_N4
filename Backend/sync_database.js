const { pool } = require('./src/config/database');

async function sync() {
  const connection = await pool.getConnection();
  try {
    console.log('🔄 Starting full database synchronization...');
    await connection.beginTransaction();

    // 1. Sync roles
    const roles = [
      ['ADMIN', 'Quản trị hệ thống', 'Người vận hành ứng dụng, quản lý tài khoản, vai trò, danh mục'],
      ['HR_MANAGER', 'Trưởng phòng Nhân sự', 'Chủ sở hữu toàn bộ hoạt động tuyển dụng'],
      ['RECRUITER', 'Nhân viên tuyển dụng', 'Người vận hành tuyển dụng hằng ngày'],
      ['HIRING_MANAGER', 'Trưởng bộ phận', 'Người cần người, sở hữu vị trí tuyển dụng'],
      ['INTERVIEWER', 'Người phỏng vấn', 'Nhân sự được mời tham gia một vòng phỏng vấn'],
      ['APPROVER', 'Người duyệt', 'Ban giám đốc hoặc cấp duyệt theo hạn mức'],
      ['CANDIDATE', 'Ứng viên', 'Người nộp hồ sơ từ bên ngoài, không có tài khoản nội bộ']
    ];

    for (const [code, name, desc] of roles) {
      await connection.query(
        `INSERT INTO roles (role_code, role_name, description)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description)`,
        [code, name, desc]
      );
    }
    console.log('✅ Roles synchronized.');

    // 2. Sync role permissions
    await connection.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.role_code = 'ADMIN'
    `);

    await connection.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM roles r
      JOIN permissions p ON p.permission_code IN ('USER_VIEW','USER_CREATE','USER_UPDATE','ROLE_VIEW')
      WHERE r.role_code = 'HR_MANAGER'
    `);

    await connection.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM roles r
      JOIN permissions p ON p.permission_code IN ('USER_VIEW','ROLE_VIEW')
      WHERE r.role_code = 'RECRUITER'
    `);

    await connection.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.role_id, p.permission_id
      FROM roles r
      JOIN permissions p ON p.permission_code = 'USER_VIEW'
      WHERE r.role_code IN ('INTERVIEWER', 'HIRING_MANAGER', 'APPROVER')
    `);
    console.log('✅ Role permissions synchronized.');

    // 3. Clear conflicting company_emails temporarily to prevent duplicate key error during swap
    await connection.query(`UPDATE users SET company_email = CONCAT('tmp_', user_id, '_', company_email)`);

    // Valid hash for password '123456'
    const passwordHash = '$2b$10$gbHbInH/QcTxXm0uTBEOLeub6.KUca8lGdywMat/XAb9awabEwT1W';

    const usersData = [
      { dept: 1, code: 'EMP001', name: 'Nguyễn Thị Hồng Nhung', email: 'dtc245200413@ictu.edu.vn', phone: '0988888888', title: 'Quản trị viên Hệ thống', role: 'ADMIN' },
      { dept: 2, code: 'EMP002', name: 'Hà Đức Minh',           email: 'dtc245200002@ictu.edu.vn', phone: '0988888888', title: 'Trưởng phòng Nhân sự', role: 'HR_MANAGER' },
      { dept: 2, code: 'EMP003', name: 'Nguyễn Anh Sơn',        email: 'dtc245200852@ictu.edu.vn', phone: '0988888888', title: 'Nhân viên Tuyển dụng', role: 'RECRUITER' },
      { dept: 1, code: 'EMP004', name: 'Mã Dương Quốc',         email: 'dtc245200935@ictu.edu.vn', phone: '0988888888', title: 'Trưởng bộ phận Kỹ thuật', role: 'HIRING_MANAGER' },
      { dept: 1, code: 'EMP005', name: 'Thàng Xuân Lập',        email: 'dtc245200571@ictu.edu.vn', phone: '0988888888', title: 'Lập trình viên Senior (Interviewer)', role: 'INTERVIEWER' },
      { dept: 5, code: 'EMP006', name: 'Thào A Pông',           email: 'dtc245200592@ictu.edu.vn', phone: '0988888888', title: 'Giám đốc Vận hành (Approver)', role: 'APPROVER' },
      { dept: 4, code: 'EMP007', name: 'Nguyễn Xuân Phú',       email: 'dtc245200480@ictu.edu.vn', phone: '0988888888', title: 'Trưởng bộ phận Marketing', role: 'HIRING_MANAGER' },
      { dept: 3, code: 'EMP008', name: 'Lưu Quang Lực',         email: 'dtc245200349@ictu.edu.vn', phone: '0988888888', title: 'Chuyên viên Phỏng vấn Tài chính', role: 'INTERVIEWER' },
      { dept: 2, code: 'EMP009', name: 'Long Minh Thành',       email: 'dtc245200344@ictu.edu.vn', phone: '0988888888', title: 'Trưởng phòng Nhân sự', role: 'HR_MANAGER' }
    ];

    for (const u of usersData) {
      const [rows] = await connection.query('SELECT user_id FROM users WHERE employee_code = ?', [u.code]);
      let userId;
      if (rows.length > 0) {
        userId = rows[0].user_id;
        await connection.query(
          `UPDATE users SET 
             department_id = ?, full_name = ?, company_email = ?, phone_number = ?, 
             job_title = ?, password_hash = ?, status = 'ACTIVE', failed_login_attempts = 0, locked_until = NULL
           WHERE user_id = ?`,
          [u.dept, u.name, u.email, u.phone, u.title, passwordHash, userId]
        );
      } else {
        const [res] = await connection.query(
          `INSERT INTO users 
             (department_id, employee_code, full_name, company_email, phone_number, job_title, password_hash, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [u.dept, u.code, u.name, u.email, u.phone, u.title, passwordHash]
        );
        userId = res.insertId;
      }

      // Assign primary role
      const [roleRows] = await connection.query('SELECT role_id FROM roles WHERE role_code = ?', [u.role]);
      if (roleRows.length > 0) {
        const roleId = roleRows[0].role_id;
        await connection.query(
          `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [userId, roleId]
        );
      }
    }
    console.log('✅ Users and user_roles synchronized.');

    // 4. Fix competency tables schema if needed
    const [colsF] = await connection.query(`SHOW COLUMNS FROM competency_frameworks LIKE 'framework_code'`);
    if (colsF.length === 0) {
      console.log('Fixing competency_frameworks schema...');
      // Check if job_title column exists
      const [colsJT] = await connection.query(`SHOW COLUMNS FROM competency_frameworks LIKE 'job_title'`);
      if (colsJT.length > 0) {
        await connection.query(`
          ALTER TABLE competency_frameworks 
          CHANGE COLUMN job_title framework_code VARCHAR(50) NOT NULL
        `);
      } else {
        await connection.query(`
          ALTER TABLE competency_frameworks 
          ADD COLUMN framework_code VARCHAR(50) NOT NULL AFTER framework_id
        `);
      }
      try {
        await connection.query(`ALTER TABLE competency_frameworks ADD CONSTRAINT uq_cf_code UNIQUE (framework_code)`);
      } catch (e) {
        // ignore if index already exists
      }
    }

    const [colsC] = await connection.query(`SHOW COLUMNS FROM competency_criteria LIKE 'criteria_id'`);
    if (colsC.length === 0) {
      console.log('Fixing competency_criteria schema...');
      const [colsCritId] = await connection.query(`SHOW COLUMNS FROM competency_criteria LIKE 'criterion_id'`);
      if (colsCritId.length > 0) {
        await connection.query(`
          ALTER TABLE competency_criteria 
          CHANGE COLUMN criterion_id criteria_id INT NOT NULL AUTO_INCREMENT
        `);
      }
      const [colsCritName] = await connection.query(`SHOW COLUMNS FROM competency_criteria LIKE 'criterion_name'`);
      if (colsCritName.length > 0) {
        await connection.query(`
          ALTER TABLE competency_criteria 
          CHANGE COLUMN criterion_name criteria_name VARCHAR(150) NOT NULL
        `);
      }
    }

    console.log('✅ Competency tables schema verified.');

    // Update any existing competency framework code if blank or Vietnamese
    await connection.query(`UPDATE competency_frameworks SET framework_code = 'FW_BACKEND_01' WHERE framework_id = 1`);

    await connection.commit();
    console.log('🎉 Full synchronization completed successfully!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

sync();
