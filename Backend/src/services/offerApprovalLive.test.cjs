'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createLiveApprovalService, getAssignedInbox, getAssignedOfferDetail,
  hasApproverRole, writeAudit, enqueueOutbox } = require('./offerApprovalLive');

const user = { user_id: 8, roles: [{ role_code: 'APPROVER' }] };
function fixture({ failOutbox = false, failSchema = false, mandateValid = true } = {}) {
  const operations = [];
  const state = { begins: 0, commits: 0, rollbacks: 0, releases: 0 };
  const conn = {
    beginTransaction: async () => { state.begins++; operations.push('BEGIN'); },
    commit: async () => { state.commits++; operations.push('COMMIT'); },
    rollback: async () => { state.rollbacks++; operations.push('ROLLBACK'); },
    release: () => { state.releases++; operations.push('RELEASE'); },
    execute: async (sql, args) => {
      operations.push(sql);
      if (sql.includes('SELECT id, application_id, row_version, status, created_by') && sql.includes('candidate_offers'))
        return [[{ id: 19, application_id: 21, row_version: 3, status: 'PENDING_APPROVAL', created_by: 5 }]];
      if (sql.includes('SELECT o.id, o.row_version')) return [[{id:19,row_version:3}]];
      if (sql.includes('JOIN offer_submissions s'))
        return [[{offer_id:19, application_id:21, row_version:3, submission_id:51,
          submission_number:1,offer_row_version:3,decision_source:'candidate_hiring_decisions',
          decision_reference:'30',decision_version:'1',approver_id:8,assigned_by:6,
          assignment_source:'DEPARTMENT_MANAGER_EXPLICIT_OFFER_V1',assignment_reference:'72',assignment_version:'2'}]];
      if (sql.includes('FROM offer_approval_mandates'))
        return [[{id:72,offer_id:19,application_id:21,department_id:2,approver_id:8,assigned_by:6,version:2,revoked_at:null}]];
      if (sql.includes('FROM departments d')) return [[{department_id:2}]];
      if (sql.includes('SELECT DISTINCT u.user_id FROM users u')) return [[{user_id:8}]];
      if (sql.includes('SELECT audit_log_id FROM audit_logs')) return [mandateValid?[{audit_log_id:17}]:[]];
      if (sql.includes('UPDATE candidate_offers')) return [{affectedRows:1}];
      if (sql.includes('INSERT INTO offer_approvals')) return [{insertId:111}];
      if (sql.includes('INSERT INTO audit_logs')) return [{insertId:112}];
      if (sql.includes('SELECT created_by FROM candidate_offers')) return [[{created_by:5}]];
      if (sql.includes('INSERT INTO offer_approval_outbox')) {
        if (failOutbox) throw Object.assign(new Error('private SQL info'),
          { code: failSchema?'ER_NO_SUCH_TABLE':'ER_LOCK_DEADLOCK' });
        return [{insertId:113}];
      }
      if (sql.includes('SELECT id, row_version FROM candidate_offers')) return [[{id:19,row_version:3}]];
      if (sql.includes('SELECT o.id, o.offer_code')) return [[{id:19,offer_code:'OFF-19',row_version:3,status:'PENDING_APPROVAL',candidate_name:'Test'}]];
      if (sql.includes('SELECT o.*, c.full_name')) return [[{id:19,row_version:3,status:'PENDING_APPROVAL',candidate_name:'Test'}]];
      if (sql.includes('FROM offer_approvals WHERE offer_id')) return [[]];
      throw new Error('Unexpected SQL in test: '+sql);
    }
  };
  const pool = {getConnection:async()=>conn};
  return {operations,state,conn,pool};
}

test('non-approver cannot trigger DB acquisition', async () => {
  let reads=0;
  const svc=createLiveApprovalService({dbPool:{getConnection:async()=>{reads++;throw Error('should not happen');}}});
  await assert.rejects(svc.decide({offerId:19,user:{user_id:8,roles:[{role_code:'RECRUITER'}]},
    ifMatch:'"3"',action:'APPROVED'}), {statusCode:403});
  await assert.rejects(svc.decide({offerId:19,ifMatch:'\"3\"',action:'APPROVED'}),{statusCode:403});
  assert.equal(reads,0);
  assert.equal(hasApproverRole({roles:[{role_code:'ADMIN'}]}),true);
});

