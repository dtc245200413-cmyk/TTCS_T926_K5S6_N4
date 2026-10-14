/**
 * database.js
 * Creates and exports a MySQL connection pool.
 * Using mysql2/promise so we can use async/await in queries.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
// A pool manages multiple connections automatically,
// which is better than creating a new connection for every request.
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'internal_recruitment_system',
  waitForConnections: true,
  connectionLimit:    10,   // max 10 simultaneous connections
  queueLimit:         0     // unlimited queue
});

/**
 * Test the database connection on startup.
 * Logs a message and exits if the connection fails.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected to database:', process.env.DB_NAME);
    connection.release(); // release the connection back to the pool
  } catch (error) {
    const code = error.code || error.errors?.[0]?.code || 'UNKNOWN';
    console.error(`❌ MySQL connection failed [${code}]: ${error.message || 'Không thể kết nối cơ sở dữ liệu.'}`);
    if (code === 'ECONNREFUSED') {
      console.error('Hãy bật MySQL và kiểm tra DB_HOST / DB_PORT trong Backend/.env.');
    } else if (code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Kiểm tra DB_USER / DB_PASSWORD trong Backend/.env.');
    } else if (code === 'ER_BAD_DB_ERROR') {
      console.error('Chưa có database. Nhập database.sql theo HUONG_DAN_CHAY.md.');
    }
    process.exit(1); // stop the server if DB is not reachable
  }
}

module.exports = { pool, testConnection };
