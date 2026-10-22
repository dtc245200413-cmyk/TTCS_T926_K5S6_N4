'use strict';

// SCRUM-103 deployment schema audit. NO business rows, DDL, DML, migrations,
// server imports or startup jobs. Explicitly limited to isolated E2E database.
const path = require('node:path');

const TARGET = 'internal_recruitment_scrum103_e2e';
const REQUIRED_COLUMNS = {
  candidate_applications: ['id', 'candidate_id', 'recruitment_request_id', 'job_posting_id', 'application_code'],
  candidate_hiring_decisions: ['id', 'application_id', 'candidate_id', 'recruitment_request_id', 'department_id',
    'decision', 'decision_maker_id', 'decided_at', 'row_version', 'validity_status', 'revoked_at',
    'superseded_at', 'authority_policy', 'authority_reference'],
  candidate_offers: [
    'id', 'application_id', 'salary_amount', 'currency', 'start_date', 'response_deadline',
    'message', 'status', 'candidate_response', 'responded_at', 'created_at',
    'offer_code', 'candidate_id', 'recruitment_request_id', 'hiring_decision_id',
    'department_id', 'position_id', 'job_title', 'basic_salary', 'expected_start_date',
    'work_location', 'benefits', 'special_terms', 'created_by', 'submitted_at',
    'approved_at', 'sent_to_candidate_at', 'updated_at', 'row_version',
    'decision_source', 'decision_reference', 'decision_version'
  ],
  offer_approvals: ['id', 'offer_id', 'approver_id', 'action', 'reason', 'action_at'],
  offer_submissions: ['id', 'offer_id', 'submission_number', 'offer_row_version', 'submitted_by',
    'decision_source', 'decision_reference', 'decision_version', 'decision_snapshot', 'content_snapshot'],
  offer_submission_assignments: ['id', 'submission_id', 'approver_id', 'assigned_by',
    'assignment_source', 'assignment_reference', 'assignment_version', 'revoked_at']
};
const REQUIRED_TABLES = [
  'candidates', 'candidate_applications', 'job_postings', 'recruitment_requests',
  'departments', 'job_positions', 'users', 'user_roles', 'roles', 'audit_logs',
  ...Object.keys(REQUIRED_COLUMNS)
];
const REQUIRED_UNIQUES = [
  ['candidate_offers', ['application_id']],
  ['candidate_hiring_decisions', ['application_id']],
  ['offer_submissions', ['offer_id', 'submission_number']],
  ['offer_submissions', ['offer_id', 'offer_row_version']],
  ['offer_submission_assignments', ['submission_id', 'approver_id']]
];
// Match the reviewed SQL foreign key relationships, not just FK totals.
const REQUIRED_FOREIGN_KEYS = {
  candidate_hiring_decisions: {
    application_id: ['candidate_applications', 'id'], candidate_id: ['candidates', 'id'],
    recruitment_request_id: ['recruitment_requests', 'id'], department_id: ['departments', 'department_id'],
    decision_maker_id: ['users', 'user_id']
  },
  candidate_offers: {
    application_id: ['candidate_applications', 'id'], candidate_id: ['candidates', 'id'],
    recruitment_request_id: ['recruitment_requests', 'id'], hiring_decision_id: ['candidate_hiring_decisions', 'id'],
    department_id: ['departments', 'department_id'], position_id: ['job_positions', 'position_id'],
    created_by: ['users', 'user_id']
  },
  offer_approvals: {
    offer_id: ['candidate_offers', 'id'], approver_id: ['users', 'user_id']
  },
  offer_submissions: {
    offer_id: ['candidate_offers', 'id'], submitted_by: ['users', 'user_id']
  },
  offer_submission_assignments: {
    submission_id: ['offer_submissions', 'id'], approver_id: ['users', 'user_id'],
    assigned_by: ['users', 'user_id']
  }
};
const MIN_FOREIGN_KEYS = {
  candidate_hiring_decisions: 5,
  candidate_offers: 7,
  offer_approvals: 2,
  offer_submissions: 2,
  offer_submission_assignments: 3
};

