'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {activate,isDraftSchemaReady}=require('./offerRuntimeReadiness');
const db='internal_recruitment_scrum103_e2e';
function poolFor(identity=db){
  const trace=[];
  const conn={release(){trace.push('release')},async query(sql){trace.push(sql);return [[{name:identity}]]},
    async execute(sql){trace.push(sql);return [[]];}};
  return {pool:{getConnection:async()=>conn},trace};
}
test('schema readiness never activates without a DB/schema binding',async()=>{
  assert.equal((await activate({expectedDatabase:db})).ready,false);
  assert.equal(isDraftSchemaReady(),false);
});
test('wrong connected database refuses to activate and releases connection',async()=>{
  const {pool,trace}=poolFor('internal_recruitment_system');
  const state=await activate({pool,expectedDatabase:db});
  assert.equal(state.ready,false);
  assert.equal(state.reason,'DATABASE_MISMATCH');
  assert.deepEqual(trace,['SELECT DATABASE() AS name','release']);
  assert.equal(isDraftSchemaReady(),false);
});
test('partial schema blocks writes without DDL or seeding',async()=>{
  const {pool,trace}=poolFor();
  const state=await activate({pool,expectedDatabase:db});
  assert.equal(state.ready,false);
  assert.equal(state.reason,'SCHEMA_NOT_READY');
  assert.ok(state.missing.length>0);
  assert.ok(trace.filter(x=>x!=='release').every(x=>x.trim().startsWith('SELECT')));
  assert.equal(isDraftSchemaReady(),false);
});
