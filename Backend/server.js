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

const { runSchemaMigrations } = require('./src/config/schemaMigrations');
const { runDailySlaCheck } = require('./src/services/slaService');

// Test DB connection first, run migrations, then start the server
testConnection()
  .then(() => runSchemaMigrations())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('─────────────────────────────────────');
      console.log('Available endpoints:');
      console.log(`  POST http://localhost:${PORT}/api/auth/login`);
      console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
      console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
      console.log('─────────────────────────────────────');
      runDailySlaCheck().catch((error) => console.error('❌ SLA check failed:', error.message));
      const slaTimer = setInterval(() => {
        runDailySlaCheck().catch((error) => console.error('❌ SLA check failed:', error.message));
      }, 60 * 60 * 1000);
      slaTimer.unref();
    });

    if (Number(PORT) !== 3000) {
      try {
        const http = require('http');
        const legacyServer = http.createServer(app);
        legacyServer.listen(3000, () => {
          console.log(`🚀 Compatibility server also running on http://localhost:3000`);
        }).on('error', (err) => {
          console.log(`ℹ️ Port 3000 binding skipped: ${err.message}`);
        });
      } catch (e) {
        console.error('Error starting port 3000 compatibility server:', e);
      }
    }
  })
  .catch(async (error) => {
    console.error(`❌ Không thể khởi động backend [${error.code || 'STARTUP_ERROR'}]: ${error.message}`);
    const { pool } = require('./src/config/database');
    await pool.end();
    process.exitCode = 1;
  });
