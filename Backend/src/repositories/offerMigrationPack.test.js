const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../../migrations/scrum382_test_review');
const names = ['000_preflight', '005_application_code', '010_hiring_decisions', '020_offer_columns',
  '030_offer_approvals', '040_submissions_assignments', '050_postflight', 'optional/090_evaluation_summary'];
const raw = Object.fromEntries(names.map(n => [n, fs.readFileSync(path.join(root, n + '.sql.review'), 'utf8')]));
const sql = Object.fromEntries(Object.entries(raw).map(([n, text]) => [n, text.replace(/^\s*--.*$/gm, '')]));
const all = Object.values(sql).join('\n');
const main = names.filter(n => !n.startsWith('optional/')).map(n => sql[n]).join('\n');
const legacy = ['id', 'application_id', 'salary_amount', 'currency', 'start_date', 'response_deadline',
  'message', 'status', 'candidate_response', 'responded_at', 'created_at'];
const expectedAdded = ['offer_code','candidate_id','recruitment_request_id','hiring_decision_id','department_id',
  'position_id','job_title','basic_salary','expected_start_date','work_location','benefits','special_terms',
  'created_by','submitted_at','approved_at','sent_to_candidate_at','updated_at','row_version',
  'decision_source','decision_reference','decision_version'];

it('contains only reviewed SELECT/SHOW and additive DDL, without implicit activation or data writes', () => {
  const statements = all.split(';').map(s => s.trim()).filter(Boolean);
  for (const statement of statements) expect(statement).toMatch(/^(SELECT|SHOW|CREATE TABLE|ALTER TABLE)\b/);
  expect(all).not.toMatch(/\b(DROP|TRUNCATE|REPLACE|MODIFY|RENAME)\b|FOREIGN_KEY_CHECKS\s*=\s*0|IF NOT EXISTS/i);
  for (const match of all.matchAll(/\b(?:CREATE TABLE|ALTER TABLE|REFERENCES)\s+([^\s(;]+)/g)) {
    expect(match[1]).toMatch(/^internal_recruitment_test\.[a-z_]+$/);
  }
  expect(main).not.toMatch(/ALTER TABLE internal_recruitment_test\.candidates/);
  expect(main).not.toMatch(/\bpositions\b/);
});

it('adds exactly the 21 missing columns without altering any of the 11 inspected legacy columns', () => {
  const added = [...sql['020_offer_columns'].matchAll(/ADD COLUMN (\w+)/g)].map(m => m[1]);
  expect(added).toEqual(expectedAdded);
  expect(added.some(c => legacy.includes(c))).toBe(false);
  expect(sql['020_offer_columns']).not.toMatch(/uq_co_application|UNIQUE KEY.*\(application_id\)/);
  expect(sql['020_offer_columns']).toContain('ADD UNIQUE KEY uq_co_offer_code (offer_code)');
  expect(sql['020_offer_columns']).toContain('row_version BIGINT UNSIGNED NOT NULL DEFAULT 1');
});

it('allows incomplete draft content and preserves legacy status/default compatibility', () => {
  for (const declaration of ['position_id INT NULL', 'job_title VARCHAR(150) NULL',
    'basic_salary DECIMAL(15,2) NULL', 'expected_start_date DATE NULL']) {
    expect(sql['020_offer_columns']).toContain(declaration);
  }
  expect(sql['020_offer_columns']).not.toMatch(/ADD COLUMN (status|response_deadline|currency)/);
  expect(raw['020_offer_columns']).toContain('DRAFT/CHANGE_REQUESTED/PENDING_APPROVAL');
});

it('creates each missing table once, in parent-before-child order', () => {
  const tables = [...main.matchAll(/^CREATE TABLE internal_recruitment_test\.(\w+)/gm)].map(m => m[1]);
  expect(tables).toEqual(['candidate_hiring_decisions','offer_approvals','offer_submissions','offer_submission_assignments']);
  expect(new Set(tables).size).toBe(4);
  expect(main).not.toMatch(/CREATE TABLE internal_recruitment_test\.(candidate_offers|candidates)\s*\(/);
});

it('uses compatible signed parent IDs and unsigned submission IDs across all 19 foreign keys', () => {
  const targetTypes = {
    'candidate_applications.id': 'INT', 'candidates.id': 'INT', 'recruitment_requests.id': 'INT',
    'departments.department_id': 'INT', 'job_positions.position_id': 'INT', 'users.user_id': 'INT',
    'candidate_hiring_decisions.id': 'INT', 'candidate_offers.id': 'INT', 'offer_submissions.id': 'BIGINT UNSIGNED'
  };
  const fks = [...main.matchAll(/FOREIGN KEY \((\w+)\) REFERENCES internal_recruitment_test\.(\w+)\((\w+)\)/g)];
  expect(fks).toHaveLength(19);
  for (const [,column,table,key] of fks) {
    const type = targetTypes[`${table}.${key}`];
    expect(type).toBeDefined();
    const definition = new RegExp(`(?:ADD COLUMN |^\\s*)${column} (${type})\\b`, 'm');
    // application_id exists as signed INT in the inspected legacy table; all
    // other FK child columns are declared by this pack with the matching type.
    expect(column === 'application_id' || definition.test(main)).toBe(true);
  }
  const constraintNames = [...main.matchAll(/CONSTRAINT (\w+) FOREIGN KEY/g)].map(m=>m[1]);
  expect(new Set(constraintNames).size).toBe(constraintNames.length);
});

it('retains shared approval action spellings, FK semantics and lookup index', () => {
  expect(sql['030_offer_approvals']).toContain("ENUM('APPROVED','REJECTED','REQUEST_CHANGE')");
  expect(sql['030_offer_approvals']).toContain('INDEX idx_oa_offer (offer_id, action_at)');
  expect(sql['030_offer_approvals']).toContain('candidate_offers(id) ON DELETE CASCADE');
  expect(sql['030_offer_approvals']).toContain('users(user_id) ON DELETE RESTRICT');
});

it('keeps decision defaults unverified and protects per-application and per-submission identities', () => {
  expect(sql['010_hiring_decisions']).toContain("DEFAULT 'UNVERIFIED'");
  expect(sql['010_hiring_decisions']).not.toContain("DEFAULT 'PASSED'");
  expect(sql['010_hiring_decisions']).toContain('UNIQUE KEY uq_chd_application (application_id)');
  expect(sql['010_hiring_decisions']).toContain('UNIQUE KEY uq_cand_decision (candidate_id, recruitment_request_id)');
  for (const key of ['uq_offer_submission (offer_id, submission_number)',
    'uq_offer_submission_version (offer_id, offer_row_version)', 'uq_submission_approver (submission_id, approver_id)']) {
    expect(sql['040_submissions_assignments']).toContain(`UNIQUE KEY ${key}`);
  }
});

it('keeps Evaluation summary DDL optional with no invented evidence or parent-module changes', () => {
  expect(sql['005_application_code']).toContain('application_code VARCHAR(50) NULL');
  expect(sql['005_application_code']).toContain('uq_cand_app_code (application_code)');
  const optionalColumns = [...sql['optional/090_evaluation_summary'].matchAll(/ADD COLUMN (\w+)/g)].map(m=>m[1]);
  expect(optionalColumns).toEqual(['interview_decision','interview_decision_by','interview_decision_at','interview_decision_comment']);
  expect(main).not.toContain('interview_decision');
  expect(all).not.toMatch(/ALTER TABLE internal_recruitment_test\.(departments|recruitment_requests)/);
});

it('provides read-only pre/postflight without executing SQL or assuming metadata checks abort a script', () => {
  for (const n of ['000_preflight','050_postflight']) {
    for (const statement of sql[n].split(';').map(s=>s.trim()).filter(Boolean)) expect(statement).toMatch(/^(SELECT|SHOW)\b/);
  }
  expect(raw['000_preflight']).toContain('not an automatic runner');
  expect(sql['000_preflight']).toContain('HAVING COUNT(*) > 1');
  expect(sql['050_postflight']).toContain('REFERENTIAL_CONSTRAINTS');
  expect(sql['050_postflight']).toContain("'PENDING_RESPONSE','ACCEPTED','DECLINED'");
});

it('does not register the pack in Backend startup', () => {
  for (const file of ['../config/schemaMigrations.js','../../server.js']) {
    const source = fs.readFileSync(path.join(__dirname,file),'utf8');
    expect(source).not.toContain('scrum382_test_review');
  }
});
