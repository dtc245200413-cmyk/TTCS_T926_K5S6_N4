
require('dotenv').config();

const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log('Database: MySQL');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
