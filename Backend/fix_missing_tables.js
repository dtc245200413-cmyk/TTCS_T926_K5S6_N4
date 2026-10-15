const { pool } = require('./src/config/database');

async function fixMissing() {
  try {
    console.log('Fixing missing schema elements...');
    // 1. Departments status and updated_at
    const [deptCols] = await pool.query(`SHOW COLUMNS FROM departments LIKE 'status'`);
    if (deptCols.length === 0) {
      await pool.query(`ALTER TABLE departments ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'`);
      console.log('Added status to departments');
    }
    const [deptUpCols] = await pool.query(`SHOW COLUMNS FROM departments LIKE 'updated_at'`);
    if (deptUpCols.length === 0) {
      await pool.query(`ALTER TABLE departments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      console.log('Added updated_at to departments');
    }

    // 2. Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    console.log('Ensured notifications table');

    // 3. Competencies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competencies (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Ensured competencies table');

    // 4. Questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        competency_criteria_id INT NOT NULL,
        difficulty_level ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
        question_text TEXT NOT NULL,
        sample_answer TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (competency_criteria_id) REFERENCES competencies (id) ON DELETE CASCADE
      )
    `);
    console.log('Ensured questions table');

    console.log('All missing elements fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing missing schema:', err);
    process.exit(1);
  }
}

fixMissing();

