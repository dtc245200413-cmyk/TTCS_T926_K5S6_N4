const { pool } = require('./src/config/database');

async function translateData() {
  try {
    // 1. Translate Departments
    await pool.execute("UPDATE departments SET department_name = 'Công nghệ thông tin', description = 'Phát triển phần mềm và hỗ trợ IT' WHERE department_code = 'IT'");
    await pool.execute("UPDATE departments SET department_name = 'Phòng Nhân sự', description = 'Tuyển dụng và quan hệ lao động' WHERE department_code = 'HR'");
    await pool.execute("UPDATE departments SET department_name = 'Tài chính - Kế toán', description = 'Kế toán và báo cáo tài chính' WHERE department_code = 'FIN'");
    await pool.execute("UPDATE departments SET department_name = 'Phòng Marketing', description = 'Quản trị thương hiệu và tiếp thị kỹ thuật số' WHERE department_code = 'MKT'");
    await pool.execute("UPDATE departments SET department_name = 'Phòng Vận hành', description = 'Vận hành kinh doanh và quản lý quy trình' WHERE department_code = 'OPS'");

    // 2. Translate Job Positions
    await pool.execute("UPDATE job_positions SET position_name = 'Lập trình viên Frontend' WHERE position_name = 'Frontend Developer'");
    await pool.execute("UPDATE job_positions SET position_name = 'Lập trình viên Backend' WHERE position_name = 'Backend Developer'");
    await pool.execute("UPDATE job_positions SET position_name = 'Chuyên viên Marketing' WHERE position_name = 'Marketing Executive'");
    await pool.execute("UPDATE job_positions SET position_name = 'Chuyên viên' WHERE position_name = 'chuyên viên'");

    console.log('Database translated successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

translateData();
