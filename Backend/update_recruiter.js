const { pool } = require('./src/config/database');

async function setRecruiter() {
  const [users] = await pool.query("SELECT user_id, full_name, company_email FROM users WHERE company_email LIKE '%245200344%'");
  if (users.length > 0) {
    const uid = users[0].user_id;
    await pool.query('UPDATE recruitment_requests SET recruiter_id = ?', [uid]);
    console.log(`Assigned recruiter_id = ${uid} (${users[0].full_name}) to all recruitment_requests`);
  }
  process.exit(0);
}

setRecruiter().catch(console.error);

