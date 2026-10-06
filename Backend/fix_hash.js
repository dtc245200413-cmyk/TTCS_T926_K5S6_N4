const { pool } = require('./src/config/database');

async function fixHash() {
  const hash = '$2b$10$gbHbInH/QcTxXm0uTBEOLeub6.KUca8lGdywMat/XAb9awabEwT1W';
  try {
    await pool.query('UPDATE users SET password_hash = ?, failed_login_attempts = 0', [hash]);
    console.log('Fixed passwords successfully');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

fixHash();
