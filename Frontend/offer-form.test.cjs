// Browser tests use the real axios adapter with intercepted HTTP requests.
// Eligibility also uses the actual axios HTTP contract; no view adapter override.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const puppeteer = require('puppeteer');

let server, browser, origin;
const draft = {
  id: 101, application_id: 41, created_by: 3, row_version: 7,
  candidate_name: 'Candidate Test', candidate_email: 'candidate@example.test',
  position_id: 12, position_name: 'Software Engineer', department_name: 'Engineering',
  job_title: 'Developer', basic_salary: '25000000.00', currency: 'VND',
  expected_start_date: '2027-01-15', response_deadline: '2027-01-10',
  offer_code: 'OFF-TEST', status: 'DRAFT', approvals: [],
};
const eligibilityItem = {
  eligible: true, permissions: { can_create: true }, reason_code: null, reason: null,
  candidate: { id: 7, name: draft.candidate_name }, application: { id: 41, code: 'APP-41', recruitment_request_id: 20 },
  position: { id: 12, name: draft.position_name }, department: { id: 3, name: draft.department_name }, prefill: {},
};

before(async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(__dirname, 'tests/offerFormHarness.jsx')],
    bundle: true, write: false, outfile: 'offer-harness.js', format: 'iife',
    define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' },
  });
  server = http.createServer((req, res) => {
    const file = bundle.outputFiles.find(item => '/' + path.basename(item.path) === req.url);
    res.setHeader('Content-Type', file ? (req.url.endsWith('.css') ? 'text/css' : 'application/javascript') : 'text/html');
    res.end(file ? file.contents : '<!doctype html><html><head><link rel="stylesheet" href="/offer-harness.css"></head><body><div id="root"></div><script src="/offer-harness.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH, await puppeteer.executablePath(),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => typeof file === 'string' && fs.existsSync(file));
  browser = await puppeteer.launch({ headless: true, executablePath });
});
after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function fixture(t, config = {}) {
  const page = await browser.newPage();
  t.after(() => page.close());
  page.setDefaultTimeout(8000);
  const state = { offer: { ...draft, ...config.offer }, calls: [], errors: [] };
  await page.evaluateOnNewDocument(data => {
    window.__offerFixture = data;
    if (location.pathname !== '/login') localStorage.setItem('token', 'mock-test-token');
  }, {
    user: { user_id: 3, roles: (config.roles || ['RECRUITER']).map(role_code => ({ role_code })) },
  });
  page.on('pageerror', error => state.errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    (async () => {
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/')) {
        if (url.origin === origin || url.protocol === 'data:') return request.continue();
        return request.abort();
      }
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      };
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
      const call = {
        method: request.method(), path: url.pathname, headers: request.headers(),
        body: request.postData() ? JSON.parse(request.postData()) : null,
      };
      state.calls.push(call);
      const send = (status, body) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
      if (config.failure && config.failure.method === call.method &&
          (!config.failure.path || config.failure.path === call.path)) {
        return send(config.failure.status, { success: false, message: config.failure.message || 'SERVER_PRIVATE_DETAIL' });
      }
      let data;
      if (call.method === 'GET' && call.path === '/api/offers/eligibility') data = config.eligibilityResponse || {
        eligible: !!config.eligible, permissions: { can_create: !!config.eligible }, next_cursor: null,
        reason_code: config.eligible ? null : 'DECISION_APPLICATION_UNVERIFIED',
        reason: config.eligible ? null : 'Chưa chứng minh quyết định Đạt còn hiệu lực cho đúng hồ sơ ứng tuyển.',
        applications: config.eligible ? [eligibilityItem] : [],
      };
      else if (call.method === 'GET' && call.path === '/api/offers/101') data = state.offer;
      else if (call.method === 'POST' && call.path === '/api/offers') {
        await new Promise(resolve => setTimeout(resolve, 80));
        state.offer = { ...state.offer, ...call.body, row_version: 1 };
        data = state.offer;
      } else if (call.method === 'PATCH' && call.path === '/api/offers/101') {
        await new Promise(resolve => setTimeout(resolve, 80));
        assert.equal(call.headers['if-match'], `"${state.offer.row_version}"`);
        state.offer = { ...state.offer, ...call.body, row_version: state.offer.row_version + 1 };
        data = state.offer;
      } else if (call.method === 'POST' && call.path === '/api/offers/101/submit') {
        state.offer = { ...state.offer, status: 'PENDING_APPROVAL', row_version: state.offer.row_version + 1 };
        data = state.offer;
      } else throw new Error(`Unexpected API ${call.method} ${call.path}`);
      if (config.falseSuccess && call.method !== 'GET') return send(200, { success: false, message: 'Rejected' });
      return send(call.path === '/api/offers' && call.method === 'POST' ? 201 : 200, { success: true, data });
    })().catch(error => { state.errors.push(error.message); request.abort().catch(() => {}); });
  });
  await page.goto(origin + (config.route || '/offers/101/edit'));
  await page.waitForFunction(() => !document.body.textContent.includes('Đang tải thông tin Offer'));
  t.after(() => assert.deepEqual(state.errors, []));
  return { page, state };
}

