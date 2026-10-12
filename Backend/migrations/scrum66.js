/**
 * SCRUM-66 additive migration. Run from Backend:
 *   node migrations/scrum66.js --check   (read-only, default)
 *   node migrations/scrum66.js --apply   (explicit schema changes)
 * Never drops tables, rewrites requests, or changes existing column types.
 */
const { pool } = require('../src/config/database');

const permissions = [
  'DEPARTMENT_BUDGET_VIEW', 'DEPARTMENT_BUDGET_MANAGE', 'RECRUITMENT_REQUEST_VIEW_ALL',
  'RECRUITMENT_REQUEST_APPROVE', 'RECRUITMENT_REQUEST_REJECT', 'RECRUITMENT_REQUEST_OVERRIDE'
];

const additions = {
  job_requisitions: {
    budget_year: 'INT NULL',
    estimated_salary_cost: 'DECIMAL(20,2) NULL',
    decided_at: 'DATETIME NULL',
    decided_by: 'INT NULL'
  }
};

const required = {
  job_requisitions: ['requisition_id', 'requisition_code', 'department_id', 'position_id', 'headcount', 'reason', 'proposed_min_salary', 'proposed_max_salary',
    'date_needed', 'job_description', 'requirements', 'status', 'created_by', 'created_at', 'updated_at'],
  department_budgets: ['budget_id', 'department_id', 'budget_year', 'total_headcount', 'total_salary_budget', 'created_by', 'updated_by', 'created_at', 'updated_at'],
  recruitment_request_approvals: ['approval_id', 'requisition_id', 'approver_id', 'action', 'comments', 'created_at',
    'is_override', 'override_reason', 'exceeded_headcount', 'exceeded_salary_budget'],
  departments: ['department_id'], users: ['user_id'], roles: ['role_id', 'role_code'],
  permissions: ['permission_id', 'permission_code', 'permission_name'], role_permissions: ['role_id', 'permission_id'],
  audit_logs: ['user_id', 'performed_by', 'action', 'entity_type', 'entity_id', 'description', 'ip_address']
};

