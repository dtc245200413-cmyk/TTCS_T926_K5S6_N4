/**
 * server.js
 * Entry point of the application.
 * Loads environment variables, tests the database connection,
 * then starts the Express server.
 */

require('dotenv').config();


const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

// Test DB connection first, then start the server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('─────────────────────────────────────');
    console.log('Available endpoints:');
    console.log(`  POST http://localhost:${PORT}/api/auth/login`);
    console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
    console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
    console.log('─────────────────────────────────────');
  });
});
