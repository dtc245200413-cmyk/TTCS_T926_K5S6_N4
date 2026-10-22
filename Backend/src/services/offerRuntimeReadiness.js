'use strict';
// DB schema readiness only; application/decision/approver authorization remains
// mandatory inside each write transaction. No migration or data mutation.
const { inspectMetadata } = require('../../scripts/scrum103_schema_audit.cjs');
let draftSchemaReady = false;

async function activate({ pool, expectedDatabase } = {}) {
  draftSchemaReady = false;
  if (typeof pool?.getConnection !== 'function' || !expectedDatabase ||
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(expectedDatabase)) return { ready: false, reason: 'INVALID_CONFIGURATION' };
  const conn = await pool.getConnection();
  try {
    const [[identity]] = await conn.query('SELECT DATABASE() AS name');
    if (identity?.name !== expectedDatabase) return { ready: false, reason: 'DATABASE_MISMATCH' };
    const [tables] = await conn.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ?',[expectedDatabase,'BASE TABLE']);
    const [columns] = await conn.execute('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?',[expectedDatabase]);
    const [indexes] = await conn.execute('SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?',[expectedDatabase]);
    const [foreignKeys] = await conn.execute('SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL',[expectedDatabase]);
    const result = inspectMetadata({tables,columns,indexes,foreignKeys});
    const cols = new Set(columns.map(c => `${c.TABLE_NAME}.${c.COLUMN_NAME}`));
    const evidenceColumns = [
      'interview_schedules.status','interview_schedules.end_at',
      'interview_evaluations.interview_schedule_id','interview_evaluations.round_id',
      'interview_evaluations.overall_score','interview_rounds.status',
      'candidate_applications.updated_at','audit_logs.entity_id','audit_logs.action'
    ];
    const missingEvidence = evidenceColumns.filter(c => !cols.has(c));
    const statusType = columns.find(c => c.TABLE_NAME === 'candidates' && c.COLUMN_NAME === 'status')?.COLUMN_TYPE;
    if (statusType !== 'varchar(30)') missingEvidence.push('candidates.status must be VARCHAR(30)');
    draftSchemaReady = result.schemaReady && missingEvidence.length === 0;
    return { ready: draftSchemaReady, reason: draftSchemaReady ? 'SCHEMA_VERIFIED' : 'SCHEMA_NOT_READY',
      missing: [...result.issues, ...missingEvidence.map(c => `Missing column: ${c}`)] };
  } finally { conn.release(); }
}
function isDraftSchemaReady() { return draftSchemaReady; }
module.exports = { activate, isDraftSchemaReady };
