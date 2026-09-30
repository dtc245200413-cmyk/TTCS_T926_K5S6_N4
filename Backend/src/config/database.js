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
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1); // stop the server if DB is not reachable
  }
}

module.exports = { pool, testConnection };
