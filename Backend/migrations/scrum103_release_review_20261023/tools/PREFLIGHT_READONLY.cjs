'use strict';
// READ ONLY: checks metadata and counts, no DDL/DML, no server.js import, no credentials output.
const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2);
const key=(name)=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:null};
const backend=key('backend');
const envFrom=key('env-from');
const target=key('target')||'internal_recruitment_test';
if(!backend || !envFrom || !/^(?:internal_recruitment_test|internal_recruitment_scrum103_trial)$/.test(target)){
 console.error('Usage: node PREFLIGHT_READONLY.cjs --backend <merged Backend path> --env-from <original Backend path> [--target internal_recruitment_test]');process.exit(1);
}
const mysql=require(require.resolve('mysql2/promise',{paths:[backend,envFrom]}));
require(require.resolve('dotenv',{paths:[backend,envFrom]})).config({path:path.join(envFrom,'.env'),quiet:true,override:true});
if(process.env.DB_NAME!=='internal_recruitment_test' || !process.env.DB_USER || !process.env.DB_PASSWORD){
 console.error('STOP: original Backend/.env must use internal_recruitment_test; credentials must be configured.');process.exit(1);
}
const parentKeys={candidate_applications:'id',candidates:'id',recruitment_requests:'id',departments:'department_id',job_positions:'position_id',users:'user_id',candidate_offers:'id',job_postings:'id'};
const legacyOffer=new Set(['id','application_id','salary_amount','currency','start_date','response_deadline','message','status','candidate_response','responded_at','created_at']);
const newOffer=new Set(['offer_code','candidate_id','recruitment_request_id','hiring_decision_id','department_id','position_id','job_title','basic_salary','expected_start_date','work_location','benefits','special_terms','created_by','submitted_at','approved_at','sent_to_candidate_at','updated_at','row_version','decision_source','decision_reference','decision_version']);
const fresh=['candidate_hiring_decisions','offer_approvals','offer_submissions','offer_submission_assignments','offer_approval_mandates','offer_approval_outbox','candidate_onboardings'];
const issue=[];
const warnings=[];
const check=(test,message)=>{if(!test)issue.push(message)};
const connArgs={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:target,multipleStatements:false,connectTimeout:7000};
(async()=>{
 const c=await mysql.createConnection(connArgs);
 try{
  const [[id]]=await c.execute('SELECT DATABASE() AS db, CURRENT_USER() AS account, VERSION() AS version, @@foreign_key_checks AS fkchecks, @@sql_mode AS sqlmode');
  check(id?.db===target,'Database mismatch');
  check(id?.fkchecks===1,'foreign_key_checks must be enabled');
  check(/STRICT_/.test(id?.sqlmode||''),'SQL strict mode missing');
  check(/^8\./.test(id?.version||''),'Expected MySQL 8.x: review version');
  const [tables]=await c.execute('SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=?',[target,'BASE TABLE']);
  const [columns]=await c.execute('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=?',[target]);
  const [idx]=await c.execute('SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=?',[target]);
  const [fks]=await c.execute('SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL',[target]);
  const t=new Map(tables.map(x=>[x.TABLE_NAME,x]));
  const col=new Map(columns.map(x=>[`${x.TABLE_NAME}.${x.COLUMN_NAME}`,x]));
  for(const table of Object.keys(parentKeys)){
    check(t.has(table),`Missing parent table ${table}`);
    if(t.has(table))check(t.get(table).ENGINE==='InnoDB',`Not InnoDB: ${table}`);
    const pk=col.get(`${table}.${parentKeys[table]}`);
    check(pk?.COLUMN_TYPE==='int' && pk?.COLUMN_KEY==='PRI',`Wrong INT signed PRIMARY: ${table}.${parentKeys[table]}`);
  }
  for(const x of fresh)check(!t.has(x),`New table already exists: ${x} (partial migration?)`);
  for(const x of legacyOffer)check(col.has('candidate_offers.'+x),`Missing legacy Offer column: ${x}`);
  const offerCols=columns.filter(x=>x.TABLE_NAME==='candidate_offers');
  check(offerCols.length===legacyOffer.size,`Expected exactly ${legacyOffer.size} legacy Offer columns; actual ${offerCols.length}`);
  for(const x of newOffer)check(!col.has('candidate_offers.'+x),`Offer column already exists: ${x} (partial migration?)`);
  check(!col.has('candidate_applications.application_code'),'application_code already exists (partial migration?)');
  const legacy={application_id:['int','NO'],currency:['varchar(10)','NO'],status:['varchar(30)','NO'],salary_amount:['decimal(15,2)','YES'],start_date:['date','YES'],response_deadline:['date','YES']};
  for(const [column,[type,nullable]] of Object.entries(legacy)){
   const x=col.get('candidate_offers.'+column);
   check(x?.COLUMN_TYPE===type && x?.IS_NULLABLE===nullable,`Legacy schema differs: candidate_offers.${column}`);
  }
  const byIndex=new Map();
  for(const x of idx){const k=`${x.TABLE_NAME}/${x.INDEX_NAME}`;if(!byIndex.has(k))byIndex.set(k,[]);byIndex.get(k).push(x)}
  const hasAppUnique=[...byIndex.values()].some(parts=>parts.length===1 && parts[0].TABLE_NAME==='candidate_offers' && Number(parts[0].NON_UNIQUE)===0 && parts[0].COLUMN_NAME==='application_id' && parts[0].SUB_PART==null);
  check(hasAppUnique,'Expected exact single-column UNIQUE(candidate_offers.application_id)');
  const fkNames=['fk_chd_application','fk_chd_candidate','fk_chd_req','fk_chd_dept','fk_chd_maker','fk_co_candidate','fk_co_app','fk_co_req','fk_co_decision','fk_co_dept','fk_co_pos','fk_co_creator','fk_oa_offer','fk_oa_approver','fk_os_offer','fk_os_submitter','fk_osa_submission','fk_osa_approver','fk_osa_assigner','fk_oam_offer','fk_oam_application','fk_oam_department','fk_oam_approver','fk_oam_assigner','fk_offer_outbox_history','fk_offer_outbox_offer','fk_offer_outbox_submission','fk_offer_outbox_actor','fk_offer_outbox_recipient','fk_s103_onb_offer','fk_s103_onb_candidate','fk_s103_onb_hr'];
  const used=new Set(fks.map(x=>x.CONSTRAINT_NAME));
  for(const x of fkNames)check(!used.has(x),`Foreign key name already in use: ${x}`);
  let offers=null,apps=null;
  if(t.has('candidate_offers')){const [[r]]=await c.execute('SELECT COUNT(*) AS n FROM candidate_offers');offers=Number(r.n);check(offers===0,'Existing candidate_offers rows: manual mapping/orphan preflight required. STOP automation.');}
  if(t.has('candidate_applications')){const [[r]]=await c.execute('SELECT COUNT(*) AS n FROM candidate_applications');apps=Number(r.n)}
  for(const [table,need] of [
    ['candidate_applications',['id','candidate_id','status','updated_at','recruitment_request_id','job_posting_id']],
    ['candidates',['id','status','current_stage','stage_changed_at']],
    ['candidate_notifications',['id','candidate_id','title','message','type','link','created_at']],
    ['notifications',['user_id','title','message','type','link','is_read']],
    ['departments',['manager_user_id','status']],
    ['users',['status']],
    ['roles',['role_code']]
  ])for(const column of need)if(!col.has(`${table}.${column}`))warnings.push(`Additional workflow dependency missing: ${table}.${column}`);
  const result={checked_at:new Date().toISOString(),target,ready_for_review_ddl:issue.length===0,issue,warnings,base_table_count:tables.length,legacy_offer_column_count:offerCols.length,offer_rows:offers,application_rows:apps,workflow_e2e_verified:false};
  const out=path.join(process.cwd(),'SCRUM103_DB_PREFLIGHT_RESULT.json');
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
  console.log(`PREFLIGHT: ${result.ready_for_review_ddl?'PASS':'STOP'}; blocking issues: ${issue.length}; workflow warnings: ${warnings.length}`);
  console.log(`Offers: ${offers}; applications: ${apps}; database: ${target}; report: ${out}`);
  console.log('READ ONLY: no migrations, no seeds, no database changes.');
  if(issue.length)process.exitCode=2;
 }finally{await c.end()}
})().catch(err=>{console.error(`PRE-FLIGHT STOP: ${err.code||'SAFETY_CHECK'} (verify connection, selected database and permissions)`);process.exitCode=1});
