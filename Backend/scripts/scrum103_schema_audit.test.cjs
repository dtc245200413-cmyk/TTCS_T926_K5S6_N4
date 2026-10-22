'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REQUIRED_TABLES, REQUIRED_COLUMNS, REQUIRED_UNIQUES, MIN_FOREIGN_KEYS, REQUIRED_FOREIGN_KEYS,
  inspectMetadata, readMetadata, TARGET } = require('./scrum103_schema_audit.cjs');

function healthyInventory() {
  const tables = REQUIRED_TABLES.map(TABLE_NAME => ({ TABLE_NAME }));
  const columns = Object.entries(REQUIRED_COLUMNS).flatMap(([TABLE_NAME, names]) =>
    names.map(COLUMN_NAME => ({ TABLE_NAME, COLUMN_NAME })));
  const indexes = REQUIRED_UNIQUES.flatMap(([TABLE_NAME, names], i) => names.map((COLUMN_NAME, j) =>
    ({ TABLE_NAME, COLUMN_NAME, INDEX_NAME: `required_unique_${i}`,
      NON_UNIQUE: 0, SEQ_IN_INDEX: j + 1, SUB_PART: null })));
  const foreignKeys = Object.entries(REQUIRED_FOREIGN_KEYS).flatMap(([TABLE_NAME, relations]) =>
    Object.entries(relations).map(([COLUMN_NAME, [REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME]], i) =>
      ({ TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
        CONSTRAINT_NAME: `fk_${TABLE_NAME}_${i}` })));
  return { tables, columns, indexes, foreignKeys };
}

test('complete metadata is a schema PASS, never a workflow PASS', () => {
  const report = inspectMetadata(healthyInventory());
  assert.equal(report.schemaReady, true);
  assert.equal(report.workflowReady, false);
  assert.equal(report.issues.length, 0);
  assert.ok(report.blockers.length >= 4);
});
test('legacy offers missing columns fail', () => {
  const metadata = healthyInventory();
  metadata.columns = metadata.columns.filter(col => col.COLUMN_NAME !== 'created_by');
  const report = inspectMetadata(metadata);
  assert.equal(report.schemaReady, false);
  assert.ok(report.issues.includes('Missing column: candidate_offers.created_by'));
});
test('missing assignment tables fail', () => {
  const metadata = healthyInventory();
  metadata.tables = metadata.tables.filter(item => item.TABLE_NAME !== 'offer_submission_assignments');
  const report = inspectMetadata(metadata);
  assert.equal(report.schemaReady, false);
  assert.ok(report.issues.includes('Missing table: offer_submission_assignments'));
});
test('wrong unique or prefix unique does not pass', () => {
  const metadata = healthyInventory();
  metadata.indexes = metadata.indexes.filter(row => row.TABLE_NAME !== 'candidate_offers');
  assert.ok(inspectMetadata(metadata).issues.some(s => s.includes('Missing unique key: candidate_offers')));
  const metadata2 = healthyInventory();
  metadata2.indexes.find(row => row.TABLE_NAME === 'candidate_offers').SUB_PART = 5;
  assert.ok(inspectMetadata(metadata2).issues.some(s => s.includes('Missing unique key: candidate_offers')));
});
test('insufficient FKs fail, never assume counts imply correct definitions', () => {
  const metadata = healthyInventory();
  metadata.foreignKeys = metadata.foreignKeys.filter(row => row.TABLE_NAME !== 'offer_submissions');
  assert.ok(inspectMetadata(metadata).issues.some(s => s.includes('Insufficient FK count: offer_submissions')));
});
test('database mismatch blocks before schema metadata reads', async () => {
  const calls = [];
  const fakeConnection = { execute: async sql => {
    calls.push(sql);
    return [[{ selected_database: 'internal_recruitment_system' }]];
  }};
  await assert.rejects(() => readMetadata(fakeConnection), /Selected database mismatch/);
  assert.equal(calls.length, 1);
});
test('rejects wrong database argument without any SQL', async () => {
  const fakeConnection = { execute: () => { throw new Error('must not execute'); }};
  await assert.rejects(() => readMetadata(fakeConnection, 'internal_recruitment_system'), /REFUSED/);
});
test('metadata reads use exact schema parameter and do not query business rows', async () => {
  const calls = [];
  const fakeConnection = { execute: async (sql, params) => {
    calls.push({ sql, params });
    return [sql.includes('SELECT DATABASE()')
      ? [{ selected_database: TARGET }]
      : []];
  }};
  const metadata = await readMetadata(fakeConnection);
  assert.equal(calls.length, 5);
  assert.equal(metadata.tables.length, 0);
  for (const { sql, params } of calls.slice(1)) {
    assert.match(sql, /information_schema\./);
    assert.deepEqual(params, [TARGET]);
  }
});

test('wrong FK mapping fails even if the FK count looks correct', () => {
  const metadata = healthyInventory();
  metadata.foreignKeys.find(fk => fk.TABLE_NAME === 'candidate_offers' &&
    fk.COLUMN_NAME === 'created_by').REFERENCED_TABLE_NAME = 'departments';
  const report = inspectMetadata(metadata);
  assert.equal(report.schemaReady, false);
  assert.ok(report.issues.some(item => item.includes('Missing FK mapping: candidate_offers.created_by')));
});
