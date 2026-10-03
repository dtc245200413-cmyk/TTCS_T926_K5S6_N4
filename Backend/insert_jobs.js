const mysql = require('mysql2/promise');

async function run() {
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'123456', database:'internal_recruitment_system'});
  const [users] = await c.query("SELECT user_id FROM users WHERE employee_code = 'EMP008'");
  if (users.length > 0) {
    const userId = users[0].user_id;
    // We need department_id and position_id. Let's get the first ones or insert them.
    const [depts] = await c.query('SELECT department_id FROM departments LIMIT 1');
    const deptId = depts[0] ? depts[0].department_id : 1;
    
    // Check if any job_positions exist
    const [positions] = await c.query('SELECT position_id FROM job_positions LIMIT 1');
    let posId;
    if (positions.length === 0) {
       const [res] = await c.query("INSERT INTO job_positions (position_code, position_name) VALUES ('DEV', 'Developer')");
       posId = res.insertId;
    } else {
       posId = positions[0].position_id;
    }
    
    await c.query("INSERT INTO job_requisitions (requisition_code, department_id, position_id, headcount, status, created_by) VALUES ('REQ008', ?, ?, 2, 'PENDING', ?)", [deptId, posId, userId]);
                   
    console.log('Inserted mock job requisitions for EMP008 (userId ' + userId + ')');
  } else {
    console.log('EMP008 not found');
  }
  await c.end();
}
run();
