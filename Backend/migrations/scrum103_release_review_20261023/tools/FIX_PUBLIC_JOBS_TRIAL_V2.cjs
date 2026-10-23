"use strict";
// Trial-only additive schema compatibility fix. No seeding, no data row updates.
// This tool NEVER connects to the shared internal_recruitment_test database.
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
function val(name) {
  const item = args.find(x => x.startsWith(`${name}=`));
  if (item) return item.slice(name.length + 1);
  const i = args.indexOf(name);
  return i < 0 ? null : args[i + 1];
}
function assert(x, msg) { if (!x) throw Error(msg); }
const backend = val('--backend');
const envFile = val('--env-file');
const confirm = val('--confirm');
const apply = args.includes('--apply');
const trial = 'internal_recruitment_scrum103_trial';
assert(backend && envFile && fs.existsSync(path.join(backend, 'package.json')) && fs.existsSync(envFile), 'Backend or source .env not found');
assert(!apply || confirm === trial, 'Applying DDL requires --confirm='+trial);
const dotenv = require(require.resolve('dotenv', {paths:[backend]}));
const mysql = require(require.resolve('mysql2/promise', {paths:[backend]}));
const cfg = dotenv.parse(fs.readFileSync(envFile));
assert(cfg.DB_NAME === 'internal_recruitment_test', 'Source .env DB_NAME must be internal_recruitment_test');
assert(cfg.DB_USER, 'Source .env DB_USER missing');
const host = cfg.DB_HOST || 'localhost';
assert(['localhost','127.0.0.1','::1'].includes(host), 'MySQL must be local');
const port = Number(cfg.DB_PORT || 3306);
assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Bad MySQL port');
const cn = {host,port,user:cfg.DB_USER,password:cfg.DB_PASSWORD||'',database:trial,connectTimeout:8000,multipleStatements:false};

