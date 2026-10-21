const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { parse } = require('@babel/parser');
const puppeteer = require('puppeteer');
const dist = path.join(__dirname, 'dist');
const results = [];
let server, browser, origin;
const offer = { id: 101, created_by: 3, row_version: 7, position_id: 12, offer_code: 'OFF-SMOKE-101', candidate_name: 'Candidate Smoke', candidate_email: 'candidate@example.test', job_title: 'Developer', department_name: 'Engineering', basic_salary: 25000000, currency: 'VND', expected_start_date: '2026-12-01', response_deadline: '2026-11-25', creator_name: 'Recruiter Smoke', created_at: '2026-10-20', approvals: [] };
async function fixture(role, status = 'DRAFT', route = '/offers', failureStatus, eligible = false) {
  const page = await browser.newPage();
  const state = { status, calls: [], errors: [], notificationRead: false };
  page.setDefaultTimeout(10000);
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'mock-offer-token'));
  page.on('pageerror', e => state.errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.setRequestInterception(true);
  page.on('request', request => {
    (async () => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) {
        if (url.origin === origin || url.protocol === 'data:') return request.continue();
        return request.abort();
      }
      const method = request.method();
      if (method === 'OPTIONS') return request.respond({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type, If-Match','Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'}});
      const body = request.postData() ? JSON.parse(request.postData()) : null;
      state.calls.push({ method, path: url.pathname, body });
      if (failureStatus && url.pathname.startsWith('/api/offers') &&
          (failureStatus !== 503 || method === 'POST')) {
        return request.respond({status:failureStatus,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:false,message:'PRIVATE_SALARY_DATA'})});
      }
      let data;
      if (url.pathname === '/api/auth/me') data = { user_id: 3, full_name: 'Smoke User', company_email: 'smoke@example.test', roles: [{role_code: role}], permissions: [] };
      else if (url.pathname === '/api/notifications') data = { notifications: [{notification_id: 1, title: 'OFFER SMOKE NOTICE', message: 'Offer notice', is_read: state.notificationRead, link: '/offers/approval'}], unreadCount: state.notificationRead ? 0 : 1 };
      else if (url.pathname === '/api/notifications/1/read') { state.notificationRead = true; data = null; }
      else if (url.pathname === '/api/candidate-evaluations') data = [{
        id: 201, full_name: 'Candidate Smoke', email: 'candidate@example.test',
        position_name: 'Developer', department_name: 'Engineering', status: 'INTERVIEWING',
        interview_decision: null, total_rounds: 0, total_evaluations: 0,
      }];
      else if (url.pathname === '/api/candidate-evaluations/201') data = {
        id: 201, full_name: 'Candidate Smoke', email: 'candidate@example.test',
        position_name: 'Developer', department_name: 'Engineering', status: 'INTERVIEWING',
        interview_decision: null, rounds: [], aggregate_score: null, offer: null,
      };
      else if (url.pathname === '/api/offers/eligibility') data = {
        eligible, permissions: { can_create: eligible }, next_cursor: null,
        reason_code: eligible ? null : 'DECISION_APPLICATION_UNVERIFIED',
        reason: eligible ? null : 'Chưa chứng minh quyết định Đạt còn hiệu lực cho đúng hồ sơ ứng tuyển.',
        applications: eligible ? [{ eligible: true, permissions: { can_create: true },
          candidate: { id: 7, name: 'Candidate Smoke' }, application: { id: 41, code: 'APP-41' },
          position: { id: 12, name: 'Developer' }, department: { id: 3, name: 'Engineering' }, prefill: {},
        }] : [],
      };
      else if (url.pathname === '/api/offers') data = [{...offer, status: state.status}];
      else if (url.pathname === '/api/offers/101') data = {...offer, status: state.status};
      else if (url.pathname === '/api/offers/101/submit') { state.status = 'PENDING_APPROVAL'; data = {...offer,status:state.status}; }
      else if (url.pathname === '/api/offers/101/process-approval') { state.status = body.action === 'REQUEST_CHANGE' ? 'CHANGE_REQUESTED' : body.action; data = {...offer,status:state.status}; }
      else throw new Error('Unexpected mocked API: '+method+' '+url.pathname);
      await request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,message:'OK',data})});
    })().catch(error => {state.errors.push(error.message); request.abort().catch(()=>{});});
  });
  await page.goto(origin+route);
  if (route === '/offers/new') await page.waitForFunction(() => document.body.innerText.includes('Chưa chứng minh quyết định Đạt'));
  else if (failureStatus && failureStatus !== 503) await page.waitForFunction(() => document.body.innerText.includes('Bạn không đủ quyền'));
  else await page.waitForFunction(() => document.body.innerText.includes('Candidate Smoke') ||
    document.querySelector('input[value="Candidate Smoke"]'));
  return {page,state};
}
async function clickText(page, text, selector = 'button') {
  await page.evaluate(({text, selector}) => {
    const button=[...document.querySelectorAll(selector)].find(el=>el.textContent.trim()===text);
    if(!button) throw new Error('Missing button: '+text);
    button.click();
  },{text, selector});
}
async function check(name, work) { await work(); results.push(name); console.log('PASS '+name); }
function readRoutes(node, parent = '', out = []) {
  if (!node || typeof node !== 'object') return out;
  let route = parent;
  if (node.type === 'JSXElement' && node.openingElement.name.name === 'Route') {
    const attrs = node.openingElement.attributes;
    const p = attrs.find(a => a.name?.name === 'path')?.value?.value;
    route = p?.startsWith('/') ? p : p ? `${parent}/${p}` : parent;
    out.push({
      path: p ?? null, index: attrs.some(a => a.name?.name === 'index'), parent,
      element: attrs.find(a => a.name?.name === 'element')?.value?.expression?.openingElement?.name?.name ?? null,
    });
  }
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => readRoutes(item, route, out));
    else if (value && typeof value === 'object') readRoutes(value, route, out);
  }
  return out;
}
(async()=>{
  try {
    await check('all previous routes retained, 63 -> 66, no duplicate resolved paths', async () => {
      const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests/offerRoutes.before.json'), 'utf8'));
      // Phase 3.1 added these routes after the original snapshot.
      before.push(
        { path: '/offers/new', index: false, parent: '', element: 'OfferForm' },
        { path: '/offers/:id/edit', index: false, parent: '', element: 'OfferForm' },
      );
      const after = readRoutes(parse(fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8'), { sourceType: 'module', plugins: ['jsx'] }));
      assert.equal(before.length, 63);
      assert.equal(after.length, 66);
      const keys = after.map(item => JSON.stringify(item));
      for (const item of before) assert.ok(keys.includes(JSON.stringify(item)), `Lost route ${JSON.stringify(item)}`);
      const paths = after.filter(item => item.path !== null).map(item => item.path.startsWith('/') ? item.path : `${item.parent}/${item.path}`);
      assert.equal(paths.length, new Set(paths).size);
      assert.ok(after.findIndex(item => item.path === '/offers/new') < after.findIndex(item => item.path === '/offers/:id'));
      assert.ok(after.findIndex(item => item.path === '/offers/approval') < after.findIndex(item => item.path === '/offers/:id'));
      assert.ok(after.some(item => item.path === '/candidate-evaluations' && item.element === 'ProtectedRoute'));
      assert.ok(after.some(item => item.parent === '/candidate-evaluations' && item.index && item.element === 'CandidateEvaluationList'));
      assert.ok(after.some(item => item.parent === '/candidate-evaluations' && item.path === ':id' && item.element === 'CandidateEvaluationDetail'));
    });
    server=http.createServer((req,res)=>{
      let file=path.resolve(dist,'.'+new URL(req.url,'http://local').pathname);
      if(!file.startsWith(path.resolve(dist)+path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file=path.join(dist,'index.html');
      res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    origin='http://127.0.0.1:'+server.address().port;
    const executablePath=[process.env.PUPPETEER_EXECUTABLE_PATH,await puppeteer.executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>typeof p==='string'&&fs.existsSync(p));
    browser=await puppeteer.launch({headless:true,executablePath});
    for(const route of ['/offers','/offers/101','/offers/approval','/offers/new','/offers/101/edit']) await check('route '+route,async()=>{
      const {page,state}=await fixture('RECRUITER','DRAFT',route);
      if (route === '/offers/101') await page.waitForFunction(() => document.body.innerText.includes('Chi tiết Offer: OFF-SMOKE-101'));
      if (route === '/offers/101/edit') await page.waitForSelector('input[name="job_title"]');
      assert.deepEqual(state.errors,[]); await page.close();
    });
    for(const role of ['ADMIN','HR_MANAGER','RECRUITER','APPROVER']) await check('sidebar Offer '+role,async()=>{
      const {page,state}=await fixture(role);
      assert.equal(await page.$$eval('aside a[href="/offers"], .sidebar a[href="/offers"]',nodes=>nodes.length),1);
      assert.deepEqual(state.errors,[]); await page.close();
    });
    for (const route of ['/candidate-evaluations', '/candidate-evaluations/201']) await check('Evaluation route and both navigation entries ' + route, async () => {
      const { page, state } = await fixture('HR_MANAGER', 'DRAFT', route);
      assert.ok(state.calls.some(call => call.method === 'GET' && call.path === '/api' + route));
      for (const link of ['/offers', '/candidate-evaluations']) {
        assert.equal(await page.$$eval(`aside a[href="${link}"], .sidebar a[href="${link}"]`, nodes => nodes.length), 1);
      }
      assert.deepEqual(state.errors, []); await page.close();
    });
    await check('detail and existing submit API',async()=>{
      const {page,state}=await fixture('RECRUITER');
      await clickText(page,'Chi tiết');
      await page.waitForFunction(()=>document.body.innerText.includes('Lịch sử phê duyệt'));
      assert.ok(state.calls.some(c=>c.method==='GET'&&c.path==='/api/offers/101'));
      await clickText(page,'Đóng'); await clickText(page,'Gửi duyệt');
      await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Gửi duyệt'));
      assert.equal(state.calls.filter(c=>c.method==='POST'&&c.path==='/api/offers/101/submit').length,1);
      assert.deepEqual(state.errors,[]); await page.close();
    });
    for(const [button,action] of [['Duyệt','APPROVED'],['Từ chối','REJECTED'],['Sửa','REQUEST_CHANGE']]) await check('preserved approval action '+action,async()=>{
      const {page,state}=await fixture('APPROVER','PENDING_APPROVAL');
      await clickText(page,button,'tbody button'); await page.waitForSelector('textarea');
      await page.type('textarea','Smoke reason'); await clickText(page,'Xác nhận');
      await page.waitForFunction(()=>!document.querySelector('textarea'));
      assert.ok(state.calls.some(c=>c.path==='/api/offers/101/process-approval'&&c.body?.action===action&&c.body?.reason==='Smoke reason'));
      assert.deepEqual(state.errors,[]); await page.close();
    });
    await check('Offer notification navigation',async()=>{
      const {page,state}=await fixture('RECRUITER','DRAFT','/offers/101');
      await page.evaluate(()=>[...document.querySelectorAll('header span')].find(e=>e.textContent==='🔔').click());
      await page.waitForFunction(()=>document.body.innerText.includes('OFFER SMOKE NOTICE'));
      await page.evaluate(()=>[...document.querySelectorAll('header div')].find(e=>e.textContent==='OFFER SMOKE NOTICE').click());
      await page.waitForFunction(()=>location.pathname==='/offers');
      assert.ok(state.notificationRead); assert.deepEqual(state.errors,[]); await page.close();
    });
    await check('new draft action is not enabled without Backend eligibility', async () => {
      const { page, state } = await fixture('RECRUITER');
      assert.equal(await page.$('a[href="/offers/new"]'), null);
      await page.waitForFunction(() => document.body.innerText.includes('Chưa chứng minh quyết định Đạt'));
      assert.ok(state.calls.some(call => call.method === 'GET' && call.path === '/api/offers/eligibility'));
      assert.deepEqual(state.errors, []); await page.close();
    });
    await check('draft edit navigation enters shared form', async () => {
      const { page, state } = await fixture('RECRUITER');
      await page.click('a[href="/offers/101/edit"]');
      await page.waitForSelector('input[name="job_title"]');
      assert.deepEqual(state.errors, []); await page.close();
    });
    await check('create navigation requires affirmative Backend eligibility', async () => {
      const { page, state } = await fixture('RECRUITER', 'DRAFT', '/offers', undefined, true);
      await page.waitForSelector('a[href="/offers/new"]');
      await page.click('a[href="/offers/new"]');
      await page.waitForSelector('select[name="application_id"]:not(:disabled)');
      assert.ok(state.calls.filter(call => call.path === '/api/offers/eligibility').length >= 2);
      assert.deepEqual(state.errors, []); await page.close();
    });
    await check('list 403 hides salary and reports denial without private server text', async () => {
      const { page, state } = await fixture('RECRUITER', 'DRAFT', '/offers', 403);
      const text = await page.$eval('body', node => node.textContent);
      assert.ok(!text.includes('PRIVATE_SALARY_DATA'));
      assert.ok(!text.includes('Candidate Smoke'));
      assert.equal(await page.$('tbody'), null);
      assert.deepEqual(state.errors, []); await page.close();
    });
    await check('list submit 503 reports pending dependency without success', async () => {
      const { page, state } = await fixture('RECRUITER', 'DRAFT', '/offers', 503);
      await clickText(page, 'Gửi duyệt');
      await page.waitForFunction(() => document.body.textContent.includes('Chức năng lưu/gửi Offer đang chờ hoàn thiện Backend hoặc cơ sở dữ liệu'));
      assert.ok(!(await page.$eval('body', node => node.textContent)).includes('Gửi duyệt Offer thành công'));
      assert.deepEqual(state.errors, []); await page.close();
    });
  } catch(error) {console.error(error); process.exitCode=1;}
  finally {if(browser) await browser.close(); if(server) await new Promise(resolve=>server.close(resolve)); console.log(JSON.stringify({passed:results.length,success:!process.exitCode}));}
})();
