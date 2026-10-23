"use strict";
// Trial-only migration. Never accepts another target DB. No data printed.
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const opt = key => { const i = args.indexOf('--' + key); return i >= 0 ? args[i + 1] : null; };
const backend = opt('backend');
const envFile = opt('env-file');
const sqlFile = opt('sql');
const target = 'internal_recruitment_scrum103_trial';
function fail(message) { throw new Error(message); }
if (!backend || !envFile || !sqlFile) fail('Missing --backend / --env-file / --sql');
if (!fs.existsSync(envFile) || !fs.existsSync(sqlFile)) fail('Missing env or SQL file');
const dotenv = require(require.resolve('dotenv', { paths: [backend] }));
const mysql = require(require.resolve('mysql2/promise', { paths: [backend] }));
const cfg = dotenv.parse(fs.readFileSync(envFile));
if (cfg.DB_NAME !== 'internal_recruitment_test') fail('Guard: original .env must select internal_recruitment_test');
if (!cfg.DB_USER) fail('Guard: missing DB_USER');
const host = cfg.DB_HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) fail('Guard: DB_HOST must be loopback');
const port = Number(cfg.DB_PORT || 3306);
if (!Number.isInteger(port) || port < 1 || port > 65535) fail('Invalid DB_PORT');
const statements = fs.readFileSync(sqlFile, 'utf8').split(';').map(s=>s.trim()).filter(Boolean);
const expected = [
  'ALTER TABLE candidates ADD COLUMN current_stage VARCHAR(50) NULL',
  "UPDATE candidates SET current_stage = status, updated_at = updated_at WHERE current_stage IS NULL AND status IN ('NEW','REJECTED')",
  "ALTER TABLE candidates MODIFY COLUMN current_stage VARCHAR(50) NOT NULL DEFAULT 'NEW'"
];
if (statements.length !== expected.length || statements.some((s,i)=>s !== expected[i])) fail('SQL file checksum/contents do not match reviewed statements');
const cn = { host, port, user: cfg.DB_USER, password: cfg.DB_PASSWORD || '', database: target,
  multipleStatements:false, connectTimeout:8000 };
(async () => {
 const db = await mysql.createConnection(cn);
 let started = false;
 try {
  const [[identity]] = await db.execute('SELECT DATABASE() AS name, @@foreign_key_checks AS fk');
  if (identity.name !== target || Number(identity.fk) !== 1) fail('Database identity/foreign_key_checks guard failed');
  const [cols] = await db.execute(`SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='candidates' AND COLUMN_NAME IN ('status','current_stage','updated_at')`,[target]);
  const col = Object.fromEntries(cols.map(c=>[c.COLUMN_NAME,c]));
  if (!col.status || !col.updated_at) fail('Expected candidate status and updated_at columns');
  const [rows] = await db.execute('SELECT status, COUNT(*) AS n FROM candidates GROUP BY status');
  const statuses = Object.fromEntries(rows.map(r=>[r.status,Number(r.n)]));
  const total = rows.reduce((n,r)=>n+Number(r.n),0);
  if (total !== 6 || statuses.NEW !== 3 || statuses.REJECTED !== 3 || rows.length !== 2) fail('Candidate counts/statuses changed since audit; STOP for review');
  if (col.current_stage) {
    const [[mismatch]] = await db.execute('SELECT COUNT(*) AS n FROM candidates WHERE current_stage IS NULL OR current_stage <> status');
    if (col.current_stage.COLUMN_TYPE === 'varchar(50)' && col.current_stage.IS_NULLABLE === 'NO' && col.current_stage.COLUMN_DEFAULT === 'NEW' && Number(mismatch.n) === 0) {
      console.log('TRIAL_CURRENT_STAGE_ALREADY_READY; 3 NEW and 3 REJECTED preserved');
      return;
    }
    fail('current_stage exists but is not fully validated; partial migration? STOP');
  }
  console.log('TARGET: '+target+'; 6 candidates: 3 NEW / 3 REJECTED; original DB is untouched');
  console.log('RUNNING 3 REVIEWED STATEMENTS ON TRIAL ONLY');
  started = true;
  await db.execute(statements[0]);
  await db.execute(statements[1]);
  const [[missing]] = await db.execute('SELECT COUNT(*) AS n FROM candidates WHERE current_stage IS NULL OR current_stage <> status');
  if (Number(missing.n) !== 0) fail('Backfill did not preserve status. STOP before column modification.');
  await db.execute(statements[2]);
  const [afterCol] = await db.execute(`SELECT COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='candidates' AND COLUMN_NAME='current_stage'`,[target]);
  const [after] = await db.execute('SELECT status,current_stage,COUNT(*) AS n FROM candidates GROUP BY status,current_stage');
  const ok = afterCol.length===1 && afterCol[0].COLUMN_TYPE==='varchar(50)' && afterCol[0].IS_NULLABLE==='NO' && afterCol[0].COLUMN_DEFAULT==='NEW' && after.length===2 && after.every(r=>r.status===r.current_stage) && after.reduce((n,r)=>n+Number(r.n),0)===6;
  if (!ok) fail('Postflight check failed');
  console.log('TRIAL_CURRENT_STAGE_PASS: 3 NEW, 3 REJECTED; no original DB changes.');
 } catch (e) {
  if (started) console.error('PARTIAL DDL POSSIBLE: do not rerun automatically; inspect trial schema first.');
  throw e;
 } finally { await db.end(); }
})().catch(e=>{ console.error('TRIAL_CURRENT_STAGE_FAILED:',e.code||e.message);process.exitCode=1; });
