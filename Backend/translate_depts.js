const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'internal_recruitment_system'
  });

  const translations = {
    'Information Technology': 'Công Nghệ Thông Tin',
    'Human Resources': 'Nhân Sự',
    'Operations': 'Vận Hành',
    'Marketing': 'Marketing',
    'Finance': 'Tài Chính'
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
