const db = require('./src/config/database');
const sql = `
  CREATE TABLE IF NOT EXISTS candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    status ENUM('NEW', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED') DEFAULT 'NEW',
    source_code VARCHAR(50),
    rejection_reason_code VARCHAR(50),
    recruitment_request_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;
db.pool.query(sql).then(() => {
  console.log('Candidates table created');
  process.exit(0);
}).catch(console.error);