async function click(page, text) {
  await page.evaluate(text => {
    const button = [...document.querySelectorAll('button')].find(button => button.textContent === text);
    if (!button || button.disabled) throw new Error(`Unavailable action ${text}`);
    button.click();
  }, text);
}
async function fill(page, name, value) {
  await page.$eval(`[name="${name}"]`, (input, value) => {
    const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function textVisible(page, text) {
  await page.waitForFunction(text => document.body.textContent.includes(text), {}, text);
}
const writes = state => state.calls.filter(call => call.method !== 'GET');
async function fillRequired(page) {
  for (const name of ['job_title', 'basic_salary', 'currency', 'expected_start_date', 'response_deadline']) {
    await fill(page, name, draft[name]);
  }
}

test('new form calls real eligibility and stays blocked when Backend denies eligibility', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new' });
  assert.equal(await page.$$eval('form input, form textarea, form select', fields => fields.length), 13);
  await textVisible(page, 'Chưa chứng minh quyết định Đạt');
  assert.equal(await page.$$eval('form button', buttons => buttons.every(button => button.disabled)), true);
  assert.deepEqual(state.calls.map(call => call.method + ' ' + call.path), ['GET /api/offers/eligibility']);
});

test('verified application selection uses labels and draft payload contains no protected fields', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligible: true });
  await page.select('[name="application_id"]', '41');
  await click(page, 'Lưu nháp');
  await textVisible(page, 'Đã lưu nháp Offer.');
  assert.equal(new URL(page.url()).pathname, '/offers/101/edit');
  const call = writes(state)[0];
  assert.equal(call.method, 'POST');
  assert.equal(call.body.application_id, 41);
  assert.equal(call.body.position_id, 12);
  assert.equal(call.body.job_title, null);
  for (const key of ['candidate_id', 'department_id', 'created_by', 'status', 'row_version']) assert.ok(!(key in call.body));
});

test('submission validates required fields; draft allows incomplete content', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligible: true });
  await page.select('[name="application_id"]', '41');
  await click(page, 'Gửi duyệt');
  assert.equal(await page.$$eval('[aria-invalid="true"]', nodes => nodes.length), 4);
  assert.equal(writes(state).length, 0);
  await fill(page, 'basic_salary', '-1');
  await click(page, 'Lưu nháp');
  await textVisible(page, 'Mức lương phải lớn hơn 0');
  assert.equal(writes(state).length, 0);
});

for (const status of ['DRAFT', 'CHANGE_REQUESTED']) {
  test(`edit ${status} uses actual row_version and shows latest change reason`, async t => {
    const { page, state } = await fixture(t, { offer: { status, approvals: [{ action: 'REQUEST_CHANGE', reason: 'Điều chỉnh ngày nhận việc' }] } });
    if (status === 'CHANGE_REQUESTED') await textVisible(page, 'Điều chỉnh ngày nhận việc');
    await fill(page, 'job_title', 'Senior Developer');
    await click(page, 'Lưu nháp');
    await textVisible(page, 'Đã lưu nháp Offer.');
    assert.equal(writes(state)[0].headers['if-match'], '"7"');
    assert.equal(writes(state)[0].body.job_title, 'Senior Developer');
    assert.ok(!('application_id' in writes(state)[0].body));
    await click(page, 'Lưu nháp');
    await page.waitForFunction(() => !document.body.textContent.includes('Đang xử lý'));
    assert.equal(writes(state)[1].headers['if-match'], '"8"');
  });
}

for (const status of ['PENDING_APPROVAL', 'APPROVED', 'SENT', 'REJECTED', 'ACCEPTED', 'PENDING_RESPONSE']) {
  test(`${status} is read-only and sends no write`, async t => {
    const { page, state } = await fixture(t, { offer: { status } });
    await textVisible(page, 'Chế độ chỉ đọc');
    assert.equal(await page.$$eval('form button, form textarea, form input[name]', nodes => nodes.every(node => node.disabled)), true);
    assert.equal(writes(state).length, 0);
  });
}

test('save then submit existing draft; response locks further editing', async t => {
  const { page, state } = await fixture(t);
  await fill(page, 'job_title', 'Updated title');
  await click(page, 'Gửi duyệt');
  await textVisible(page, 'Đã gửi Offer chờ phê duyệt.');
  assert.deepEqual(writes(state).map(call => call.method + ' ' + call.path), ['PATCH /api/offers/101', 'POST /api/offers/101/submit']);
  assert.equal(state.offer.job_title, 'Updated title');
  assert.equal(await page.$eval('[name="job_title"]', node => node.disabled), true);
});

