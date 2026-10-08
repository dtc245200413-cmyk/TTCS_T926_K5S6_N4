const { pool } = require('./src/config/database');

async function showSchema() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables:', tableNames);
    
    for (const table of tableNames) {
      const [cols] = await pool.query(`SHOW COLUMNS FROM ${table}`);
      console.log(`\nTable: ${table}`);
      console.log(cols.map(c => `${c.Field} - ${c.Type}`).join('\n'));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

showSchema();
