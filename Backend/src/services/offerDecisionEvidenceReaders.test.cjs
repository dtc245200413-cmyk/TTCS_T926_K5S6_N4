'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {verifyLifecycle,verifyEvaluation} = require('./offerDecisionEvidenceReaders');
const scope = {application:{id:7,candidate_id:11,recruitment_request_id:1,mapping_verified:true}};
const app = {conn:null,scope,applicationId:7,candidateId:11};
function fakeConn({lifecycle, evaluations}={}) {
  const calls=[];
  return {calls, async execute(sql,params){
    calls.push({sql,params});
    if (sql.includes('UNIX_TIMESTAMP(a.updated_at)')) return [lifecycle || [{id:7,candidate_id:11,recruitment_request_id:1,status:'SUBMITTED',lifecycle_version:1000,candidate_application_count:1}]];
    if (sql.includes('e.id AS evaluation_id')) return [evaluations || [{evaluation_id:5,schedule_id:8,round_id:9,overall_score:'8.00',schedule_status:'COMPLETED',evaluation_status:'COMPLETED',end_at:'2026-01-01T10:00:00.000Z'}]];
    throw Error('Unexpected SQL');
  }};
}
test('lifecycle proof requires one uniquely mapped application and a timestamp',async()=>{
  const conn=fakeConn();
  const proof=await verifyLifecycle({...app,conn});
  assert.deepEqual(proof,{verified:true,application_id:7,candidate_id:11,recruitment_request_id:1,status_version:1000,reference:'application-7'});
  assert.match(conn.calls[0].sql,/FOR UPDATE/);
  assert.deepEqual(conn.calls[0].params,[7,11,1]);
});
test('lifecycle rejects candidate with multiple applications',async()=>{
  const conn=fakeConn({lifecycle:[{id:7,candidate_id:11,recruitment_request_id:1,status:'SUBMITTED',lifecycle_version:1000,candidate_application_count:2}]});
  await assert.rejects(verifyLifecycle({...app,conn}),{statusCode:422});
});
test('lifecycle rejects wrong application and unverified scope before querying',async()=>{
  const conn=fakeConn();
  await assert.rejects(verifyLifecycle({...app,conn,candidateId:12}),{statusCode:422});
  assert.equal(conn.calls.length,0);
});
test('completed schedule-bound evaluation creates deterministic evidence digest',async()=>{
  const conn=fakeConn();
  const one=await verifyEvaluation({...app,conn});
  const two=await verifyEvaluation({...app,conn});
  assert.equal(one.verified,true);assert.equal(one.average_score,8);
  assert.equal(one.total_rounds_evaluated,1);
  assert.match(one.reference,/^[0-9a-f]{64}$/);
  assert.equal(one.reference,two.reference);
  assert.match(conn.calls[0].sql,/interview_schedule_id = s.id/);
  assert.match(conn.calls[0].sql,/s.status = 'COMPLETED'/);
  assert.match(conn.calls[0].sql,/e.interviewer_id = s.interviewer_id/);
});
test('candidate-only unlinked evaluation is never enough',async()=>{
  const conn=fakeConn({evaluations:[]});
  await assert.rejects(verifyEvaluation({...app,conn}),{statusCode:422});
});
test('invalid/out-of-range/uncompleted evaluation proof denied',async()=>{
  for (const row of [{overall_score:20},{schedule_status:'SCHEDULED'},{evaluation_status:'PENDING'}, {round_id:null}]) {
    const conn=fakeConn({evaluations:[{evaluation_id:5,schedule_id:8,round_id:9,overall_score:8,schedule_status:'COMPLETED',evaluation_status:'COMPLETED',end_at:'2026-01-01T10:00:00Z',...row}]});
    await assert.rejects(verifyEvaluation({...app,conn}),{statusCode:422});
  }
});
test('evidence readers do not execute INSERT/UPDATE/DELETE',async()=>{
  const conn=fakeConn();
  await verifyLifecycle({...app,conn});await verifyEvaluation({...app,conn});
  assert.ok(conn.calls.every(c=>c.sql.trim().startsWith('SELECT')));
});
