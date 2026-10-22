'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
const validation = require('./offerValidation');
let state={};
const conn={
  execute:async(sql,params)=>{
    state.calls.push({sql,params});
    if(/SELECT s\.id/.test(sql)) return [state.proof? [{id:7}]:[]];
    if(/UPDATE candidate_offers/.test(sql)) return [{affectedRows:state.affected??1}];
    if(/INSERT INTO candidate_notifications/.test(sql)) return [{insertId:99}];
    throw new Error('Unexpected SQL');
  }
};
const repo={
  assertDraftWritesReady(){if(!state.ready) validation.dependencyUnavailable()},
  withTransaction: async work=>{
    state.started=true;
    try{const result=await work(conn);state.committed=true;return result}
    catch(e){state.rolledBack=true;throw e;}
  },
  findScopedOfferForUpdate:async (id,scope)=>state.offer
};
const auth={getSubmitScope: user=>{
  if(!user?.user_id) throw Object.assign(new Error('Denied'),{statusCode:403});
  return {sql:' AND o.created_by = ?',params:[user.user_id]};
}};
const fake={
  '../config/database':{pool:{}},
  '../repositories/notificationRepository':{},
  './offerAuthorization':auth,
  '../repositories/offerRepository':repo,
  './offerValidation':validation,
  './offerSchemaCompatibility':{withOfferSchemaGuard:async work=>work()},
  '../repositories/offerPersistenceDependencies':{}
};
try {
  Module._load=function(request,parent,isMain){
    if(parent?.filename?.replace(/\\/g, '/').endsWith('/services/offerService.js') && Object.hasOwn(fake,request))
      return fake[request];
    return originalLoad.apply(this,arguments);
  };
  var service=require('./offerService');
} finally {Module._load=originalLoad;}
function setup(override={}){
  state={ready:true,proof:true,calls:[],offer:{id:12,candidate_id:3,
    created_by:7,job_title:'Developer',row_version:5,status:'APPROVED'},...override};
}
test('publish requires approved outbox proof and atomically writes candidate notification',async()=>{
  setup();
  const result=await service.publishOffer(12,{user_id:7},'"5"');
  assert.equal(result.status,'SENT');assert.equal(result.row_version,6);
  assert.equal(state.committed,true);
  assert.deepEqual(state.calls.map(c=>/SELECT s\.id/.test(c.sql)?'proof':/UPDATE candidate_offers/.test(c.sql)?'update':'candidate-inbox'),
    ['proof','update','candidate-inbox']);
});
test('legacy APPROVED without durable outbox cannot be published',async()=>{
  setup({proof:false});
  await assert.rejects(service.publishOffer(12,{user_id:7},'"5"'),{statusCode:503});
  assert.equal(state.rolledBack,true);
  assert.equal(state.calls.some(c=>/UPDATE candidate_offers/.test(c.sql)),false);
});
test('stale version and draft status both stop before SQL',async()=>{
  setup();
  await assert.rejects(service.publishOffer(12,{user_id:7},'"4"'),{statusCode:409});
  assert.equal(state.calls.length,0);
  setup({offer:{id:12,candidate_id:3,created_by:7,status:'DRAFT',row_version:5}});
  await assert.rejects(service.publishOffer(12,{user_id:7},'"5"'),{statusCode:409});
  assert.equal(state.calls.length,0);
});
test('schema readiness guard keeps legacy team DB closed',async()=>{
  setup({ready:false});
  await assert.rejects(service.publishOffer(12,{user_id:7},'"5"'),{statusCode:503});
  assert.equal(state.started,undefined);
});