test('missing If-Match prevents DB transaction', async () => {
  let reads=0;
  const svc=createLiveApprovalService({dbPool:{getConnection:async()=>{reads++;throw Error('should not happen');}}});
  await assert.rejects(svc.decide({offerId:19,user,action:'APPROVED'}),{statusCode:428});
  assert.equal(reads,0);
});

test('atomic approval persists version, history, audit, outbox before commit',async()=>{
  const f=fixture();const svc=createLiveApprovalService({dbPool:f.pool});
  const x=await svc.decide({offerId:19,user,ifMatch:'"3"',action:'APPROVED'});
  assert.equal(x.status,'APPROVED');assert.equal(x.row_version,4);
  assert.equal(x.notification_status,'QUEUED_NOT_DELIVERED');
  assert.deepEqual([f.state.begins,f.state.commits,f.state.rollbacks,f.state.releases],[1,1,0,1]);
  const order=(p)=>f.operations.findIndex(x=>x.includes(p));
  assert.ok(order('INSERT INTO offer_approvals')<order('INSERT INTO audit_logs'));
  assert.ok(order('INSERT INTO audit_logs')<order('INSERT INTO offer_approval_outbox'));
  assert.ok(order('INSERT INTO offer_approval_outbox')<order('COMMIT'));
});

test('outbox failure prevents commit and rolls back all approval changes',async()=>{
  const f=fixture({failOutbox:true});
  await assert.rejects(createLiveApprovalService({dbPool:f.pool}).decide({
    offerId:19,user,ifMatch:'"3"',action:'REJECTED',reason:'Reason'}),{statusCode:409});
  assert.deepEqual([f.state.commits,f.state.rollbacks,f.state.releases],[0,1,1]);
});

test('missing outbox schema returns safe 503 and rolls back',async()=>{
  const f=fixture({failOutbox:true,failSchema:true});
  await assert.rejects(createLiveApprovalService({dbPool:f.pool}).decide({
    offerId:19,user,ifMatch:'"3"',action:'APPROVED'}),{statusCode:503});
  assert.deepEqual([f.state.commits,f.state.rollbacks,f.state.releases],[0,1,1]);
});

test('mandate audit forgery denied, no write or commit',async()=>{
  const f=fixture({mandateValid:false});
  await assert.rejects(createLiveApprovalService({dbPool:f.pool}).decide({
    offerId:19,user,ifMatch:'"3"',action:'APPROVED'}),{statusCode:403});
  assert.equal(f.operations.some(x=>x.includes('INSERT INTO offer_approvals')),false);
  assert.deepEqual([f.state.commits,f.state.rollbacks],[0,1]);
});

test('assigned inbox exposes only DB-backed proven assigned offers',async()=>{
  const f=fixture();const data=await getAssignedInbox({dbPool:f.pool,user});
  assert.equal(data.length,1);assert.equal(data[0].offer_code,'OFF-19');
  assert.equal(data[0].can_approve,true, 'Proven assignment must enable approval UI');
  assert.equal(f.state.commits,1);
});

test('assigned inbox skips invalid provenance before querying candidate name',async()=>{
  const f=fixture({mandateValid:false});const data=await getAssignedInbox({dbPool:f.pool,user});
  assert.deepEqual(data,[]);
  assert.equal(f.operations.some(x=>x.includes('c.full_name')),false);
});

test('approval detail requires assigned proof before revealing salary',async()=>{
  const f=fixture();const data=await getAssignedOfferDetail({dbPool:f.pool,user,offerId:19});
  assert.equal(data.id,19);assert.equal(data.approvals.length,0);
  assert.equal(data.can_approve,true, 'Details require proven assignment');
  const g=fixture({mandateValid:false});
  await assert.rejects(getAssignedOfferDetail({dbPool:g.pool,user,offerId:19}),{statusCode:403});
  assert.equal(g.operations.some(x=>x.includes('SELECT o.*, c.full_name')),false);
});

test('audit and outbox receipts use durable DB inserts, not external delivery',async()=>{
  const f=fixture();const event={offer_id:19,application_id:21,submission_id:51,
    approval_history_id:111,actor_user_id:8,action:'APPROVED',status:'APPROVED',new_row_version:4,
    previous_row_version:3,reason:null};
  assert.equal((await writeAudit({conn:f.conn,event})).id,112);
  assert.equal((await enqueueOutbox({conn:f.conn,event})).id,113);
  assert.ok(f.operations.some(x=>x.includes('offer_approval_outbox')));
});