// SchemaMigrations.js defines these nullable extensions. Preserve existing rows.
const extensions = Object.freeze({
  review_note:     {type:'text', sql:'TEXT NULL'},
  submitted_by:   {type:'int', sql:'INT NULL'},
  submitted_at:   {type:'datetime', sql:'DATETIME NULL'},
  reviewed_by:    {type:'int', sql:'INT NULL'},
  reviewed_at:    {type:'datetime', sql:'DATETIME NULL'},
  published_by:   {type:'int', sql:'INT NULL'},
  published_at:   {type:'datetime', sql:'DATETIME NULL'},
  closed_at:      {type:'datetime', sql:'DATETIME NULL'},
  department_id:  {type:'int', sql:'INT NULL'},
  hidden_by:      {type:'int', sql:'INT NULL'},
  hidden_at:      {type:'datetime', sql:'DATETIME NULL'}
});
const required = {
  job_postings: ['id','recruitment_request_id','title','description','requirements','benefits','work_location','job_type','salary_display','deadline','status','created_by','created_at','updated_at'],
  recruitment_requests:['id','department_id','position_id','headcount','work_location_code','work_type_code','updated_at','status'],
  departments:['department_id','department_name'],
  job_positions:['position_id','position_name'],
  master_data:['category_group','code','name'],
  users:['user_id','full_name']
};
async function main() {
  const conn = await mysql.createConnection(cn);
  let attempted = false;
  try {
    const [[db]] = await conn.query('SELECT DATABASE() AS db, @@foreign_key_checks AS checks');
    assert(db.db === trial && Number(db.checks) === 1, 'Unsafe DB identity or FK checks');
    const [meta] = await conn.execute(`SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME IN
      ('job_postings','recruitment_requests','departments','job_positions','master_data','users')`,[trial]);
    const tables = new Map();
    for (const row of meta) {
      if (!tables.has(row.TABLE_NAME)) tables.set(row.TABLE_NAME,new Map());
      tables.get(row.TABLE_NAME).set(row.COLUMN_NAME,row);
    }
    const missingBase = Object.entries(required).flatMap(([t,columns]) => columns.filter(c=>!tables.get(t)?.has(c)).map(c=>`${t}.${c}`));
    assert(missingBase.length === 0, 'Missing non-additive base schema: '+missingBase.join(', '));
    const existing = tables.get('job_postings');
    for (const [column,def] of Object.entries(extensions)) {
      const row = existing.get(column);
      if (row) assert(row.DATA_TYPE === def.type && row.IS_NULLABLE === 'YES', `Existing ${column} has unexpected type/nullability: ${row.DATA_TYPE}/${row.IS_NULLABLE}`);
    }
    const missing = Object.keys(extensions).filter(column=>!existing.has(column));
    const [[before]] = await conn.execute('SELECT COUNT(*) AS total FROM job_postings');
    console.log('TRIAL VERIFIED:', db.db);
    console.log('JOB POSTING ROW COUNT:',Number(before.total));
    console.log('MISSING ADDITIVE COLUMNS:', missing.length?missing.join(', '):'NONE');
    if (missing.length) {
      const sql = `ALTER TABLE job_postings ${missing.map(col=>`ADD COLUMN \`${col}\` ${extensions[col].sql}`).join(', ')}`;
      if (!apply) {
        console.log('READ-ONLY PREVIEW:',sql);
        throw Error('Use --apply --confirm='+trial+' to execute trial DDL');
      }
      console.log('DDL APPLYING ON TRIAL ONLY');
      attempted=true;
      await conn.query(sql);
    }
    const [postmeta] = await conn.execute(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME='job_postings'`,[trial]);
    const afterMap = new Map(postmeta.map(x=>[x.COLUMN_NAME,x]));
    for (const [column,def] of Object.entries(extensions)) {
      const row = afterMap.get(column);
      assert(row && row.DATA_TYPE===def.type && row.IS_NULLABLE==='YES', 'Postflight invalid: '+column);
    }
    const [[after]] = await conn.execute('SELECT COUNT(*) AS total FROM job_postings');
    assert(Number(before.total)===Number(after.total), 'Posting row count changed');
    // Only after verifying connection identity, run repository SELECTs.
    process.env.DB_HOST=host;
    process.env.DB_PORT=String(port);
    process.env.DB_USER=cfg.DB_USER;
    process.env.DB_PASSWORD=cfg.DB_PASSWORD||'';
    process.env.DB_NAME=trial;
    const {pool}=require(path.join(backend,'src/config/database.js'));
    try {
      const [[pooldb]]=await pool.query('SELECT DATABASE() AS db');
      assert(pooldb.db===trial,'Repository pool DB mismatch');
      const repo=require(path.join(backend,'src/repositories/jobPostingRepository.js'));
      const all=await repo.findAll();
      await repo.findById(0);
      await repo.findEligibleRequests();
      const pub=await repo.findPublic({});
      await repo.findPublic({departmentId:1,search:'backend',location:'Hanoi',workType:'FULLTIME'});
      const filters=await repo.findPublicFilterOptions();
      await repo.findPublicById(0);
      assert(Array.isArray(all) && Array.isArray(pub) && filters && typeof filters === 'object', 'Unexpected repository output');
      console.log('JOB POSTING REPOSITORY QUERIES: PASS');
      console.log('PUBLIC FILTER QUERIES: PASS');
      console.log('TRIAL_PUBLIC_JOBS_SCHEMA_PASS');
      console.log('No changes to shared database. No seeding or row writes.');
    } finally { await pool.end(); }
  } catch(error) {
    if (attempted) console.error('NOTICE: Trial DDL may already have applied; inspect before retry.');
    throw error;
  } finally {await conn.end();}
}
main().catch(error=>{console.error('TRIAL_PUBLIC_JOBS_FAILED:',error.code||error.sqlMessage||error.message); if (error.sqlMessage) console.error('MYSQL DETAIL:',error.sqlMessage); process.exitCode=1;});