test('create then submit uses returned ID and does not set status in draft payload', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligible: true });
  await page.select('[name="application_id"]', '41');
  await fillRequired(page);
  await click(page, 'Gửi duyệt');
  await textVisible(page, 'Đã gửi Offer chờ phê duyệt.');
  assert.deepEqual(writes(state).map(call => call.path), ['/api/offers', '/api/offers/101/submit']);
});

for (const [status, text] of [
  [400, 'Dữ liệu Offer chưa hợp lệ'], [403, 'Bạn không đủ quyền'],
  [404, 'Không tìm thấy Offer'], [409, 'Offer đã thay đổi'], [428, 'Thiếu phiên bản'],
  [503, 'Chức năng lưu/gửi Offer đang chờ hoàn thiện Backend hoặc cơ sở dữ liệu'],
]) {
  test(`PATCH ${status}: clear failure, no submit or false success`, async t => {
    const { page, state } = await fixture(t, { failure: { method: 'PATCH', status, message: status === 400 ? 'job_title quá dài' : undefined } });
    await click(page, 'Gửi duyệt');
    await textVisible(page, text);
    assert.equal(writes(state).length, 1);
    const body = await page.$eval('body', node => node.textContent);
    assert.ok(!body.includes('Đã lưu nháp Offer.'));
    assert.ok(!body.includes('Đã gửi Offer chờ phê duyệt.'));
    assert.ok(!body.includes('SERVER_PRIVATE_DETAIL'));
    if ([403, 404].includes(status)) assert.ok(!body.includes(draft.candidate_name));
  });
}

for (const status of [403, 404]) {
  test(`GET ${status} does not render sensitive fields or permit writes`, async t => {
    const { page, state } = await fixture(t, { failure: { method: 'GET', status } });
    await page.waitForSelector('[role="alert"]');
    assert.equal(await page.$('form'), null);
    assert.equal(writes(state).length, 0);
  });
}

test('401 uses shared axios login redirect and clears auth token', async t => {
  const { page } = await fixture(t, { failure: { method: 'PATCH', status: 401 } });
  await click(page, 'Lưu nháp');
  await page.waitForFunction(() => location.pathname === '/login');
  await textVisible(page, 'Vui lòng đăng nhập lại');
  assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
});

test('missing version blocks writes instead of fabricating If-Match', async t => {
  const { page, state } = await fixture(t, { offer: { row_version: null } });
  await textVisible(page, 'Backend chưa cung cấp phiên bản');
  assert.equal(await page.$$eval('form button', nodes => nodes.every(node => node.disabled)), true);
  assert.equal(writes(state).length, 0);
});

test('rapid repeated clicks produce only one PATCH', async t => {
  const { page, state } = await fixture(t);
  await page.evaluate(() => {
    const button = document.querySelector('button[type="submit"]');
    button.click(); button.click(); button.click();
  });
  await textVisible(page, 'Đã lưu nháp Offer.');
  assert.equal(writes(state).length, 1);
});

test('create 503 never shows saved state or redirects to a fabricated ID', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligible: true, failure: { method: 'POST', status: 503 } });
  await page.select('[name="application_id"]', '41');
  await click(page, 'Lưu nháp');
  await textVisible(page, 'Chức năng lưu/gửi Offer đang chờ hoàn thiện');
  assert.equal(new URL(page.url()).pathname, '/offers/new');
  assert.equal(writes(state).length, 1);
  assert.ok(!(await page.$eval('body', node => node.textContent)).includes('Đã lưu nháp Offer.'));
});

test('create success then submit 503 retains confirmed draft ID, error, and avoids duplicate creation', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligible: true, failure: { method: 'POST', path: '/api/offers/101/submit', status: 503 } });
  await page.select('[name="application_id"]', '41');
  await fillRequired(page);
  await click(page, 'Gửi duyệt');
  await textVisible(page, 'Chức năng lưu/gửi Offer đang chờ hoàn thiện');
  assert.equal(new URL(page.url()).pathname, '/offers/101/edit');
  await click(page, 'Gửi duyệt');
  await page.waitForFunction(() => !document.body.textContent.includes('Đang xử lý'));
  assert.equal(state.calls.filter(call => call.method === 'POST' && call.path === '/api/offers').length, 1);
  assert.ok(!(await page.$eval('body', node => node.textContent)).includes('Đã gửi Offer chờ phê duyệt.'));
});

