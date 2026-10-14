// Run npm.cmd run build first. Browser tests use mocked HTTP APIs; they never write
// to the real Backend/MySQL. Puppeteer is already a project dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');

const dist = path.join(__dirname, 'dist');
const catalogue = [
  { id: 11, code: 'JAVA', name: 'Java', category_group: 'CANDIDATE_TAG', is_active: 1 },
  { id: 12, code: 'REACT', name: 'React', category_group: 'CANDIDATE_TAG', is_active: 1 },
  { id: 13, code: 'OLD', name: 'Nhãn cũ', category_group: 'CANDIDATE_TAG', is_active: 0 },
  { id: 14, code: 'NODE', name: 'Node.js', category_group: 'CANDIDATE_TAG', is_active: 1 },
  { id: 15, code: 'SQL', name: 'SQL', category_group: 'CANDIDATE_TAG', is_active: 1 },
  { id: 1, code: 'REFERRAL', name: 'Giới thiệu nội bộ', category_group: 'CANDIDATE_SOURCE', is_active: 1 },
  { id: 2, code: 'SKILL', name: 'Không phù hợp', category_group: 'REJECTION_REASON', is_active: 1 }
];
const fixtureNote = { id: 1, candidate_id: 1, author_id: 5, author_name: 'Người viết trước', note_content: 'Ghi chú đã lưu', created_at: '2026-10-13T08:00:00.000Z' };
let state;
function reset(role = 'RECRUITER') {
  state = {
    role, calls: [], failures: {}, delays: {},
    candidates: [{ id: 1, full_name: 'Ứng viên thử nghiệm', email: 'candidate@example.test', phone: '0901234567', status: 'NEW', source_code: 'REFERRAL' }],
    tags: [{ ...catalogue[0], tag_id: 11, candidate_id: 1 }], notes: [{ ...fixtureNote }]
  };
}

