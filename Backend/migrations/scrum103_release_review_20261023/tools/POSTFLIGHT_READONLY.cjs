'use strict';
const fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2);
function val(k){const p=args.indexOf('--'+k);return p<0?null:args[p+1]}
const backend=val('backend'), envFrom=val('env-from'), target=val('target')||'internal_recruitment_test';
if(!backend||!envFrom||!['internal_recruitment_test','internal_recruitment_scrum103_trial'].includes(target)){
 console.error('Usage --backend <merged Backend> --env-from <original Backend> --target <allowed database>');process.exit(1);
}
require(require.resolve('dotenv',{paths:[backend,envFrom]})).config({path:path.join(envFrom,'.env'),quiet:true,override:true});
if(process.env.DB_NAME!=='internal_recruitment_test'||!process.env.DB_PASSWORD||!process.env.DB_USER){console.error('STOP: original .env must select internal_recruitment_test');process.exit(1)}
const mysql=require(require.resolve('mysql2/promise',{paths:[backend,envFrom]}));
const {inspectMetadata}=require(path.join(backend,'scripts','scrum103_schema_audit.cjs'));
const required={
 offer_approval_mandates:['id','offer_id','application_id','department_id','approver_id','assigned_by','version','assigned_at','revoked_at'],
 offer_approval_outbox:['id','approval_history_id','offer_id','submission_id','actor_user_id','recipient_user_id','action','payload_json','delivery_status','attempts','created_at'],
 candidate_onboardings:['id','offer_id','candidate_id','hr_in_charge_id','official_start_date','status','equipment_ready','account_created','contract_signed','orientation_done','checklist_notes']};
const addonFK={offer_approval_mandates:5,offer_approval_outbox:5,candidate_onboardings:3};
(async()=>{
 const conn=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:target,multipleStatements:false});
 try{
  const [[id]]=await conn.execute('SELECT DATABASE() AS db');if(id?.db!==target)throw new Error('Database mismatch');
  const sql={tables:'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'',columns:'SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=?',indexes:'SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=?',foreignKeys:'SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL'};
  const data={};for(const [key,s] of Object.entries(sql)){[data[key]]=await conn.execute(s,[target])}
  const core=inspectMetadata(data);
  const issue=[];const tables=new Set(data.tables.map(x=>x.TABLE_NAME)),cols=new Set(data.columns.map(x=>x.TABLE_NAME+'.'+x.COLUMN_NAME));
  for(const [table,names]of Object.entries(required)){
   if(!tables.has(table)){issue.push(`Missing addon table: ${table}`);continue}
   for(const x of names)if(!cols.has(table+'.'+x))issue.push(`Missing addon column: ${table}.${x}`);
   const fks=new Set(data.foreignKeys.filter(x=>x.TABLE_NAME===table).map(x=>x.CONSTRAINT_NAME));
   if(fks.size<addonFK[table])issue.push(`Addon foreign key count too low: ${table}: ${fks.size}`);
  }
  const report={database:target,schema_core_ready:core.schemaReady,schema_addons_ready:issue.length===0,core_issues:core.issues,addon_issues:issue,workflow_end_to_end_verified:false,at:new Date().toISOString()};
  const out=path.join(process.cwd(),'SCRUM103_DB_POSTFLIGHT_RESULT.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n','utf8');
  console.log(`CORE ${report.schema_core_ready?'PASS':'FAIL'} | ADDONS ${report.schema_addons_ready?'PASS':'FAIL'} | WORKFLOW E2E NOT VERIFIED`);console.log(out);
  if(!core.schemaReady||issue.length)process.exitCode=2;
 }finally{await conn.end()}
})().catch(err=>{console.error('POSTFLIGHT ERROR: '+(err.code||'CHECK_FAILED'));process.exitCode=1});
