const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'internal_recruitment_system'
  });

  const translations = {
    'Information Technology': 'Công nghệ thông tin',
    'Công Nghệ Thông Tin': 'Công nghệ thông tin',
    'Human Resources': 'Nhân sự',
    'Nhân Sự': 'Nhân sự',
    'Operations': 'Vận hành',
    'Vận Hành': 'Vận hành',
    'Marketing': 'Tiếp thị',
    'Finance': 'Tài chính',
    'Tài Chính': 'Tài chính'
  };

  for (const [en, vi] of Object.entries(translations)) {
    await connection.execute(
      'UPDATE departments SET department_name = ? WHERE department_name = ?',
      [vi, en]
    );
  }

  console.log('Departments translated successfully!');
  await connection.end();
}

run();
