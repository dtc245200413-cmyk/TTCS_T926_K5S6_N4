const { pool } = require('./src/config/database');

async function setLongMinhThanhHrManager() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('🔄 Đang cập nhật Long Minh Thành thành Trưởng phòng Nhân sự...');

    // 1. Tìm user Long Minh Thành
    const [users] = await connection.query(
      `SELECT user_id, employee_code, full_name, company_email FROM users 
       WHERE company_email = 'dtc245200344@ictu.edu.vn' 
          OR employee_code = 'EMP009' 
          OR full_name LIKE '%Long Minh Thành%'`
    );

    if (users.length === 0) {
      console.error('❌ Không tìm thấy user Long Minh Thành!');
      process.exit(1);
    }

    const userId = users[0].user_id;
    console.log(`Tìm thấy user: ID=${userId}, Name=${users[0].full_name}, Email=${users[0].company_email}`);

    // 2. Cập nhật job_title thành 'Trưởng phòng Nhân sự' và department thành HR (dept_id = 2)
    await connection.query(
      `UPDATE users 
       SET job_title = 'Trưởng phòng Nhân sự', 
           department_id = 2,
           status = 'ACTIVE'
       WHERE user_id = ?`,
      [userId]
    );
    console.log('✅ Đã cập nhật job_title thành "Trưởng phòng Nhân sự"');

    // 3. Lấy role_id của HR_MANAGER
    const [roles] = await connection.query(
      `SELECT role_id FROM roles WHERE role_code = 'HR_MANAGER'`
    );

    if (roles.length > 0) {
      const hrManagerRoleId = roles[0].role_id;

      // Xóa role cũ nếu cần hoặc thay thế
      await connection.query(
        `DELETE FROM user_roles WHERE user_id = ?`,
        [userId]
      );

      // Thêm role HR_MANAGER
      await connection.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [userId, hrManagerRoleId]
      );
      console.log('✅ Đã gán role HR_MANAGER cho Long Minh Thành');
    }

    // 4. Xóa session cũ để user lấy profile mới
    await connection.query(
      `DELETE FROM user_sessions WHERE user_id = ?`,
      [userId]
    );

    await connection.commit();
    console.log('🎉 Hoàn tất! Long Minh Thành hiện là Trưởng phòng Nhân sự (HR_MANAGER).');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Lỗi:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

setLongMinhThanhHrManager();