test('HTTP 200 with success:false is not a successful save', async t => {
  const { page } = await fixture(t, { falseSuccess: true });
  await click(page, 'Lưu nháp');
  await textVisible(page, 'Không thể hoàn tất thao tác Offer');
  assert.ok(!(await page.$eval('body', node => node.textContent)).includes('Đã lưu nháp Offer.'));
});

for (const roles of [['CANDIDATE'], ['INTERVIEWER', 'ADMIN'], ['APPROVER'], ['HIRING_MANAGER']]) {
  test(`${roles.join('+')} cannot edit a returned draft`, async t => {
    const { page, state } = await fixture(t, { roles });
    assert.equal(await page.$$eval('form button', nodes => nodes.every(node => node.disabled)), true);
    assert.equal(writes(state).length, 0);
  });
}
test('Recruiter cannot edit someone else’s returned draft', async t => {
  const { page, state } = await fixture(t, { offer: { created_by: 99 } });
  await textVisible(page, 'Chế độ chỉ đọc');
  assert.equal(writes(state).length, 0);
});

for (const role of ['ADMIN', 'HR_MANAGER']) {
  test(`${role} may edit a draft returned by the scoped Backend GET`, async t => {
    const { page, state } = await fixture(t, { roles: [role], offer: { created_by: 99 } });
    await click(page, 'Lưu nháp');
    await textVisible(page, 'Đã lưu nháp Offer.');
    assert.equal(writes(state).length, 1);
  });
}

test('CHANGE_REQUESTED can be saved and resubmitted through the existing submit API', async t => {
  const { page, state } = await fixture(t, { offer: { status: 'CHANGE_REQUESTED' } });
  await click(page, 'Gửi duyệt');
  await textVisible(page, 'Đã gửi Offer chờ phê duyệt.');
  assert.equal(state.offer.status, 'PENDING_APPROVAL');
});

test('legacy UTC date serialization preserves Vietnam calendar date when saving', async t => {
  const { page, state } = await fixture(t, { offer: { expected_start_date: '2027-01-14T17:00:00.000Z' } });
  assert.equal(await page.$eval('[name="expected_start_date"]', node => node.value), '2027-01-15');
  await click(page, 'Lưu nháp');
  await textVisible(page, 'Đã lưu nháp Offer.');
  assert.equal(writes(state)[0].body.expected_start_date, '2027-01-15');
});

for (const [name, response] of [
  ['summary denied', { eligible: false, permissions: { can_create: true }, applications: [eligibilityItem] }],
  ['creation permission denied', { eligible: true, permissions: { can_create: false }, applications: [eligibilityItem] }],
  ['application denied', { eligible: true, permissions: { can_create: true }, applications: [{ ...eligibilityItem, eligible: false }] }],
  ['application permission denied', { eligible: true, permissions: { can_create: true }, applications: [{ ...eligibilityItem, permissions: { can_create: false } }] }],
]) {
  test(`eligibility ${name} never enables writes`, async t => {
    const { page, state } = await fixture(t, { route: '/offers/new', eligibilityResponse: response });
    assert.equal(await page.$$eval('form button', nodes => nodes.every(node => node.disabled)), true);
    assert.equal(writes(state).length, 0);
  });
}
test('ineligible application displays Backend reason without offering selection', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', eligibilityResponse: {
    eligible: false, permissions: { can_create: false }, reason: 'Hồ sơ đã có Offer còn hiệu lực.', reason_code: 'OFFER_ALREADY_EXISTS',
    applications: [{ ...eligibilityItem, eligible: false, permissions: { can_create: false }, reason: 'Hồ sơ đã có Offer còn hiệu lực.' }],
  } });
  await textVisible(page, 'Hồ sơ đã có Offer còn hiệu lực.');
  assert.equal(await page.$eval('[name="application_id"]', node => node.disabled), true);
  assert.equal(writes(state).length, 0);
});
test('eligibility 503 reports dependency and never enables the form', async t => {
  const { page, state } = await fixture(t, { route: '/offers/new', failure: { method: 'GET', path: '/api/offers/eligibility', status: 503 } });
  await textVisible(page, 'Chức năng lưu/gửi Offer đang chờ hoàn thiện Backend hoặc cơ sở dữ liệu');
  assert.equal(await page.$$eval('form button', nodes => nodes.every(node => node.disabled)), true);
  assert.equal(writes(state).length, 0);
});
test('eligible application uses only verified display fields and prefill', async t => {
  const { page } = await fixture(t, { route: '/offers/new', eligibilityResponse: {
    eligible: true, permissions: { can_create: true }, applications: [{ ...eligibilityItem, prefill: { job_title: 'Verified Developer', basic_salary: '999999' } }],
  } });
  await page.select('[name="application_id"]', '41');
  assert.equal(await page.$eval('[name="job_title"]', node => node.value), 'Verified Developer');
  assert.equal(await page.$eval('[name="basic_salary"]', node => node.value), '');
});
