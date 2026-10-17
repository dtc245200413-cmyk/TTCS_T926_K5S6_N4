/**
 * database.js
 * Creates and exports a MySQL connection pool.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'internal_recruitment_system',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Support Vietnamese and Unicode correctly
  charset: 'utf8mb4'
});

/**
 * Test the database connection on startup.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();

    console.log(
      '✅ MySQL connected to database:',
      process.env.DB_NAME || 'internal_recruitment_system'
    );

    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection
};