jest.mock('../config/database', () => ({ pool: { execute: jest.fn(), getConnection: jest.fn() } }));
const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const repository = require('../repositories/candidatePortalRepository');
const router = require('./candidatePortalRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

const secret = 'candidate-portal-offer-test-secret';
const previousSecret = process.env.JWT_SECRET;
const hiddenStatuses = ['DRAFT','PENDING_APPROVAL','CHANGE_REQUESTED','APPROVED','REJECTED','CANCELLED','UNKNOWN'];
let server,baseUrl,offers,authSpy,errorSpy,conn;
function offer(id,status,owner=17){
  return { id, owner, candidate_id:owner, application_id:id+100, offer_code:`OFF-${id}`,
    salary_amount:'25000000.00',basic_salary:'25000000.00', currency:'VND',
    start_date:'2099-12-01',expected_start_date:'2099-12-01',
    response_deadline:'2099-11-20',message:'Public message',status,
    candidate_response:null,responded_at:null,created_at:'2026-10-20',
    created_by:3,job_title:'Developer',department_name:'IT' };
}
const publicStatuses=['PENDING_RESPONSE','SENT','ACCEPTED','DECLINED','EXPIRED'];
async function fakeSql(sql,params){
  if (/SELECT o\.id, o\.status/.test(sql)) {
    const item=offers.find(row=>row.id===Number(params[0]) && row.owner===Number(params[1]));
    return [[...(item?[item]:[])]];
  }
  if (/UPDATE candidate_offers/.test(sql)) {
    const [status,response,id] = params;
    const item=offers.find(row=>row.id===Number(id) && ['PENDING_RESPONSE','SENT'].includes(row.status));
    if (!item) return [{affectedRows:0}];
    item.status=status;item.candidate_response=response;
    return [{affectedRows:1}];
  }
  if (/^\s*SELECT/.test(sql) && /FROM candidate_offers o/.test(sql)){
    const keys=[...sql.split(/\bFROM\b/)[0].matchAll(/o\.(\w+)/g)].map(m=>m[1]);
    const projection=[...new Set(keys)];
    return [offers.filter(row=>row.owner===Number(params[0])&&row.candidate_id===Number(params[1])&&publicStatuses.includes(row.status))
      .map(row=>({ ...Object.fromEntries(projection.map(k=>[k,row[k]])), job_title:row.job_title, department_name:row.department_name }))];
  }
  return [{affectedRows:1,insertId:1}];
}
beforeAll(async()=>{
  process.env.JWT_SECRET=secret;
  const app=express();app.use(express.json());
  app.use('/api/candidate-portal',router);
  app.use((req,res)=>res.status(404).json({success:false}));
  app.use(errorHandler);
  server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  baseUrl=`http://127.0.0.1:${server.address().port}/api/candidate-portal`;
});
afterAll(async()=>{
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  if(previousSecret===undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET=previousSecret;
});
beforeEach(()=>{
  offers=[offer(1,'PENDING_RESPONSE'),offer(2,'SENT'),offer(3,'ACCEPTED'),offer(4,'DECLINED'),offer(5,'EXPIRED'),
    ...hiddenStatuses.map((status,i)=>offer(10+i,status)),offer(99,'SENT',18)];
  conn={beginTransaction:jest.fn().mockResolvedValue(),commit:jest.fn().mockResolvedValue(),
    rollback:jest.fn().mockResolvedValue(),release:jest.fn(),execute:jest.fn(fakeSql)};
  pool.execute.mockReset().mockImplementation(fakeSql);
  pool.getConnection.mockReset().mockResolvedValue(conn);
  authSpy=jest.spyOn(repository,'findAuthById').mockResolvedValue({account_id:7,candidate_id:17,account_status:'ACTIVE'});
  errorSpy=jest.spyOn(console,'error').mockImplementation(()=>{});
});
afterEach(()=>{authSpy.mockRestore();errorSpy.mockRestore();});
async function request(path='/offers',{method='GET',body,token}={}){
  const credential=token===undefined?jwt.sign({tokenType:'candidate',candidateAccountId:7},secret):token;
  const headers={'Content-Type':'application/json'};
  if(credential) headers.Authorization=`Bearer ${credential}`;
  const response=await fetch(baseUrl+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
}
it.each([null,'invalid-token'])('requires candidate authentication (%s)',async token=>{
  expect((await request('/offers',{token})).status).toBe(401);
  expect((await request('/offers/2/respond',{token,method:'PATCH',body:{status:'ACCEPTED'}})).status).toBe(401);
  expect(pool.execute).not.toHaveBeenCalled();
});
it('requires active candidate account, never accepts staff JWT',async()=>{
  const staff=jwt.sign({userId:3,sessionToken:'staff'},secret);
  expect((await request('/offers',{token:staff})).status).toBe(401);
  authSpy.mockResolvedValue({candidate_id:17,account_status:'INACTIVE'});
  expect((await request()).status).toBe(401);
});
it.each(hiddenStatuses)('hides private state %s',async status=>{
  const r=await request(`/offers?status=${status}`);
  expect(r.status).toBe(200);
  expect(r.body.data.map(o=>o.status)).toEqual(publicStatuses);
});
it('list ignores forged candidate identity and excludes internal fields',async()=>{
  const r=await request('/offers?candidate_id=18');
  expect(r.status).toBe(200);
  expect(r.body.data.map(o=>o.id)).toEqual([1,2,3,4,5]);
  expect(pool.execute.mock.calls[0][1]).toEqual([17,17]);
  expect(JSON.stringify(r.body)).not.toContain('hiring_decision_id');
});
it('hidden Offer never has a candidate detail route',async()=>{
  expect((await request('/offers/10')).status).toBe(404);
  expect(pool.execute).not.toHaveBeenCalled();
});
it.each(hiddenStatuses)('cannot respond to private state %s',async status=>{
  const item=offers.find(o=>o.status===status);
  const r=await request(`/offers/${item.id}/respond`,{method:'PATCH',body:{status:'ACCEPTED'}});
  expect(r.status).toBe(409);
  expect(item.status).toBe(status);
  expect(conn.rollback).toHaveBeenCalled();
});
it('cannot respond to someone else\'s Offer, even with forged ID',async()=>{
  const r=await request('/offers/99/respond',{method:'PATCH',body:{status:'ACCEPTED',candidate_id:18}});
  expect(r.status).toBe(404);
  expect(offers.find(o=>o.id===99).status).toBe('SENT');
  expect(conn.commit).not.toHaveBeenCalled();
});
it.each(['ACCEPTED','DECLINED'])('candidate responds to SENT exactly once: %s',async status=>{
  const response=await request('/offers/2/respond',{method:'PATCH',body:{status,response:'Candidate reply'}});
  expect(response.status).toBe(200);
  expect(offers[1].status).toBe(status);
  expect(conn.commit).toHaveBeenCalledTimes(1);
  const again=await request('/offers/2/respond',{method:'PATCH',body:{status,response:'Again'}});
  expect(again.status).toBe(409);
});
it('rejects invalid response body before opening a transaction',async()=>{
  for(const body of [{status:'DRAFT'},{status:'SENT'},{status:'DECLINED',response:'  '}]){
    expect((await request('/offers/2/respond',{method:'PATCH',body})).status).toBe(400);
  }
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('SQL error does not leak internals',async()=>{
  pool.execute.mockRejectedValue(new Error('secret SQL string'));
  const response=await request();
  expect(response.status).toBe(500);
  expect(JSON.stringify(response.body)).not.toContain('secret SQL string');
});
