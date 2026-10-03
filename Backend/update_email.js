const { pool } = require('./src/config/database');

async function updateEmail() {
  try {
    const sql = `UPDATE users SET company_email = 'dtc245200413@ictu.edu.vn' WHERE company_email = 'an.nguyen@company.com'`;
    const [result] = await pool.execute(sql);
    console.log('Email updated successfully', result);
  } catch (err) {
    console.error('Error updating email:', err);
  } finally {
    process.exit(0);
  }
}

updateEmail();
