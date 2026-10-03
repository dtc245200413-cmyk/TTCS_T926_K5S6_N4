const { pool } = require('./src/config/database');

async function checkEmails() {
  try {
    const [rows] = await pool.execute('SELECT company_email FROM users');
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkEmails();
