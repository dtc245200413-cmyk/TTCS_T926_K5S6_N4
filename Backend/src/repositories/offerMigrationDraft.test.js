const fs = require('fs');
const path = require('path');
const vm = require('vm');
const draft = fs.readFileSync(path.join(__dirname, '../../migrations/scrum382_offer_drafts.sql.draft'), 'utf8');
const ddl = draft.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n');

it('preserves data: catalogue has no data mutations, destructive DDL or weakened constraints', () => {
  expect(ddl).not.toMatch(/^\s*(DROP|TRUNCATE|DELETE|INSERT|REPLACE)\b/im);
  expect(ddl).not.toMatch(/^\s*UPDATE\s|SET\s+FOREIGN_KEY_CHECKS|MODIFY\s+(?:COLUMN\s+)?application_id/gim);
  expect(ddl).toContain('UNIQUE KEY uq_co_application (application_id)');
  expect(ddl).toContain('UNIQUE KEY uq_cand_decision (candidate_id, recruitment_request_id)');
  expect(draft).toContain('NOT a runnable migration');
  expect(draft).toContain('mutually exclusive');
});

it('makes draft contents nullable, retains Portal columns and starts old decisions UNVERIFIED', () => {
  for (const [column, type] of [['position_id', 'INT'], ['job_title', 'VARCHAR(150)'],
    ['basic_salary', 'DECIMAL(15,2)'], ['expected_start_date', 'DATE'], ['response_deadline', 'DATE']]) {
    expect(ddl).toContain(`MODIFY COLUMN ${column} ${type} NULL`);
  }
  for (const column of ['salary_amount', 'start_date', 'row_version', 'created_by', 'submitted_at']) {
    expect(ddl).toContain(`ADD COLUMN ${column}`);
  }
  expect(ddl).toContain("DEFAULT 'UNVERIFIED'");
  expect(ddl).not.toContain("DEFAULT 'PASSED'");
});

it('protects independent submission identities and concrete approvers with matching FK types', () => {
  expect(ddl).toContain('UNIQUE KEY uq_offer_submission (offer_id, submission_number)');
  expect(ddl).toContain('UNIQUE KEY uq_offer_submission_version (offer_id, offer_row_version)');
  expect(ddl).toContain('UNIQUE KEY uq_submission_approver (submission_id, approver_id)');
  expect(ddl).toContain('submission_id BIGINT UNSIGNED NOT NULL');
  expect(ddl).toContain('REFERENCES offer_submissions(id) ON DELETE RESTRICT');
  expect(ddl).toContain('decision_snapshot JSON NOT NULL');
  expect(ddl).toContain('content_snapshot JSON NOT NULL');
  expect(ddl).not.toMatch(/ALTER TABLE offer_approvals/);
});

it('requires inventory and duplicate checks rather than blindly accepting existing definitions', () => {
  expect(ddl).toContain('information_schema.COLUMNS');
  expect(ddl).toContain('information_schema.STATISTICS');
  expect(ddl).toContain('information_schema.REFERENTIAL_CONSTRAINTS');
  expect(ddl).toContain('HAVING COUNT(*) > 1');
  expect(ddl).not.toContain('CREATE TABLE IF NOT EXISTS');
});

it('does not register or execute this draft or the dormant Evaluation migration on module import', () => {
  const filename = path.join(__dirname, '../config/schemaMigrations.js');
  const source = fs.readFileSync(filename, 'utf8');
  const query = jest.fn(() => { throw new Error('No SQL may run during this test'); });
  const context = { module: { exports: {} }, require: name => {
    if (name !== './database') throw new Error(`Unexpected import ${name}`);
    return { pool: { query } };
  } };
  vm.runInNewContext(source, context, { filename });
  expect(query).not.toHaveBeenCalled();
  expect(Object.keys(context.module.exports)).toEqual(['runSchemaMigrations']);
  expect(context.module.exports.runSchemaMigrations.toString()).not.toMatch(/scrum382|pendingCandidateEvaluationMigrations/);
  expect(source).not.toContain('scrum382_offer_drafts');
});

it('keeps the unresolved authority and assignment dependencies closed without any SQL', async () => {
  const dependencies = require('./offerPersistenceDependencies');
  const conn = { query: jest.fn() };
  await expect(dependencies.verifyDecisionAuthority({}, {}, conn)).rejects.toMatchObject({ statusCode: 503 });
  await expect(dependencies.resolveSubmissionAssignments({}, {}, {}, conn)).rejects.toMatchObject({ statusCode: 503 });
  expect(conn.query).not.toHaveBeenCalled();
});
