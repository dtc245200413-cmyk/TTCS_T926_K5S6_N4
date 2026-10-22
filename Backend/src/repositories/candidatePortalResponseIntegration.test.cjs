'use strict';
// Isolated DB-mock tests: no MySQL access, no npm dependencies.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
let results,queries,tx;
const conn={
  beginTransaction: async()=>{tx.push('begin')},
  commit: async()=>{tx.push('commit')},
  rollback: async()=>{tx.push('rollback')},
  release: ()=>{tx.push('release')},
  execute: async (sql,params)=>{
    queries.push({sql,params});
    if (/SELECT o\.id, o\.status/.test(sql)) return [results.rows];
    if (/UPDATE candidate_offers/.test(sql)) return [{affectedRows:results.affected??1}];
    return [{affectedRows:1, insertId:1}];
  }
};
const pool={getConnection:async()=>conn, execute:async()=>[[]]};
try {
  Module._load=function(request,parent,isMain){
    if(request==='../config/database' && parent?.filename?.endsWith('candidatePortalRepository.js'))
      return {pool};
    return originalLoad.apply(this,arguments);
  };
  var repo=require('./candidatePortalRepository');
} finally {Module._load=originalLoad;}
function setup(row){queries=[];tx=[];results={rows:row===null?[]:[row]};}
function row(status='SENT'){
  return {id:10,status,application_id:7,candidate_id:3,created_by:6,
    response_deadline:'2099-12-31',expected_start_date:'2099-12-25'};
}
test('SENT acceptance updates Offer, application, candidate and onboarding in ONE transaction',async()=>{
  setup(row());
  assert.equal(await repo.respondToOffer(3,10,{status:'ACCEPTED',response:'Yes'}),true);
  assert.deepEqual(tx,['begin','commit','release']);
  const sql=queries.map(q=>q.sql).join('\n');
  assert.match(sql,/FOR UPDATE/);
  assert.match(sql,/INSERT INTO candidate_onboardings/);
  assert.match(sql,/UPDATE candidate_applications/);
  assert.match(sql,/UPDATE candidates/);
  assert.deepEqual(queries[0].params,[10,3,3]);
});
test('DECLINED does not reject the candidate globally',async()=>{
  setup(row());
  await repo.respondToOffer(3,10,{status:'DECLINED',response:'Không phù hợp'});
  assert.deepEqual(tx,['begin','commit','release']);
  assert.equal(queries.some(q=>q.sql.includes('INSERT INTO candidate_onboardings')),false);
  assert.equal(queries.some(q=>q.sql.includes('UPDATE candidates')),false);
});
test('hidden or answered offers never mutate application',async()=>{
  setup(null);
  await assert.rejects(repo.respondToOffer(3,10,{status:'ACCEPTED'}), {statusCode:404});
  assert.deepEqual(tx,['begin','rollback','release']);
  setup(row('APPROVED'));
  await assert.rejects(repo.respondToOffer(3,10,{status:'ACCEPTED'}), {statusCode:409});
  assert.deepEqual(tx,['begin','rollback','release']);
});
test('a second response racing another update cannot create onboarding',async()=>{
  setup(row());results.affected=0;
  await assert.rejects(repo.respondToOffer(3,10,{status:'ACCEPTED'}), {statusCode:409});
  assert.deepEqual(tx,['begin','rollback','release']);
  assert.equal(queries.some(q=>q.sql.includes('INSERT INTO candidate_onboardings')),false);
});
test('missing accountable HR owner fails closed and rolls back',async()=>{
  setup({...row(),created_by:null});
  await assert.rejects(repo.respondToOffer(3,10,{status:'ACCEPTED'}), {statusCode:503});
  assert.deepEqual(tx,['begin','rollback','release']);
});
