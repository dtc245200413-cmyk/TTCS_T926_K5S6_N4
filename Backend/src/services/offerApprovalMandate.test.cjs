'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {POLICY,assignExplicit,resolveSubmissionAssignments,verifyProvenance}=require('./offerApprovalMandate');
function fixture({approverActive=true,managerAuthorized=true,auditValid=true,active=[],override={}}={}) {
 const calls=[];
 let mandate={id:71,offer_id:9,application_id:20,department_id:3,approver_id:8,assigned_by:6,version:1,revoked_at:null,...override};
 const offer={id:9,application_id:20,department_id:3,created_by:4,status:'DRAFT',row_version:2};
 return {calls,offer,mandate,conn:{execute:async(sql,params)=>{
  calls.push({sql,params});
  if(sql.includes('FROM candidate_offers'))return [[offer]];
  if(sql.includes('FROM departments d'))return [managerAuthorized && Number(params[1])===6?[{department_id:3}]:[]];
  if(sql.includes('SELECT DISTINCT u.user_id FROM users u'))return [approverActive && Number(params[0])===8?[{user_id:8}]:[]];
  if(sql.includes('SELECT id FROM offer_approval_mandates'))return [active];
  if(sql.includes('SET revoked_at'))return [{affectedRows:1}];
  if(sql.includes('MAX(version)'))return [[{last_version:0}]];
  if(sql.includes('INSERT INTO offer_approval_mandates'))return [{insertId:71}];
  if(sql.includes('INSERT INTO audit_logs'))return [{insertId:99}];
  if(sql.includes('FROM audit_logs'))return [auditValid?[{audit_log_id:99}]:[]];
  if(sql.includes('SELECT id, offer_id, application_id'))return [[mandate]];
  throw Error('Unexpected SQL: '+sql);
 }}};
}
test('explicit manager assignment records a single audited Offer mandate',async()=>{
 const f=fixture(); const x=await assignExplicit({conn:f.conn,offerId:9,approverId:8,actorUserId:6,expectedRowVersion:2});
 assert.deepEqual(x,{offer_id:9,assigned_approver_id:8,mandate_version:1});
 assert.equal(f.calls.filter(x=>x.sql.includes('INSERT INTO audit_logs')).length,1);
 assert.ok(f.calls.some(x=>x.sql.includes('FOR UPDATE')));
});
test('unassigned admin, recruiter or creator cannot choose an approver',async()=>{
 for(const x of [{actorUserId:2},{actorUserId:4},{actorUserId:8},{approverId:4}]){
  const f=fixture({managerAuthorized:x.actorUserId===2?false:true});
  await assert.rejects(assignExplicit({conn:f.conn,offerId:9,approverId:8,actorUserId:6,expectedRowVersion:2,...x}),{statusCode:403});
  assert.equal(f.calls.filter(x=>x.sql.includes('INSERT INTO')).length,0);
 }
});
test('no role, stale version or pending Offer cannot gain assignment',async()=>{
 const f=fixture({approverActive:false});
 await assert.rejects(assignExplicit({conn:f.conn,offerId:9,approverId:8,actorUserId:6,expectedRowVersion:2}),{statusCode:403});
 const g=fixture();await assert.rejects(assignExplicit({conn:g.conn,offerId:9,approverId:8,actorUserId:6,expectedRowVersion:4}),{statusCode:409});
 const h=fixture();h.offer.status='PENDING_APPROVAL';await assert.rejects(assignExplicit({conn:h.conn,offerId:9,approverId:8,actorUserId:6,expectedRowVersion:2}),{statusCode:409});
});
test('submission never invents assignment from a role or author',async()=>{
 const f=fixture();f.conn.execute=async(sql,params)=>{f.calls.push({sql,params});if(sql.includes('SELECT id, offer_id, application_id'))return [[]];throw Error('Unexpected SQL');};
 await assert.rejects(resolveSubmissionAssignments(f.offer,{user_id:4},{},f.conn),{statusCode:503});
});
test('valid audited mandate is the sole source of per-submission approver plan',async()=>{
 const f=fixture();const plan=await resolveSubmissionAssignments(f.offer,{user_id:4},{},f.conn);
 assert.deepEqual(plan,{verified:true,offer_id:9,application_id:20,source:POLICY,reference:'71',version:'1',assigned_by:6,approver_ids:[8]});
 assert.ok(f.calls.some(x=>x.sql.includes('FROM audit_logs')));
});
test('missing audit, revoked authority, invalid actor and tampered reference fail closed',async()=>{
 for(const opts of [{auditValid:false},{override:{revoked_at:'2026-10-20'}},{override:{assigned_by:44}},{override:{offer_id:2}}]){
  const f=fixture(opts);
  await assert.rejects(resolveSubmissionAssignments(f.offer,{user_id:4},{},f.conn),{statusCode:503});
 }
});
test('approval replay matches Offer, application, actor, version and real audit',async()=>{
 const f=fixture(); const proof=await verifyProvenance({conn:f.conn,evidence:{offer_id:9,application_id:20,submission_id:200,offer_row_version:3,approver_id:8,assigned_by:6,assignment_source:POLICY,assignment_reference:'71',assignment_version:'1'}});
 assert.equal(proof.verified,true);
 const q=fixture(); assert.equal((await verifyProvenance({conn:q.conn,evidence:{offer_id:9,application_id:20,submission_id:200,offer_row_version:3,approver_id:8,assigned_by:6,assignment_source:POLICY,assignment_reference:'72',assignment_version:'1'}})).verified,false);
});
