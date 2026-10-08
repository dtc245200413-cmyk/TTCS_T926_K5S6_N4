const { pool } = require('./src/config/database');

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_positions (
        position_id INT AUTO_INCREMENT PRIMARY KEY,
        position_code VARCHAR(50) UNIQUE NOT NULL,
        position_name VARCHAR(150) NOT NULL,
        min_salary INT,
        max_salary INT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert some mock job positions
    await pool.query(`
      INSERT IGNORE INTO job_positions (position_code, position_name, min_salary, max_salary) VALUES 
      ('DEV_FRONTEND', 'Frontend Developer', 10000000, 20000000),
      ('DEV_BACKEND', 'Backend Developer', 12000000, 25000000),
      ('HR_EXEC', 'HR Executive', 8000000, 15000000),
      ('MKT_EXEC', 'Marketing Executive', 9000000, 18000000)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recruitment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        position_id INT NOT NULL,
        headcount INT NOT NULL,
        reason ENUM('Thay thế', 'Tăng mới') NOT NULL,
        proposed_salary_min INT,
        proposed_salary_max INT,
        needed_by_date DATE NOT NULL,
        job_description TEXT,
        candidate_requirements TEXT,
        salary_explanation TEXT,
        status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(department_id),
        FOREIGN KEY (position_id) REFERENCES job_positions(position_id),
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      );
    `);
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
