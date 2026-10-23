const { pool } = require('../src/config/database');

async function run() {
  const cols = [
    { name: 'assistant_recruiter_id', def: 'INT NULL' },
    { name: 'assignment_note', def: 'TEXT NULL' },
    { name: 'code', def: 'VARCHAR(50) NULL' },
    { name: 'title', def: 'VARCHAR(255) NULL' },
    { name: 'budget', def: 'DECIMAL(15,2) NULL' },
    { name: 'level_salary', def: 'VARCHAR(100) NULL' },
    { name: 'skills', def: 'TEXT NULL' }
  ];

  for (const c of cols) {
    const [chk] = await pool.query(`SHOW COLUMNS FROM recruitment_requests LIKE '${c.name}'`);
    if (chk.length === 0) {
      await pool.query(`ALTER TABLE recruitment_requests ADD COLUMN ${c.name} ${c.def}`);
      console.log(`Added column ${c.name}`);
    }
  }
  console.log('Finished updating recruitment_requests schema');
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
