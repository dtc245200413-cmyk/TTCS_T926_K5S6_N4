/** Safe server entry: never performs migrations, data seeding or SLA writes at startup. */
require('dotenv').config();
const { pool } = require('./src/config/database');
const { activate } = require('./src/services/offerRuntimeReadiness');

async function startServer({ app = require('./src/app'), database = pool, env = process.env } = {}) {
  if (!env.DB_NAME || !env.DB_USER) throw new Error('DB_NAME and DB_USER must be explicitly configured');
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PORT');
  const [[identity]] = await database.query('SELECT DATABASE() AS name');
  if (identity?.name !== env.DB_NAME) throw new Error('Connected MySQL database does not match DB_NAME');
  let readiness;
  try { readiness = await activate({ pool: database, expectedDatabase: env.DB_NAME }); }
  catch (error) { readiness = {ready:false, reason: error.code || 'PREFLIGHT_ERROR'}; }
  console.log('Offer draft schema readiness:', readiness.ready ? 'VERIFIED' : 'BLOCKED', readiness.reason);
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => {
      server.removeListener('error', reject);
      console.log(`Backend: http://127.0.0.1:${port} | DB: ${env.DB_NAME}`);
      console.log('No automatic migrations, demo seeds or port-3000 compatibility listener.');

      if (env.ENABLE_SLA_SCHEDULER === 'true') {
        const { runDailySlaCheck } = require('./src/services/slaService');

        const checkSla = () => {
          Promise.resolve()
            .then(() => runDailySlaCheck())
            .catch(error => {
              console.error('SLA check failed:', error.code || error.message);
            });
        };

        checkSla();

        const timer = setInterval(checkSla, 60 * 60 * 1000);
        timer.unref();

        server.once('close', () => clearInterval(timer));
        console.log('SLA scheduler: ENABLED');
      } else {
        console.log('SLA scheduler: DISABLED');
      }
      resolve(server);
    });
  });
}
if (require.main === module) {
  startServer().catch(error => {
    console.error('Backend startup failed:', error.code || error.message);
    process.exitCode = 1;
    pool.end().catch(() => {});
  });
}
module.exports = { startServer };
