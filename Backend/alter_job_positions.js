const { pool } = require('./src/config/database');

async function alterTable() {
  try {
    await pool.query("ALTER TABLE job_positions ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE', ADD COLUMN position_level VARCHAR(50);");
    console.log("Altered successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
alterTable();