function inspectMetadata({ tables = [], columns = [], indexes = [], foreignKeys = [] } = {}) {
  const names = new Set(tables.map(item => item.TABLE_NAME));
  const issues = [];
  for (const table of REQUIRED_TABLES) {
    if (!names.has(table)) issues.push(`Missing table: ${table}`);
  }
  const colsByTable = new Map();
  for (const col of columns) {
    if (!colsByTable.has(col.TABLE_NAME)) colsByTable.set(col.TABLE_NAME, new Set());
    colsByTable.get(col.TABLE_NAME).add(col.COLUMN_NAME);
  }
  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    if (!names.has(table)) continue;
    for (const column of required) {
      if (!colsByTable.get(table)?.has(column)) issues.push(`Missing column: ${table}.${column}`);
    }
  }
  const uniqueIndexes = new Map();
  for (const row of indexes) {
    if (Number(row.NON_UNIQUE) !== 0) continue;
    const key = `${row.TABLE_NAME}:${row.INDEX_NAME}`;
    if (!uniqueIndexes.has(key)) uniqueIndexes.set(key, []);
    uniqueIndexes.get(key).push({ column: row.COLUMN_NAME, order: Number(row.SEQ_IN_INDEX), prefix: row.SUB_PART });
  }
  for (const [table, sequence] of REQUIRED_UNIQUES) {
    if (!names.has(table)) continue;
    const match = [...uniqueIndexes.entries()].some(([key, parts]) =>
      key.startsWith(`${table}:`) && parts.length === sequence.length &&
      parts.sort((a, b) => a.order - b.order).every((part, i) =>
        part.column === sequence[i] && part.prefix == null));
    if (!match) issues.push(`Missing unique key: ${table}(${sequence.join(', ')})`);
  }
  const fkByTable = new Map();
  for (const item of foreignKeys) {
    if (!fkByTable.has(item.TABLE_NAME)) fkByTable.set(item.TABLE_NAME, new Set());
    fkByTable.get(item.TABLE_NAME).add(item.CONSTRAINT_NAME);
  }
  for (const [table, count] of Object.entries(MIN_FOREIGN_KEYS)) {
    if (names.has(table) && (fkByTable.get(table)?.size || 0) < count) {
      issues.push(`Insufficient FK count: ${table} (expected >= ${count}, found ${fkByTable.get(table)?.size || 0})`);
    }
  }
  for (const [table, relations] of Object.entries(REQUIRED_FOREIGN_KEYS)) {
    if (!names.has(table)) continue;
    for (const [column, [parent, parentColumn]] of Object.entries(relations)) {
      if (!foreignKeys.some(fk => fk.TABLE_NAME === table && fk.COLUMN_NAME === column &&
        fk.REFERENCED_TABLE_NAME === parent && fk.REFERENCED_COLUMN_NAME === parentColumn)) {
        issues.push(`Missing FK mapping: ${table}.${column} -> ${parent}.${parentColumn}`);
      }
    }
  }
  return {
    schemaReady: issues.length === 0,
    tablesFound: tables.length,
    candidateOfferColumnsFound: colsByTable.get('candidate_offers')?.size || 0,
    issues,
    // Mandatory security dependencies are deliberately NOT inferred from DDL.
    workflowReady: false,
    blockers: [
      'Application-specific lifecycle version and verified evaluation mapping',
      'Hiring Decision authority replay against trustworthy audit/evidence',
      'Trusted per-submission approver assignment and atomic approval writer',
      'Approval notifications/outbox delivery policy and owner review',
      'Real E2E rollback, concurrency and permission verification'
    ]
  };
}

async function readMetadata(connection, database = TARGET) {
  if (database !== TARGET) throw new Error('REFUSED: Only isolated SCRUM-103 E2E database is allowed');
  const [[identity]] = await connection.execute('SELECT DATABASE() AS selected_database');
  if (identity?.selected_database !== TARGET) throw new Error('REFUSED: Selected database mismatch');
  const [tables] = await connection.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`, [TARGET]);
  const [columns] = await connection.execute(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?`, [TARGET]);
  const [indexes] = await connection.execute(
    `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?`, [TARGET]);
  const [foreignKeys] = await connection.execute(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`, [TARGET]);
  return { tables, columns, indexes, foreignKeys };
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Run from Backend: node scripts/scrum103_schema_audit.cjs --e2e');
    console.log('Metadata read-only. Only internal_recruitment_scrum103_e2e. No migration, no seed.');
    return;
  }
  if (process.argv.length !== 3 || process.argv[2] !== '--e2e') {
    throw new Error('Usage: node scripts/scrum103_schema_audit.cjs --e2e');
  }
  require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
  // An extra guard prevents accidental use of a production-bound .env.
  if (process.env.DB_NAME !== 'internal_recruitment_test') {
    throw new Error('REFUSED: Backend/.env must explicitly select internal_recruitment_test as its source');
  }
  const mysql = require('mysql2/promise');
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('REFUSED: DB_USER and DB_PASSWORD must be configured');
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: TARGET,
    multipleStatements: false,
    connectTimeout: 7000
  });
  try {
    const inventory = await readMetadata(connection);
    const report = inspectMetadata(inventory);
    console.log(JSON.stringify({ database: TARGET, ...report }, null, 2));
    if (!report.schemaReady) process.exitCode = 2;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    // Do not log driver SQL, credentials or PII; errors are local/operator-focused.
    console.error(`SCHEMA_AUDIT_FAILED: ${error.code || 'SAFETY_CHECK'} (${error.message?.startsWith('REFUSED:') ? error.message : 'Check E2E connection and database configuration'})`);
    process.exitCode = 1;
  });
}

module.exports = { TARGET, REQUIRED_COLUMNS, REQUIRED_TABLES, REQUIRED_UNIQUES,
  MIN_FOREIGN_KEYS, REQUIRED_FOREIGN_KEYS, inspectMetadata, readMetadata };
