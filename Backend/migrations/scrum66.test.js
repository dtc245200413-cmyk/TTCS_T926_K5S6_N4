jest.mock('../src/config/database', () => ({ pool: {} }));
const { inspect, migrate } = require('./scrum66');

test('stops before any DDL or data mutation when the request table is missing', async () => {
  const connection = {
    query: jest.fn()
      .mockResolvedValueOnce([[]]) // information_schema columns
      .mockResolvedValueOnce([[]]) // information_schema engines
      .mockResolvedValueOnce([[{ role_id: 2 }]]),
    execute: jest.fn(), beginTransaction: jest.fn()
  };
  await expect(migrate(connection)).rejects.toThrow('Missing table job_requisitions');
  for (const [sql] of connection.query.mock.calls) {
    expect(sql.trim()).toMatch(/^SELECT\b/i);
  }
  expect(connection.execute).not.toHaveBeenCalled();
  expect(connection.beginTransaction).not.toHaveBeenCalled();
});

function existingSchema() {
  const tables = {
    job_requisitions: ['requisition_id', 'requisition_code', 'department_id', 'position_id', 'headcount', 'reason',
      'proposed_min_salary', 'proposed_max_salary', 'date_needed', 'job_description', 'requirements', 'status', 'created_by', 'created_at', 'updated_at'],
    departments: ['department_id'], users: ['user_id'], roles: ['role_id', 'role_code'],
    permissions: ['permission_id', 'permission_code', 'permission_name'], role_permissions: ['role_id', 'permission_id'],
    audit_logs: ['user_id', 'performed_by', 'action', 'entity_type', 'entity_id', 'description', 'ip_address']
  };
  return Object.entries(tables).flatMap(([table, fields]) => fields.map(name => ({
    TABLE_NAME: table, COLUMN_NAME: name, DATA_TYPE: 'int', COLUMN_TYPE: 'int'
  })));
}

function connectionWithExistingRequisitions() {
  return {
    query: jest.fn(async sql => {
      if (sql.includes('information_schema.COLUMNS')) return [existingSchema()];
      if (sql.includes('information_schema.TABLES')) return [[{ TABLE_NAME: 'job_requisitions', ENGINE: 'InnoDB' }]];
      if (sql.includes("role_code = 'HR_MANAGER'")) return [[{ role_id: 2 }]];
      return [[]];
    }),
    execute: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn()
  };
}

test('preflight accepts the real baseline without recruitment_requests or the two new tables', async () => {
  const connection = connectionWithExistingRequisitions();
  await expect(inspect(connection)).resolves.toHaveProperty('job_requisitions.requisition_id');
  expect(connection.query.mock.calls.every(([sql]) => sql.trim().startsWith('SELECT'))).toBe(true);
  expect(connection.execute).not.toHaveBeenCalled();
});

test('migration plans canonical keys, foreign keys, four additive columns and HR-only permission grants', async () => {
  const connection = connectionWithExistingRequisitions();
  await migrate(connection); // All SQL is mocked: this test never applies a real migration.
  const statements = connection.query.mock.calls.map(([sql]) => sql).join('\n');
  expect(statements).not.toMatch(/recruitment_requests|DROP\s|DELETE\s|UPDATE job_requisitions/i);
  expect(statements).toMatch(/budget_id INT AUTO_INCREMENT PRIMARY KEY/);
  expect(statements).toMatch(/approval_id INT AUTO_INCREMENT PRIMARY KEY/);
  expect(statements).toMatch(/FOREIGN KEY \(requisition_id\) REFERENCES job_requisitions\(requisition_id\)/);
  expect(statements).toMatch(/FOREIGN KEY \(department_id\) REFERENCES departments\(department_id\)/);
  expect(connection.query.mock.calls.filter(([sql]) => sql.startsWith('ALTER TABLE job_requisitions ADD COLUMN'))).toHaveLength(4);
  const grants = connection.execute.mock.calls.filter(([sql]) => sql.includes('role_permissions'));
  expect(grants).toHaveLength(6);
  expect(grants.every(([sql]) => sql.includes("r.role_code = 'HR_MANAGER'") && !sql.includes('ADMIN'))).toBe(true);
});
