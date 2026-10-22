'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const auth=require('./offerAuthorization');
test('verified approval scope rejects non-approver without opening DB access',async()=>{
  let reads=0;const conn={execute:async()=>{reads++;throw Error('should never query')}};
  await assert.rejects(auth.loadVerifiedApprovalAssignment({conn,offerId:3,rowVersion:2,
    user:{user_id:4,roles:[{role_code:'RECRUITER'}]}}),{statusCode:403});
  assert.equal(reads,0);
});
test('legacy non-atomic scope stays explicitly denied even for an ADMIN',async()=>{
  await assert.rejects(auth.getApprovalScope(9,{user_id:2,roles:[{role_code:'ADMIN'}]}),{statusCode:403});
});
test('missing conn or assignment never turns role membership into approval scope',async()=>{
  const user={user_id:8,roles:[{role_code:'APPROVER'}]};
  await assert.rejects(auth.loadVerifiedApprovalAssignment({offerId:9,rowVersion:2,user}),{statusCode:403});
});
