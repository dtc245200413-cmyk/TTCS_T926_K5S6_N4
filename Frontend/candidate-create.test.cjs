// Build first. All HTTP APIs are intercepted; files are synthetic browser Blobs.
// TEST_API_BASE_URL checks that the built app uses the requested environment.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');
const dist = path.join(__dirname, 'dist');
const source = { code: 'REFERRAL', name: 'Referral', category_group: 'CANDIDATE_SOURCE', is_active: 1 };
const candidate = { id: 1, full_name: 'Test Candidate', email: 'existing@example.test', status: 'NEW', resume_url: 'synthetic.pdf' };
const extracted = { parse_success: true, full_name: 'Parsed Candidate', email: 'parsed@example.test', phone: '0901234567', missing_fields: [] };
let state, page, browser, server, origin, passed = 0;
const errors = [];
function reset(role = 'RECRUITER') {
  state = { role, calls: [], matches: [], merges: [], parsed: extracted, parseDelay: 0, completedParses: 0, createDelay: 0, mergeFails: false };
}
const calls = (method, pathname) => state.calls.filter(call => call.method === method && call.pathname === pathname);
const creates = () => calls('POST', '/api/candidates');
const mergePosts = () => calls('POST', '/api/candidates/merge');
async function check(name, work) { await work(); console.log(`PASS ${++passed}: ${name}`); }
async function hasText(text) { await page.waitForFunction(t => document.body.innerText.includes(t), {}, text); }
async function open(url = '/candidates/create', fresh = true) {
  if (fresh) await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${origin}${url}`, { waitUntil: 'domcontentloaded' });
  if (url.endsWith('/create')) await page.waitForSelector('option[value="REFERRAL"]');
}
async function input(name, value) {
  await page.$eval(`form input[name="${name}"]`, (el, text) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
const value = name => page.$eval(`form input[name="${name}"]`, el => el.value);
async function clickText(text) {
  await page.evaluate(t => {
    const button = [...document.querySelectorAll('button')].find(el => el.textContent.includes(t));
    if (!button || button.disabled) throw new Error(`Unavailable button: ${t}`);
    button.click();
  }, text);
}
async function upload(size = 32) {
  await page.$eval('input[type="file"][accept=".pdf,application/pdf"]', (el, size) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(size)], 'synthetic.pdf', { type: 'application/pdf' }));
    el.files = transfer.files;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, size);
}
async function fill() {
  await input('full_name', 'Manual Candidate');
  await input('email', 'manual@example.test');
  await page.select('select[name="source_code"]', 'REFERRAL');
}
const submit = () => page.click('form button[type="submit"]');
const saved = () => page.waitForFunction(() => location.pathname === '/candidates');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(work) {
  for (let i = 0; i < 100; i++) { if (work()) return; await delay(20); }
  throw new Error('Mock API did not complete');
}
async function mockApi(request) {
  const url = new URL(request.url()), method = request.method(), scenario = state;
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  const respond = async (data, status = 200, extra = {}) => {
    try { await request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, ...extra }) }); }
    catch (error) { if (!/Invalid InterceptionId|already handled|Target closed/i.test(error.message)) throw error; }
  };
  if (method === 'OPTIONS') return respond(null);
  if (process.env.TEST_API_BASE_URL && (url.pathname.startsWith('/api/candidates') ||
      ['/api/master-data', '/api/recruitment-requests/my'].includes(url.pathname))) {
    assert.equal(url.origin, new URL(process.env.TEST_API_BASE_URL).origin);
  }
  const body = request.headers()['content-type']?.includes('application/json') && request.postData() ? JSON.parse(request.postData()) : null;
  scenario.calls.push({ method, pathname: url.pathname, origin: url.origin, body, contentType: request.headers()['content-type'] });
  if (url.pathname === '/api/auth/me') return respond({ user_id: 7, full_name: 'Test User', roles: [{ role_code: scenario.role }], permissions: [] });
  if (url.pathname === '/api/notifications') return respond({ notifications: [], unreadCount: 0 });
  if (url.pathname === '/api/master-data') return respond([source, { code: 'UNSUITABLE', name: 'Unsuitable', category_group: 'REJECTION_REASON' }]);
  if (url.pathname === '/api/recruitment-requests/my') return respond([{ id: 3, status: 'APPROVED', position_name: 'Developer' }, { id: 4, status: 'DRAFT' }]);
  if (url.pathname === '/api/candidates/parse-cv') {
    const parsed = scenario.parsed;
    await delay(scenario.parseDelay);
    await respond(parsed, scenario.parseStatus || 200, scenario.parseStatus ? { message: 'Dung lượng CV tối đa là 5 MB.' } : {});
    scenario.completedParses++;
    return;
  }
  if (url.pathname === '/api/candidates/duplicates') return respond(scenario.matches);
  if (url.pathname === '/api/candidates/merges') return respond(scenario.merges);
  if (url.pathname === '/api/candidates/merge') {
    if (scenario.mergeFails) return respond(null, 500, { message: 'Lỗi gộp thử nghiệm' });
    scenario.merges.push({ id: 5, ...body });
    if (scenario.loseMergeResponse) return request.abort('failed');
    return respond({ merge_id: 5 });
  }
  if (url.pathname === '/api/candidates' && method === 'POST') {
    await delay(scenario.createDelay);
    if (scenario.createStatus) return respond(null, scenario.createStatus, { duplicates: [candidate], message: 'Không thể lưu' });
    if (scenario.loseCreateResponse) return request.abort('failed');
    return respond({ id: 12, ...body }, 201);
  }
  if (url.pathname === '/api/candidates') return respond([candidate]);
  if (/\/candidates\/\d+\/status$/.test(url.pathname)) return respond({});
  if (/\/candidates\/\d+\/resume$/.test(url.pathname)) return request.respond({ status: 200, headers, contentType: 'application/pdf', body: '%PDF-1.4 synthetic' });
  if (/\/candidates\/merges\/\d+\/undo$/.test(url.pathname)) return respond({});
  return respond(null, 404, { message: 'Unexpected API request' });
}

(async () => {
  server = http.createServer((req, res) => {
    let file = path.resolve(dist, '.' + new URL(req.url, 'http://local').pathname);
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH, await puppeteer.executablePath(), 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => file && fs.existsSync(file));
  browser = await puppeteer.launch({ headless: true, executablePath });
  page = await browser.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'mock-token'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) mockApi(request).catch(error => { errors.push(error.message); request.abort().catch(() => {}); });
    else if (request.url().startsWith(origin)) request.continue();
    else request.abort();
  });
  reset(); await page.goto(origin); await open();
  await check('Upload, explicit confirmation and normalized create preserve the normal flow', async () => {
    await upload(); await hasText('Thông tin bóc tách từ CV');
    assert.equal(await value('email'), '');
    await clickText('Xác nhận thông tin');
    assert.equal(await value('email'), extracted.email);
    assert.match(calls('POST', '/api/candidates/parse-cv')[0].contentType, /multipart\/form-data; boundary=/);
    assert.equal(await page.$('option[value="4"]'), null);
    await page.select('select[name="source_code"]', 'REFERRAL'); await page.select('select[name="recruitment_request_id"]', '3');
    await submit(); await saved();
    assert.equal(creates().length, 1); assert.equal(creates()[0].body.recruitment_request_id, 3);
  });
  reset(); state.parseDelay = 300; await open();
  await check('Reset discards a late parse response and allows a new CV', async () => {
    await upload(); await waitFor(() => calls('POST', '/api/candidates/parse-cv').length === 1);
    await clickText('Chọn lại'); await waitFor(() => state.completedParses === 1);
    assert.ok(!(await page.$eval('body', el => el.innerText)).includes('Thông tin bóc tách từ CV'));
    assert.equal(await value('email'), '');
    state.parsed = { ...extracted, email: 'second@example.test' }; state.parseDelay = 0;
    await upload(); await hasText('Thông tin bóc tách từ CV'); await clickText('Xác nhận thông tin');
    assert.equal(await value('email'), 'second@example.test');
  });
  reset(); state.parsed = { ...extracted, email: '', phone: '', missing_fields: ['email', 'phone'] }; await open();
  await check('Missing CV fields retain manually entered email and phone', async () => {
    await fill(); await input('phone', '0987654321'); await upload(); await hasText('Thông tin bóc tách từ CV'); await clickText('Xác nhận thông tin');
    assert.equal(await value('email'), 'manual@example.test'); assert.equal(await value('phone'), '0987654321');
    assert.equal(await value('full_name'), extracted.full_name);
  });
  reset(); state.parsed = { ...extracted, email: 'invalid', phone: '0-------' }; await open();
  await check('Invalid extracted contact fields do not overwrite valid manual values', async () => {
    await fill(); await input('phone', '0987654321'); await upload(); await hasText('Thông tin bóc tách từ CV'); await clickText('Xác nhận thông tin');
    assert.equal(await value('email'), 'manual@example.test'); assert.equal(await value('phone'), '0987654321');
  });
  reset(); await open();
  await check('Oversized CV is rejected locally without HTTP upload', async () => {
    await upload(5 * 1024 * 1024 + 1); await hasText('Dung lượng CV tối đa là 5 MB');
    assert.equal(calls('POST', '/api/candidates/parse-cv').length, 0);
  });
  reset(); state.parseStatus = 413; await open();
  await check('Backend 413 shows Vietnamese guidance and permits manual entry', async () => {
    await upload(); await hasText('Vui lòng chọn tệp nhỏ hơn'); await fill(); await submit(); await saved();
  });
  reset(); state.parsed = { parse_success: false, warning: 'Không đọc được PDF' }; await open();
  await check('Parse failure retains manual creation', async () => {
    await upload(); await hasText('Không đọc được PDF'); await fill(); await submit(); await saved();
  });
  reset(); state.matches = [candidate]; state.mergeFails = true; await open();
  await check('Merge retry reuses the created ID, including across page reload', async () => {
    await fill(); await submit(); await hasText('So sánh hồ sơ'); await clickText('Giữ hồ sơ hiện có'); await hasText('Lỗi gộp thử nghiệm');
    assert.equal(creates().length, 1);
    const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('candidate-create:7')));
    assert.deepEqual(stored, { phase: 'merge', primary_id: 1, secondary_id: 12 });
    await page.reload(); await hasText('Hồ sơ #12 đã được tạo');
    await clickText('Thử lại gộp hồ sơ'); await hasText('Lỗi gộp thử nghiệm'); assert.equal(creates().length, 1);
    state.mergeFails = false; await clickText('Thử lại gộp hồ sơ'); await saved();
    assert.equal(creates().length, 1); assert.equal(mergePosts().length, 3);
    for (const call of mergePosts()) assert.deepEqual(call.body, { primary_id: 1, secondary_id: 12 });
  });
  reset(); state.matches = [candidate]; state.loseMergeResponse = true; await open();
  await check('Lost merge response is reconciled without another create or merge', async () => {
    await fill(); await submit(); await hasText('So sánh hồ sơ'); await clickText('Giữ hồ sơ hiện có');
    await hasText('Có lỗi xảy ra'); await clickText('Thử lại gộp hồ sơ'); await saved();
    assert.equal(creates().length, 1); assert.equal(mergePosts().length, 1);
  });
  reset(); state.loseCreateResponse = true; await open();
  await check('Ambiguous creation result blocks automatic resend, even after reload', async () => {
    await fill(); await submit(); await hasText('Chưa xác định được kết quả lưu');
    await page.reload(); await hasText('Chưa xác định được kết quả lưu');
    assert.equal(await page.$('form'), null); assert.equal(creates().length, 1);
  });
  reset(); state.createStatus = 409; await open();
  await check('409 restores duplicate comparison instead of locking the form', async () => {
    await fill(); await submit(); await hasText('Phát hiện hồ sơ trùng'); await hasText('So sánh hồ sơ');
    assert.ok(await page.$('form')); assert.equal(await page.evaluate(() => sessionStorage.getItem('candidate-create:7')), null);
  });
  reset(); state.matches = [candidate]; await open();
  await check('Save separately keeps duplicate override without merging', async () => {
    await fill(); await submit(); await hasText('So sánh hồ sơ'); await clickText('Lưu riêng, không gộp'); await saved();
    assert.equal(creates()[0].body.allow_duplicate, true); assert.equal(mergePosts().length, 0);
  });
  reset(); state.createDelay = 200; await open();
  await check('Repeated submit events do not duplicate create requests', async () => {
    await fill(); await page.$eval('form', el => { el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await saved(); assert.equal(creates().length, 1);
  });
  reset('HR_MANAGER'); state.merges = [{ id: 5, primary_id: 1, secondary_id: 12, hours_since_merge: 1 }]; await open('/candidates');
  await check('List, download, status and undo use the configured API origin', async () => {
    await hasText('Test Candidate');
    await page.click('button[title="Tải tệp PDF CV"]'); await waitFor(() => calls('GET', '/api/candidates/1/resume').length > 0);
    page.once('dialog', d => d.accept()); await clickText('Tuyển dụng'); await waitFor(() => calls('PUT', '/api/candidates/1/status').length > 0);
    page.once('dialog', d => d.accept()); await clickText('Hoàn tác'); await waitFor(() => calls('POST', '/api/candidates/merges/5/undo').length > 0);
    if (process.env.TEST_API_BASE_URL) for (const call of state.calls) assert.equal(call.origin, new URL(process.env.TEST_API_BASE_URL).origin);
  });
  for (const role of ['INTERVIEWER', 'HIRING_MANAGER', 'CANDIDATE']) {
    reset(role); await open('/candidates');
    await check(`${role} has no candidate mutation buttons`, async () => {
      await hasText('Test Candidate'); const text = await page.$eval('body', el => el.innerText);
      assert.equal(await page.$('a[href="/candidates/create"]'), null);
      assert.ok(!text.includes('Đánh trượt')); assert.equal(calls('GET', '/api/candidates/merges').length, 0);
    });
  }
  assert.deepEqual(errors, []);
  console.log(`SCRUM-67: ${passed} PASS, 0 FAIL`);
})().catch(error => { console.error(`FAIL after ${passed} passing checks:`, error); process.exitCode = 1; })
  .finally(async () => { if (browser) await browser.close(); if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); });