let page;
let origin;
let browser;
let server;
const pageErrors = [];
let passed = 0;
async function check(name, work) {
  await work();
  passed++;
  console.log(`PASS ${passed}: ${name}`);
}
const bodyText = () => page.$eval('body', element => element.innerText);
async function hasText(text) { await page.waitForFunction(value => document.body.innerText.includes(value), {}, text); }
async function open(url = '/candidates/1') {
  await page.goto(`${origin}${url}`, { waitUntil: 'domcontentloaded' });
}
async function ready() {
  await page.waitForFunction(() => document.querySelector('.cp-details') && document.querySelector('.cp-tags') && document.querySelector('.cp-notes'));
}
async function setNote(value) {
  await page.$eval('#cp-note-content', (element, text) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
const noteButton = '.cp-note-form button[type="submit"]';
const tagButton = '.cp-tag-form button[type="submit"]';
const postCalls = endpoint => state.calls.filter(call => call.method === 'POST' && call.pathname.endsWith(endpoint));

async function mockApi(request) {
  const url = new URL(request.url());
  const method = request.method();
  const key = `${method} ${url.pathname}`;
  const data = request.postData() ? JSON.parse(request.postData()) : undefined;
  const scenario = state;
  scenario.calls.push({ method, pathname: url.pathname, data });
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
  const respond = (value, status = 200) => request.respond({ status, contentType: 'application/json', headers, body: JSON.stringify(status < 400 ? { success: true, data: value } : { success: false, message: value }) });
  if (method === 'OPTIONS') return respond(null);
  if (scenario.delays[key]) await new Promise(resolve => setTimeout(resolve, scenario.delays[key]));
  if (scenario.failures[key]) return respond('Lỗi API thử nghiệm', scenario.failures[key]);
  if (url.pathname === '/api/auth/me') return respond({ user_id: 7, full_name: 'Nhân sự thử nghiệm', permissions: [], roles: [{ role_code: scenario.role }] });
  if (url.pathname === '/api/notifications') return respond({ notifications: [], unreadCount: 0 });
  if (url.pathname === '/api/master-data') return respond(catalogue.filter(item => !url.searchParams.get('group') || item.category_group === url.searchParams.get('group')));
  if (url.pathname === '/api/candidates') return respond(scenario.candidates);
  if (/\/candidates\/\d+\/status$/.test(url.pathname)) return respond({});
  const match = url.pathname.match(/^\/api\/candidates\/(\d+)\/(tags|notes)(?:\/(\d+))?$/);
  if (match) {
    const [, id, resource, tagId] = match;
    if (scenario.role === 'CANDIDATE') return respond('Forbidden', 403);
    if (!scenario.candidates.some(candidate => String(candidate.id) === id)) return respond('Not found', 404);
    if (resource === 'tags') {
      if (method === 'GET') return respond(scenario.tags);
      if (method === 'DELETE') { scenario.tags = scenario.tags.filter(tag => String(tag.tag_id) !== tagId); return respond({ removed: true }); }
      if (method === 'POST') {
        const option = catalogue.find(item => item.id === data.tag_id && item.category_group === 'CANDIDATE_TAG' && item.is_active === 1);
        if (!option) return respond('Invalid tag', 400);
        if (scenario.tags.some(tag => tag.tag_id === data.tag_id)) return respond('Ứng viên đã được gắn nhãn này.', 409);
        scenario.tags.push({ ...option, tag_id: option.id, candidate_id: Number(id) });
        return respond({ tag_id: option.id, candidate_id: Number(id) }, 201);
      }
    }
    if (resource === 'notes') {
      if (method === 'GET') return respond(scenario.notes);
      assert.deepEqual(Object.keys(data), ['note_content'], 'Only note_content may be sent');
      const note = { id: 2 + scenario.notes.length, candidate_id: Number(id), author_id: 7, author_name: 'Nhân sự thử nghiệm', note_content: data.note_content, created_at: '2026-10-13T10:00:00.000Z' };
      scenario.notes.unshift(note);
      return respond(note, 201);
    }
  }
  return respond('Unexpected API request', 404);
}

(async () => {
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Run npm.cmd run build before these tests');
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://test.local').pathname);
    const relative = pathname.replace(/^\/+/, '');
    let file = path.resolve(dist, relative);
    if (!file.startsWith(`${dist}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH, await puppeteer.executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].find(file => file && fs.existsSync(file));
  assert.ok(executablePath, 'Install Chrome/Edge or set PUPPETEER_EXECUTABLE_PATH');
  browser = await puppeteer.launch({ headless: true, executablePath });
  page = await browser.newPage();
  page.setDefaultTimeout(8000);
  await page.setViewport({ width: 1365, height: 1000 });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'test-token'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      mockApi(request).catch(error => { pageErrors.push(error.message); request.abort().catch(() => {}); });
    } else if (request.url().startsWith(origin)) request.continue();
    else request.abort(); // No external network or real Backend requests.
  });

  reset('HR_MANAGER');
  await check('Xem hồ sơ opens detail; existing reject/hire controls remain', async () => {
    await open('/candidates');
    await page.waitForSelector('a[href="/candidates/1"]');
    const text = await bodyText();
    assert.ok(text.includes('Tuyển dụng') && text.includes('Đánh trượt'));
    await page.click('a[href="/candidates/1"]');
    await ready();
    assert.ok(page.url().endsWith('/candidates/1'));
    for (const expected of ['Ứng viên thử nghiệm', 'candidate@example.test', '0901234567', 'Giới thiệu nội bộ']) assert.ok((await bodyText()).includes(expected));
  });
  await check('Assigned tags render as chips', async () => {
    assert.equal(await page.$eval('.cp-tag span', element => element.textContent), 'Java');
  });
  await check('Attaches configured tag immediately without document reload', async () => {
    await page.evaluate(() => { window.testDocumentMarker = 'same'; });
    await page.select('#cp-tag-select', '12');
    await page.click(tagButton);
    await hasText('Đã gắn nhãn.');
    assert.equal(await page.$$eval('.cp-tag', tags => tags.length), 2);
    assert.deepEqual(postCalls('/tags')[0].data, { tag_id: 12 });
    assert.equal(await page.evaluate(() => window.testDocumentMarker), 'same');
  });
  await check('Already assigned, inactive and wrong-group tags cannot be selected', async () => {
    const options = await page.$$eval('#cp-tag-select option', elements => elements.map(element => element.value));
    for (const id of ['11', '12', '13', '1']) assert.ok(!options.includes(id));
    assert.ok(await page.$eval(tagButton, button => button.disabled));
  });
  await check('Reload fetches persisted tags through API', async () => {
    const before = state.calls.filter(call => call.pathname.endsWith('/tags') && call.method === 'GET').length;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
    assert.equal(await page.$$eval('.cp-tag', tags => tags.length), 2);
    assert.ok(state.calls.filter(call => call.pathname.endsWith('/tags') && call.method === 'GET').length > before);
  });
  await check('Removes a tag and immediately updates selection options', async () => {
    await page.click('button[aria-label="Bỏ nhãn React"]');
    await hasText('Đã bỏ nhãn.');
    assert.equal(await page.$$eval('.cp-tag', tags => tags.length), 1);
    assert.ok(await page.$('#cp-tag-select option[value="12"]'));
  });
  await check('Textarea and Unicode character counter work', async () => {
    await setNote('Xin chào 😀');
    await page.waitForFunction(() => document.querySelector('#cp-note-count').textContent.startsWith('10/'));
    assert.equal(await page.$eval('#cp-note-content', element => element.value), 'Xin chào 😀');
  });
  await check('Whitespace-only note is blocked', async () => {
    await setNote(' \n\t ');
    assert.ok(await page.$eval(noteButton, button => button.disabled));
    assert.equal(postCalls('/notes').length, 0);
  });
  await check('More than 5000 characters is blocked with an error', async () => {
    await setNote('a'.repeat(5001));
    await hasText('Ghi chú không được vượt quá 5000 ký tự.');
    assert.ok(await page.$eval(noteButton, button => button.disabled));
    assert.equal(postCalls('/notes').length, 0);
  });
  await check('Saving disables submit and sends trimmed content only', async () => {
    state.delays['POST /api/candidates/1/notes'] = 600;
    await setNote('  Ghi chú mới\nNội dung tiếp theo  ');
    await page.click(noteButton);
    await hasText('Đang lưu...');
    assert.ok(await page.$eval(noteButton, button => button.disabled));
    await hasText('Đã thêm ghi chú.');
    assert.deepEqual(postCalls('/notes')[0].data, { note_content: 'Ghi chú mới\nNội dung tiếp theo' });
  });
  await check('New note is first; textarea clears; author and timestamp render', async () => {
    assert.equal(await page.$eval('#cp-note-content', element => element.value), '');
    assert.equal(await page.$eval('.cp-note-text', element => element.textContent), 'Ghi chú mới\nNội dung tiếp theo');
    assert.equal(await page.$eval('.cp-note-meta strong', element => element.textContent), 'Nhân sự thử nghiệm');
    assert.equal(await page.$eval('.cp-note-meta time', element => element.dateTime), '2026-10-13T10:00:00.000Z');
    assert.ok((await page.$eval('.cp-note-meta time', element => element.textContent)).length > 5);
    assert.equal(await page.$$('.cp-note button').then(elements => elements.length), 0);
  });
  await check('Reload retains notes; inactive assigned tags stay visible', async () => {
    state.tags.push({ ...catalogue[2], tag_id: 13, candidate_id: 1 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
    await hasText('Nhãn cũ');
    await hasText('Ngừng sử dụng');
    await hasText('Ghi chú mới');
  });
  await check('Hiring Manager can read when allowed, with no management controls', async () => {
    reset('HIRING_MANAGER');
    await open(); await ready();
    assert.equal(await page.$('#cp-tag-select'), null);
    assert.equal(await page.$('.cp-tag-remove'), null);
    assert.equal(await page.$('#cp-note-content'), null);
    assert.ok((await bodyText()).includes('Ghi chú đã lưu'));
  });
  await check('403 denies Hiring Manager data and shows a clear message', async () => {
    reset('HIRING_MANAGER');
    state.failures['GET /api/candidates/1/tags'] = 403;
    state.failures['GET /api/candidates/1/notes'] = 403;
    await open(); await hasText('Bạn không có quyền truy cập dữ liệu này');
    assert.equal(await page.$('.cp-tag'), null);
    assert.equal(await page.$('.cp-note'), null);
    assert.equal(await page.$('#cp-note-content'), null);
  });
  await check('Candidate cannot enter detail or trigger internal API requests', async () => {
    reset('CANDIDATE');
    await open(); await hasText('Bạn không có quyền truy cập hồ sơ nội bộ.');
    assert.equal(state.calls.filter(call => call.pathname.startsWith('/api/candidates')).length, 0);
    assert.equal(await page.$('.cp-panels'), null);
  });
  await check('404 displays Không tìm thấy ứng viên', async () => {
    reset(); state.failures['GET /api/candidates'] = 404;
    await open(); await hasText('Không tìm thấy ứng viên');
    assert.equal(await page.$('.cp-panels'), null);
  });
  await check('Initial profile, tag and note loading states are visible', async () => {
    reset();
    for (const endpoint of ['/api/candidates', '/api/candidates/1/tags', '/api/candidates/1/notes']) state.delays[`GET ${endpoint}`] = 1200;
    await open();
    await hasText('Đang tải hồ sơ...'); await hasText('Đang tải nhãn...'); await hasText('Đang tải ghi chú...');
    await ready();
  });
  await check('API error displays safely and retry recovers', async () => {
    reset(); state.failures['GET /api/candidates/1/notes'] = 500;
    await open(); await hasText('Lỗi API thử nghiệm');
    delete state.failures['GET /api/candidates/1/notes'];
    await page.$eval('[aria-labelledby="cp-notes-title"] .cp-error button', button => button.click());
    await page.waitForSelector('.cp-note');
    await hasText('Ghi chú đã lưu');
  });
  await check('Failed note submission retains draft for retry', async () => {
    state.failures['POST /api/candidates/1/notes'] = 500;
    await setNote('Bản nháp cần giữ lại');
    await page.click(noteButton); await hasText('Lỗi API thử nghiệm');
    assert.equal(await page.$eval('#cp-note-content', element => element.value), 'Bản nháp cần giữ lại');
    assert.equal(state.notes.length, 1);
  });
  await check('Concurrent duplicate tag response is reconciled from API', async () => {
    reset(); await open(); await ready();
    state.tags.push({ ...catalogue[1], tag_id: 12, candidate_id: 1 });
    await page.select('#cp-tag-select', '12'); await page.click(tagButton);
    await hasText('Ứng viên đã được gắn nhãn này.');
    await page.waitForFunction(() => document.querySelectorAll('.cp-tag').length === 2);
    assert.equal(await page.$('#cp-tag-select option[value="12"]'), null);
  });
  await check('Narrow viewport keeps profile content within its container', async () => {
    await page.setViewport({ width: 600, height: 900 });
    assert.ok(await page.$eval('.candidate-profile', element => element.scrollWidth <= element.clientWidth + 1));
  });
  await check('No JavaScript page crashes throughout the scenarios', async () => assert.deepEqual(pageErrors, []));
  console.log(`Frontend SCRUM-337: ${passed} PASS, 0 FAIL`);
})().catch(error => {
  console.error(`FAIL after ${passed} passing checks:`, error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});
