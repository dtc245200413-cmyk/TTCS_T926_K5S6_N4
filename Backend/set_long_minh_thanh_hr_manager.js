const { pool } = require('./src/config/database');

async function updateRoles() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log('🔄 Đang cập nhật phân quyền theo yêu cầu...');

    // Lấy role_id cho HR_MANAGER và RECRUITER
    const [roles] = await connection.query(`SELECT role_id, role_code FROM roles WHERE role_code IN ('HR_MANAGER', 'RECRUITER')`);
    const hrManagerRoleId = roles.find(r => r.role_code === 'HR_MANAGER')?.role_id;
    const recruiterRoleId = roles.find(r => r.role_code === 'RECRUITER')?.role_id;

    if (!hrManagerRoleId || !recruiterRoleId) {
      throw new Error('Không tìm thấy role_id cho HR_MANAGER hoặc RECRUITER!');
    }

    // 1. Hà Đức Minh: Trưởng phòng Nhân sự (HR_MANAGER)
    await connection.query(
      `UPDATE users 
       SET job_title = 'Trưởng phòng Nhân sự', 
           department_id = 2,
           status = 'ACTIVE'
       WHERE company_email = 'dtc245200002@ictu.edu.vn' OR employee_code = 'EMP002'`
    );
    const [userMinh] = await connection.query(`SELECT user_id FROM users WHERE company_email = 'dtc245200002@ictu.edu.vn'`);
    if (userMinh.length > 0) {
      const minhId = userMinh[0].user_id;
      await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [minhId]);
      await connection.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [minhId, hrManagerRoleId]);
      await connection.query(`DELETE FROM user_sessions WHERE user_id = ?`, [minhId]);
      console.log('✅ Đã cập nhật Hà Đức Minh (EMP002) thành Trưởng phòng Nhân sự (HR_MANAGER)');
    }

    // 2. Long Minh Thành: Nhân viên Tuyển dụng (RECRUITER)
    await connection.query(
      `UPDATE users 
       SET job_title = 'Nhân viên Tuyển dụng', 
           department_id = 2,
           status = 'ACTIVE'
       WHERE company_email = 'dtc245200344@ictu.edu.vn' OR employee_code = 'EMP009'`
    );
    const [userThanh] = await connection.query(`SELECT user_id FROM users WHERE company_email = 'dtc245200344@ictu.edu.vn'`);
    if (userThanh.length > 0) {
      const thanhId = userThanh[0].user_id;
      await connection.query(`DELETE FROM user_roles WHERE user_id = ?`, [thanhId]);
      await connection.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [thanhId, recruiterRoleId]);
      await connection.query(`DELETE FROM user_sessions WHERE user_id = ?`, [thanhId]);
      console.log('✅ Đã cập nhật Long Minh Thành (EMP009) thành Nhân viên Tuyển dụng (RECRUITER)');
    }

    await connection.commit();
    console.log('🎉 Hoàn tất cập nhật cơ sở dữ liệu thành công!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Lỗi:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

updateRoles();
