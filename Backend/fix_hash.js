const { pool } = require('./src/config/database');

async function fixHash() {
  const hash = '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52';
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
