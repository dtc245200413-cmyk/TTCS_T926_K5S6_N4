const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAvatarColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'internal_recruitment'
  });

  try {
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL;
    `);
    console.log('Successfully added avatar_url to users table.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column avatar_url already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    await connection.end();
  }
}

addAvatarColumn();