async function inspect(connection) {
  const [columns] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, DATA_TYPE, IS_NULLABLE, NUMERIC_PRECISION, NUMERIC_SCALE
    FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`);
  const schema = {};
  for (const column of columns) {
    (schema[column.TABLE_NAME] ||= {})[column.COLUMN_NAME] = column;
  }
  const problems = [];
  for (const [table, names] of Object.entries(required)) {
    if (!schema[table] && ['department_budgets', 'recruitment_request_approvals'].includes(table)) continue;
    if (!schema[table]) {
      problems.push(`Missing table ${table}`);
      continue;
    }
    for (const name of names) {
      if (!schema[table]?.[name]) problems.push(`Missing ${table}.${name}`);
    }
  }
  for (const [table, name] of [['job_requisitions', 'requisition_id'], ['users', 'user_id'], ['departments', 'department_id']]) {
    const column = schema[table]?.[name];
    if (column && (column.DATA_TYPE !== 'int' || column.COLUMN_TYPE.includes('unsigned'))) {
      problems.push(`${table}.${name} is not a signed INT; review foreign key compatibility manually`);
    }
  }
  const [engines] = await connection.query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
  for (const row of engines) {
    if (['job_requisitions', 'departments', 'users', 'department_budgets', 'recruitment_request_approvals', 'audit_logs'].includes(row.TABLE_NAME) && row.ENGINE !== 'InnoDB') {
      problems.push(`${row.TABLE_NAME} must use InnoDB for transactions`);
    }
  }
  for (const [table, fields] of Object.entries(additions)) {
    for (const [name, definition] of Object.entries(fields)) {
      const existing = schema[table]?.[name];
      if (!existing) continue;
      const type = definition.split(/[ (]/)[0].toLowerCase();
      if (existing.DATA_TYPE !== type || (type === 'decimal' && (existing.NUMERIC_PRECISION !== 20 || existing.NUMERIC_SCALE !== 2))) {
        problems.push(`Unexpected type for ${table}.${name}: ${existing.COLUMN_TYPE}`);
      }
    }
  }
  if (schema.department_budgets) {
    const [duplicates] = await connection.query('SELECT department_id, budget_year FROM department_budgets GROUP BY department_id, budget_year HAVING COUNT(*) > 1 LIMIT 1');
    if (duplicates.length) problems.push('Duplicate department/year budgets; manual review required');
  }
  const [hrRoles] = await connection.query("SELECT role_id FROM roles WHERE role_code = 'HR_MANAGER'");
  if (!hrRoles.length) problems.push('HR_MANAGER role is missing');
  if (problems.length) throw new Error(`Schema mismatch. STOP; no data/schema changes performed:\n${problems.join('\n')}`);
  return schema;
}

async function hasIndex(connection, table, fields, unique = false) {
  const [rows] = await connection.query(`SELECT INDEX_NAME, NON_UNIQUE,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list
    FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    GROUP BY INDEX_NAME, NON_UNIQUE`, [table]);
  return rows.some(row => row.columns_list === fields && (!unique || row.NON_UNIQUE === 0));
}

async function migrate(connection) {
  const schema = await inspect(connection);
  await connection.query(`CREATE TABLE IF NOT EXISTS department_budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY, department_id INT NOT NULL, budget_year INT NOT NULL,
    total_headcount INT NOT NULL, total_salary_budget DECIMAL(20,2) NOT NULL,
    created_by INT NULL, updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_dept_year (department_id, budget_year),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE IF NOT EXISTS recruitment_request_approvals (
    approval_id INT AUTO_INCREMENT PRIMARY KEY, requisition_id INT NOT NULL, approver_id INT NOT NULL,
    action ENUM('APPROVED', 'REJECTED') NOT NULL, comments TEXT NULL,
    is_override BOOLEAN NOT NULL DEFAULT FALSE, override_reason TEXT NULL,
    exceeded_headcount INT NOT NULL DEFAULT 0, exceeded_salary_budget DECIMAL(20,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requisition_id) REFERENCES job_requisitions(requisition_id),
    FOREIGN KEY (approver_id) REFERENCES users(user_id)
  ) ENGINE=InnoDB`);
  for (const [table, fields] of Object.entries(additions)) {
    for (const [name, definition] of Object.entries(fields)) {
      if (!schema[table]?.[name]) await connection.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  }
  if (!await hasIndex(connection, 'department_budgets', 'department_id,budget_year', true)) {
    await connection.query('ALTER TABLE department_budgets ADD UNIQUE KEY scrum66_dept_year (department_id, budget_year)');
  }
  if (!await hasIndex(connection, 'job_requisitions', 'department_id,budget_year,status')) {
    await connection.query('CREATE INDEX scrum66_request_budget ON job_requisitions (department_id, budget_year, status)');
  }
  await connection.beginTransaction();
  try {
    for (const permission of permissions) {
      await connection.execute('INSERT IGNORE INTO permissions (permission_code, permission_name) VALUES (?, ?)', [permission, permission]);
      await connection.execute(`INSERT IGNORE INTO role_permissions (role_id, permission_id)
        SELECT r.role_id, p.permission_id FROM roles r JOIN permissions p ON p.permission_code = ?
        WHERE r.role_code = 'HR_MANAGER'`, [permission]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  let connection;
  try {
    const mode = process.argv[2] || '--check';
    if (!['--check', '--apply'].includes(mode)) throw new Error('Use --check or --apply');
    connection = await pool.getConnection();
    if (mode === '--check') {
      const schema = await inspect(connection);
      for (const table of ['department_budgets', 'recruitment_request_approvals']) {
        console.log(`${table}: ${schema[table] ? 'exists' : 'create table with foreign keys'}`);
      }
      for (const [table, fields] of Object.entries(additions)) {
        console.log(`${table}: add ${Object.keys(fields).filter(name => !schema[table]?.[name]).join(', ') || '(none)'}`);
      }
      console.log('Preflight passed. Read-only check; migration was NOT applied.');
    } else {
      await migrate(connection);
      console.log('SCRUM-66 migration applied. Existing job_requisitions rows were not rewritten.');
    }
  } catch (error) {
    // Do not print connection credentials or raw connection errors.
    console.error(error.sql || error.code ? `Migration stopped: ${error.code || 'DATABASE_ERROR'}` : error.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

if (require.main === module) main();
module.exports = { inspect, migrate };
