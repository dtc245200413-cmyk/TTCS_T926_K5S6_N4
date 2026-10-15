// Run npm.cmd run build first. HTTP interception prevents all real API/database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer');

const dist = path.join(__dirname, 'dist');
const apiRoot = '/api/interview-schedules';
const options = {
  candidates: [{ id: 1, full_name: 'Ứng viên A' }, { id: 2, full_name: 'Ứng viên B' }],
  job_positions: [{ position_id: 2, position_name: 'Developer' }, { position_id: 9, position_name: 'Tester' }],
  interviewers: [{ user_id: 3, full_name: 'Người phỏng vấn A', employee_code: 'EMP003' }, { user_id: 7, full_name: 'Nhân sự hiện tại', employee_code: 'EMP007' }],
  rooms: [{ id: 4, name: 'Phòng A' }, { id: 8, name: 'Phòng B' }],
};
function enrich(row) {
  return { ...row, candidate_name: options.candidates.find(item => item.id === row.candidate_id)?.full_name,
    position_name: options.job_positions.find(item => item.position_id === row.position_id)?.position_name,
    interviewer_name: options.interviewers.find(item => item.user_id === row.interviewer_id)?.full_name,
    room_name: options.rooms.find(item => item.id === row.room_id)?.name, room_is_active: 1 };
}
let state;
function reset(role = 'RECRUITER') {
  state = { role, calls: [], failures: {}, delays: {}, options,
    rows: [
      { id: 10, candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4, start_at: '2026-10-13T03:00:00Z', end_at: '2026-10-13T04:00:00Z', status: 'SCHEDULED' },
      { id: 20, candidate_id: 2, position_id: 9, interviewer_id: 7, room_id: 8, start_at: '2026-10-13T04:00:00Z', end_at: '2026-10-13T05:00:00Z', status: 'SCHEDULED' },
      { id: 30, candidate_id: 2, position_id: 2, interviewer_id: 3, room_id: 4, start_at: '2026-10-12T03:00:00Z', end_at: '2026-10-12T04:00:00Z', status: 'CANCELLED' },
    ].map(enrich) };
}
let page;
let browser;
let server;
let origin;
let passed = 0;
const pageErrors = [];
const rowSelector = id => `tr[data-schedule-id="${id}"]`;
const submitSelector = '.is-modal button[type="submit"]';
const calls = method => state.calls.filter(call => call.method === method && call.pathname.startsWith(apiRoot));
async function hasText(text) { await page.waitForFunction(value => document.body.innerText.includes(value), {}, text); }
async function check(name, work) { await work(); passed++; console.log(`PASS ${passed}: ${name}`); }
async function open() { await page.goto(`${origin}/interview-schedules`, { waitUntil: 'domcontentloaded' }); }
async function ready() { await page.waitForSelector('.is-table-scroll'); }
async function input(selector, value) {
  await page.$eval(selector, (element, text) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function openCreate() { await page.click('.is-create'); await page.waitForSelector('#is-candidate_id'); }
async function clock(name, value) {
  const [hour, minute, second = '00'] = value.split(':');
  await page.select(`#is-${name}-0`, hour);
  await page.select(`#is-${name}-1`, minute);
  if (await page.$(`#is-${name}-2`)) await page.select(`#is-${name}-2`, second);
}
async function setTimes(start, end) {
  await input('#is-interview_date', start.split('T')[0]);
  await clock('start_time', start.split('T')[1]);
  if (end) {
    await page.select('#is-duration', 'custom');
    await input('#is-end_date', end.split('T')[0]);
    await clock('end_time', end.split('T')[1]);
  } else await page.select('#is-duration', '60');
}
async function fill(start = '2026-10-13T12:00', end = '2026-10-13T13:00') {
  await page.select('#is-candidate_id', '1'); await page.select('#is-position_id', '2');
  await page.select('#is-interviewer_id', '3'); await page.select('#is-room_id', '4');
  await setTimes(start, end);
}

async function mockApi(request) {
  const url = new URL(request.url());
  const method = request.method();
  const key = `${method} ${url.pathname}`;
  const scenario = state;
  const body = request.postData() ? JSON.parse(request.postData()) : undefined;
  if (method !== 'OPTIONS') scenario.calls.push({ method, pathname: url.pathname, query: Object.fromEntries(url.searchParams), body });
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
  const respond = (data, status = 200) => request.respond({ status, contentType: 'application/json', headers,
    body: JSON.stringify(status < 400 ? { success: true, data } : { success: false, message: data }) });
  if (method === 'OPTIONS') return respond(null);
  if (scenario.delays[key]) await new Promise(resolve => setTimeout(resolve, scenario.delays[key]));
  if (scenario.failures[key]) return respond(scenario.failures[key].message, scenario.failures[key].status);
  if (url.pathname === '/api/auth/me') return respond({ user_id: 7, full_name: scenario.fullName || 'Nhân sự hiện tại', job_title: scenario.jobTitle, permissions: [], roles: [{ role_code: scenario.role, role_name: scenario.roleName }] });
  if (url.pathname === '/api/notifications') return respond({ notifications: [], unreadCount: 0 });
  if (!url.pathname.startsWith(apiRoot)) return respond('Unexpected API call', 404);
  if (scenario.role === 'CANDIDATE') return respond('Forbidden', 403);
  if (url.pathname === `${apiRoot}/options`) return respond(scenario.options);
  if (url.pathname === apiRoot && method === 'GET') {
    let rows = scenario.rows;
    if (scenario.role === 'INTERVIEWER') rows = rows.filter(row => row.interviewer_id === 7);
    for (const field of ['candidate_id', 'interviewer_id', 'room_id', 'status']) {
      if (url.searchParams.get(field)) rows = rows.filter(row => String(row[field]) === url.searchParams.get(field));
    }
    return respond(rows);
  }
  const match = url.pathname.match(/\/interview-schedules\/(\d+)(\/cancel)?$/);
  const current = match && scenario.rows.find(row => row.id === Number(match[1]));
  if (match && !current) return respond('Không tìm thấy lịch phỏng vấn.', 404);
  if (match && method === 'GET') return respond(current);
  if (match?.[2] && method === 'PATCH') { current.status = 'CANCELLED'; return respond(current); }
  if (method === 'POST' || (method === 'PATCH' && current)) {
    const forbidden = ['created_by', 'updated_by', 'created_at', 'status'];
    for (const field of forbidden) assert.ok(!(field in body), `Unexpected payload field ${field}`);
    if (method === 'PATCH') assert.ok(!('candidate_id' in body));
    const updated = enrich({ ...(current || { id: 40 + scenario.rows.length, status: 'SCHEDULED' }), ...body });
    if (current) Object.assign(current, updated); else scenario.rows.push(updated);
    return respond(updated, current ? 200 : 201);
  }
  return respond('Unexpected API request', 404);
}

(async () => {
  assert.ok(fs.existsSync(path.join(dist, 'index.html')), 'Run npm.cmd run build first');
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://test.local').pathname);
    let file = path.resolve(dist, pathname.replace(/^\/+/, ''));
    if (!file.startsWith(`${dist}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(dist, 'index.html');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH, await puppeteer.executablePath(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find(file => file && fs.existsSync(file));
  assert.ok(executablePath, 'Chrome/Edge or PUPPETEER_EXECUTABLE_PATH is required');
  browser = await puppeteer.launch({ headless: true, executablePath });
  page = await browser.newPage();
  page.setDefaultTimeout(8000);
  // Deliberately outside Vietnam: all wall times must still be UTC+07:00.
  await page.emulateTimezone('America/New_York');
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'test-token'));
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) {
      mockApi(request).catch(error => { pageErrors.push(error.message); request.abort().catch(() => {}); });
    } else if (request.url().startsWith(origin)) request.continue();
    else request.abort();
  });

  reset();
  await check('Renders all schedule columns, statuses and preserves existing sidebar links', async () => {
    await open(); await ready();
    assert.equal(await page.$$eval('thead th', elements => elements.length), 8);
    for (const text of ['Ứng viên A', 'Developer', 'Người phỏng vấn A', 'Phòng A', 'Đã lên lịch', 'Đã hủy']) await hasText(text);
    assert.ok(await page.$('aside a[href="/interview-schedules"]'));
    assert.ok(await page.$('aside a[href="/candidates"]'));
  });
  await check('Empty state', async () => {
    reset(); state.rows = []; await open(); await hasText('Chưa có lịch phỏng vấn phù hợp.');
  });
  await check('Opens create modal and loads configured options', async () => {
    reset(); await open(); await ready(); await openCreate();
    assert.equal(await page.$eval('#is-form-title', element => element.textContent), 'Tạo lịch phỏng vấn');
    assert.ok(await page.$('#is-room_id option[value="4"]'));
    assert.ok(await page.$('#is-interviewer_id option[value="3"]'));
    assert.ok(calls('GET').some(call => call.pathname.endsWith('/options')));
  });
  await check('Missing required selection or time is blocked before POST', async () => {
    await page.click(submitSelector); await hasText('Vui lòng chọn ứng viên.');
    await page.select('#is-candidate_id', '1'); await page.click(submitSelector); await hasText('Vui lòng chọn vị trí tuyển dụng.');
    await page.select('#is-position_id', '2'); await page.click(submitSelector); await hasText('Vui lòng chọn người phỏng vấn.');
    await page.select('#is-interviewer_id', '3'); await page.click(submitSelector); await hasText('Vui lòng chọn phòng phỏng vấn.');
    await page.select('#is-room_id', '4'); await page.click(submitSelector); await hasText('Vui lòng nhập thời gian bắt đầu và kết thúc.');
    assert.equal(calls('POST').length, 0);
  });
  await check('end <= start is rejected by the Frontend', async () => {
    await fill('2026-10-13T12:00', '2026-10-13T12:00');
    await page.click(submitSelector); await hasText('Thời gian kết thúc phải sau thời gian bắt đầu.');
    await clock('end_time', '11:00'); await page.click(submitSelector);
    assert.equal(calls('POST').length, 0);
  });
  await check('Create uses explicit UTC ISO, trusted payload fields and prevents duplicate submissions', async () => {
    state.delays[`POST ${apiRoot}`] = 650;
    await fill('2026-10-13T12:00', null);
    await page.evaluate(() => { window.interviewDocument = 'same'; });
    await page.click(submitSelector); await hasText('Đang lưu...');
    assert.ok(await page.$eval(submitSelector, element => element.disabled));
    await page.$eval('.is-modal form', form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await hasText('Đã tạo lịch phỏng vấn.'); await ready();
    assert.equal(calls('POST').length, 1);
    assert.deepEqual(calls('POST')[0].body, { candidate_id: 1, position_id: 2, interviewer_id: 3, room_id: 4,
      start_at: '2026-10-13T05:00:00.000Z', end_at: '2026-10-13T06:00:00.000Z' });
    assert.equal(await page.$('[role="dialog"]'), null);
    assert.equal(state.rows.length, 4);
    assert.equal(await page.evaluate(() => window.interviewDocument), 'same');
  });
  for (const message of ['Người phỏng vấn đã có lịch trong khoảng thời gian này.', 'Phòng phỏng vấn đã được sử dụng trong khoảng thời gian này.']) {
    await check(`409 preserves form and Backend message: ${message}`, async () => {
      reset(); state.failures[`POST ${apiRoot}`] = { status: 409, message };
      await open(); await ready(); await openCreate(); await fill(); await page.click(submitSelector);
      await hasText(message);
      assert.ok(await page.$('[role="dialog"]'));
      assert.equal(await page.$eval('#is-candidate_id', element => element.value), '1');
      assert.equal(await page.$eval('#is-room_id', element => element.value), '4');
      assert.equal(await page.$eval('#is-interview_date', element => element.value), '2026-10-13');
      assert.equal(await page.$eval('#is-start_time-0', element => element.value), '12');
      assert.equal(state.rows.length, 3);
    });
  }
  await check('Edit fetches detail, displays local times and makes candidate immutable', async () => {
    reset(); await open(); await ready();
    await page.click(`${rowSelector(10)} .is-edit`); await page.waitForSelector('#is-candidate_id');
    assert.ok(calls('GET').some(call => call.pathname === `${apiRoot}/10`));
    assert.ok(await page.$eval('#is-candidate_id', element => element.disabled));
    assert.equal(await page.$eval('#is-interview_date', element => element.value), '2026-10-13');
    assert.equal(await page.$eval('#is-start_time-0', element => element.value), '10');
    assert.equal(await page.$eval('#is-duration', element => element.value), '60');
  });
  await check('Edit/reschedule PATCH succeeds with only editable fields', async () => {
    await page.select('#is-room_id', '8'); await page.select('#is-position_id', '9');
    await setTimes('2026-10-13T14:00', null);
    await page.click(submitSelector); await hasText('Đã cập nhật lịch phỏng vấn.'); await ready();
    assert.deepEqual(calls('PATCH')[0].body, { position_id: 9, interviewer_id: 3, room_id: 8, start_at: '2026-10-13T07:00:00.000Z', end_at: '2026-10-13T08:00:00.000Z' });
    assert.ok((await page.$eval(rowSelector(10), element => element.textContent)).includes('Phòng B'));
  });
  await check('Edit conflict keeps modal and edited slot', async () => {
    reset(); state.failures[`PATCH ${apiRoot}/10`] = { status: 409, message: 'Phòng phỏng vấn đã được sử dụng trong khoảng thời gian này.' };
    await open(); await ready(); await page.click(`${rowSelector(10)} .is-edit`); await page.waitForSelector('#is-room_id');
    await page.select('#is-room_id', '8'); await page.click(submitSelector); await hasText(state.failures[`PATCH ${apiRoot}/10`].message);
    assert.equal(await page.$eval('#is-room_id', element => element.value), '8');
    assert.ok(await page.$('[role="dialog"]'));
    assert.equal(state.rows[0].room_id, 4);
  });
  await check('Cancellation can be declined without any mutation', async () => {
    reset(); await open(); await ready();
    page.once('dialog', dialog => dialog.dismiss());
    await page.click(`${rowSelector(10)} .is-cancel`);
    assert.equal(calls('PATCH').length, 0);
  });
  await check('Confirmed cancellation uses PATCH and updates row without document reload', async () => {
    await page.evaluate(() => { window.interviewDocument = 'same'; });
    page.once('dialog', dialog => dialog.accept());
    await page.click(`${rowSelector(10)} .is-cancel`); await hasText('Đã hủy lịch phỏng vấn.');
    assert.equal(calls('PATCH')[0].pathname, `${apiRoot}/10/cancel`);
    assert.equal(calls('DELETE').length, 0);
    assert.equal(await page.$eval(`${rowSelector(10)} .is-badge`, element => element.textContent), 'Đã hủy');
    assert.equal(await page.evaluate(() => window.interviewDocument), 'same');
  });
  await check('Cancelled rows never have edit or cancel buttons', async () => {
    for (const id of [10, 30]) {
      assert.equal(await page.$(`${rowSelector(id)} .is-edit`), null);
      assert.equal(await page.$(`${rowSelector(id)} .is-cancel`), null);
    }
  });
  for (const role of ['HIRING_MANAGER', 'INTERVIEWER']) {
    await check(`${role} only sees Backend results with no management controls or global options request`, async () => {
      reset(role); await open(); await ready();
      for (const selector of ['.is-create', '.is-edit', '.is-cancel']) assert.equal(await page.$(selector), null);
      assert.ok(await page.$('aside a[href="/interview-schedules"]'));
      assert.ok(!calls('GET').some(call => call.pathname.endsWith('/options')));
      if (role === 'INTERVIEWER') assert.deepEqual(await page.$$eval('tbody tr', elements => elements.map(element => element.dataset.scheduleId)), ['20']);
    });
  }
  await check('Candidate cannot access route/menu or trigger interview requests', async () => {
    reset('CANDIDATE'); await open(); await hasText('Bạn không có quyền truy cập lịch phỏng vấn nội bộ.');
    assert.equal(await page.$('aside a[href="/interview-schedules"]'), null);
    assert.equal(state.calls.filter(call => call.pathname.startsWith(apiRoot)).length, 0);
  });
  await check('List loading state and create button disabled while loading', async () => {
    reset(); state.delays[`GET ${apiRoot}`] = 1000;
    await open(); await hasText('Đang tải lịch phỏng vấn...');
    assert.ok(await page.$eval('.is-create', element => element.disabled)); await ready();
  });
  await check('Options loading state', async () => {
    state.delays[`GET ${apiRoot}/options`] = 700;
    await page.click('.is-create'); await hasText('Đang tải dữ liệu đặt lịch...');
    assert.equal(await page.$(submitSelector), null);
    await page.waitForSelector('#is-room_id');
  });
  await check('List API errors show retry and recover', async () => {
    reset(); state.failures[`GET ${apiRoot}`] = { status: 500, message: 'Không tải được lịch thử nghiệm.' };
    await open(); await hasText('Không tải được lịch thử nghiệm.');
    assert.equal(await page.$('tbody'), null);
    delete state.failures[`GET ${apiRoot}`];
    await page.$eval('.interview-schedules > .is-error button', element => element.click()); await ready();
  });
  await check('Scope 403 shows Backend message without widening access', async () => {
    reset('HIRING_MANAGER'); state.failures[`GET ${apiRoot}`] = { status: 403, message: 'Không xác định an toàn được phạm vi phòng ban của lịch phỏng vấn.' };
    await open(); await hasText(state.failures[`GET ${apiRoot}`].message);
    assert.equal(await page.$('tbody'), null); assert.equal(await page.$('.is-create'), null);
  });
  await check('Options errors prevent save and can be retried', async () => {
    reset(); state.failures[`GET ${apiRoot}/options`] = { status: 500, message: 'Không tải được danh mục.' };
    await open(); await ready(); await page.click('.is-create'); await hasText('Không tải được danh mục.');
    assert.equal(await page.$(submitSelector), null);
    delete state.failures[`GET ${apiRoot}/options`];
    await page.$eval('.is-modal .is-error button', element => element.click()); await page.waitForSelector('#is-room_id');
  });
  await check('Filters are sent to Backend and visibly filter results', async () => {
    reset(); await open(); await ready();
    await page.select('#is-filter-status', 'SCHEDULED'); await ready();
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 2);
    await page.select('#is-filter-candidate_id', '2');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    await page.select('#is-filter-interviewer_id', '7'); await ready();
    await page.select('#is-filter-room_id', '8'); await ready();
    assert.deepEqual(calls('GET').filter(call => call.pathname === apiRoot).at(-1).query, { status: 'SCHEDULED', candidate_id: '2', interviewer_id: '7', room_id: '8' });
  });
  await check('Historical inactive room remains visible', async () => {
    reset(); state.rows[2].room_is_active = 0;
    await open(); await ready(); await hasText('ngừng sử dụng');
  });
  await check('Modal keyboard close and responsive content fit', async () => {
    await page.setViewport({ width: 600, height: 900 });
    assert.ok(await page.$eval('.interview-schedules', element => element.scrollWidth <= element.clientWidth + 1));
    await openCreate();
    assert.ok(await page.$eval('.is-modal', element => element.scrollWidth <= element.clientWidth + 1));
    await page.keyboard.press('Escape'); await page.waitForSelector('[role="dialog"]', { hidden: true });
  });
  for (const role of ['ADMIN', 'HR_MANAGER']) {
    await check(`${role} can access management controls`, async () => {
      reset(role); await open(); await ready();
      assert.ok(await page.$('.is-create')); assert.ok(await page.$('.is-edit')); assert.ok(await page.$('.is-cancel'));
    });
  }
  await check('24-hour controls and each preset update end preview across midnight', async () => {
    reset(); await open(); await ready(); await openCreate();
    assert.equal(await page.$('input[type="datetime-local"]'), null);
    assert.equal(await page.$('input[type="time"]'), null);
    assert.deepEqual(await page.$$eval('#is-start_time-0 option', elements => elements.slice(1).map(el => el.value)), Array.from({ length: 24 }, (_, n) => String(n).padStart(2, '0')));
    await fill('2026-12-31T23:45', null);
    for (const [duration, expected] of [['30', '00:15:00'], ['45', '00:30:00'], ['60', '00:45:00'], ['90', '01:15:00'], ['120', '01:45:00']]) {
      await page.select('#is-duration', duration);
      assert.equal(await page.$eval('.is-end-preview strong', el => el.textContent), `${expected} 01/01/2027`);
    }
    await page.click(submitSelector); await hasText('Đã tạo lịch phỏng vấn.'); await ready();
    assert.equal(calls('POST')[0].body.start_at, '2026-12-31T16:45:00.000Z');
    assert.equal(calls('POST')[0].body.end_at, '2026-12-31T18:45:00.000Z');
  });
  await check('Custom edit preserves seconds and odd duration on save and reload', async () => {
    reset();
    state.rows[0].start_at = '2026-10-13T03:07:15Z'; state.rows[0].end_at = '2026-10-13T04:24:49Z';
    await open(); await ready();
    assert.ok((await page.$eval(rowSelector(10), el => el.textContent)).includes('10:07:15 13/10/2026'));
    await page.click(`${rowSelector(10)} .is-edit`); await page.waitForSelector('#is-duration');
    assert.equal(await page.$eval('#is-duration', el => el.value), 'custom');
    assert.equal(await page.$eval('#is-start_time-2', el => el.value), '15');
    assert.equal(await page.$eval('#is-end_time-2', el => el.value), '49');
    await page.click(submitSelector); await hasText('Đã cập nhật lịch phỏng vấn.'); await ready();
    assert.equal(calls('PATCH')[0].body.start_at, '2026-10-13T03:07:15.000Z');
    assert.equal(calls('PATCH')[0].body.end_at, '2026-10-13T04:24:49.000Z');
    await open(); await ready(); await page.click(`${rowSelector(10)} .is-edit`); await page.waitForSelector('#is-end_time-2');
    assert.equal(await page.$eval('.is-end-preview strong', el => el.textContent), '11:24:49 13/10/2026');
    await clock('end_time', '11:25:03'); await page.click(submitSelector); await hasText('Đã cập nhật lịch phỏng vấn.');
    assert.equal(calls('PATCH').at(-1).body.end_at, '2026-10-13T04:25:03.000Z');
  });
  await check('Switching preset/custom preserves computed end and explicit seconds', async () => {
    reset(); await open(); await ready(); await openCreate(); await fill('2026-10-13T23:45', null);
    await page.select('#is-duration', '30'); await page.select('#is-duration', 'custom');
    assert.equal(await page.$eval('#is-end_date', el => el.value), '2026-10-14');
    assert.equal(await page.$eval('#is-end_time-0', el => el.value), '00');
    assert.equal(await page.$eval('#is-end_time-1', el => el.value), '15');
    await clock('start_time', '23:45:17'); await page.select('#is-duration', '45');
    assert.equal(await page.$eval('#is-start_time-2', el => el.value), '17');
    assert.equal(await page.$eval('.is-end-preview strong', el => el.textContent), '00:30:17 14/10/2026');
  });
  await check('Vietnam times and API instants stay identical after changing browser timezone', async () => {
    for (const zone of ['UTC', 'Asia/Ho_Chi_Minh']) {
      await page.emulateTimezone(zone); reset(); await open(); await ready();
      assert.ok((await page.$eval(rowSelector(10), el => el.textContent)).includes('10:00:00 13/10/2026'));
      await page.click(`${rowSelector(10)} .is-edit`); await page.waitForSelector('#is-duration');
      assert.equal(await page.$eval('#is-start_time-0', el => el.value), '10');
      await page.click(submitSelector); await hasText('Đã cập nhật lịch phỏng vấn.');
      assert.equal(calls('PATCH')[0].body.start_at, '2026-10-13T03:00:00.000Z');
      assert.equal(calls('PATCH')[0].body.end_at, '2026-10-13T04:00:00.000Z');
    }
  });
  await check('Custom time controls remain within the modal on mobile', async () => {
    await page.setViewport({ width: 390, height: 844 });
    reset(); await open(); await ready(); await openCreate(); await fill();
    assert.ok(await page.$eval('.is-modal', el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(await page.$eval('.is-time-section', el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(await page.$eval('.is-clock-fields', el => el.scrollWidth <= el.clientWidth + 1));
  });
  await check('Vietnamese API names and account title render unchanged in list, filter, header and form', async () => {
    await page.setViewport({ width: 1440, height: 1000 });
    reset(); state.fullName = 'Nguyễn Anh Sơn'; state.jobTitle = 'Nhân viên Tuyển dụng'; state.roleName = 'Nhân viên tuyển dụng';
    const interviewer = 'Lưu Quang Lực';
    state.rows.forEach(row => { if (row.interviewer_id === 3) row.interviewer_name = interviewer; });
    state.options = { ...options, interviewers: options.interviewers.map(item => item.user_id === 3 ? { ...item, full_name: interviewer } : item) };
    await open(); await ready();
    assert.equal(await page.$eval(`${rowSelector(10)} td:nth-child(3)`, el => el.textContent), interviewer);
    assert.equal(await page.$eval('#is-filter-interviewer_id option[value="3"]', el => el.textContent), interviewer);
    assert.equal(await page.$eval('.user-name', el => el.textContent), state.fullName);
    assert.equal(await page.$eval('.user-role', el => el.textContent), state.jobTitle);
    await openCreate();
    assert.equal(await page.$eval('#is-interviewer_id option[value="3"]', el => el.textContent), `${interviewer} (EMP003)`);
    await page.keyboard.press('Escape'); await page.waitForSelector('[role="dialog"]', { hidden: true });
  });
  await check('Table gives names room, wraps at word boundaries and aligns actions/status', async () => {
    reset();
    state.rows[0].candidate_name = 'Nguyễn Thị Hoàng Minh Anh';
    state.rows[0].position_name = 'Chuyên viên Phát triển Phần mềm';
    state.rows[0].interviewer_name = 'Lưu Quang Lực';
    await open(); await ready();
    const layout = await page.$eval(rowSelector(10), row => {
      const cells = [...row.cells];
      const buttons = [...row.querySelectorAll('.is-row-actions button')].map(el => ({ y: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height, whiteSpace: getComputedStyle(el).whiteSpace }));
      return { widths: cells.slice(0, 3).map(el => el.getBoundingClientRect().width),
        text: cells.slice(0, 3).map(el => { const s = getComputedStyle(el.querySelector('.is-cell-text')); return [s.wordBreak, s.overflowWrap, s.whiteSpace]; }),
        vertical: cells.map(el => getComputedStyle(el).verticalAlign), buttons,
        status: getComputedStyle(cells[6]).textAlign,
        clock: row.querySelector('time .is-time-clock').textContent,
        date: row.querySelector('time .is-time-date').textContent,
        clockY: row.querySelector('time .is-time-clock').getBoundingClientRect().top,
        dateY: row.querySelector('time .is-time-date').getBoundingClientRect().top,
        dateTime: row.querySelector('time').dateTime };
    });
    assert.ok(layout.widths[0] >= 195 && layout.widths[1] >= 215 && layout.widths[2] >= 215);
    assert.ok(layout.text.every(styles => styles.join(',') === 'normal,normal,normal'));
    assert.ok(layout.vertical.every(value => value === 'middle'));
    assert.equal(layout.status, 'center');
    assert.equal(layout.buttons[0].y, layout.buttons[1].y);
    assert.equal(layout.buttons[0].height, layout.buttons[1].height);
    assert.ok(layout.buttons.every(button => button.whiteSpace === 'nowrap'));
    assert.equal(layout.clock, '10:00:00'); assert.equal(layout.date, '13/10/2026');
    assert.ok(layout.dateY > layout.clockY); assert.equal(layout.dateTime, state.rows[0].start_at);
    if (process.env.INTERVIEW_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.INTERVIEW_SCREENSHOT_DIR, 'interview-table-desktop.png') });
  });
  await check('Horizontal scrolling stays inside table at desktop, tablet and mobile widths', async () => {
    for (const width of [1440, 768, 390]) {
      await page.setViewport({ width, height: 1000 });
      assert.ok(await page.$eval('.interview-schedules', el => el.scrollWidth <= el.clientWidth + 1), `page overflow at ${width}px`);
      const scroll = await page.$eval('.is-table-scroll', el => {
        el.scrollLeft = el.scrollWidth;
        return { overflow: getComputedStyle(el).overflowX, scrollable: el.scrollWidth > el.clientWidth, moved: el.scrollLeft > 0, width: el.getBoundingClientRect().width };
      });
      assert.equal(scroll.overflow, 'auto'); assert.ok(scroll.scrollable); assert.ok(scroll.moved);
      assert.ok(scroll.width < width);
      assert.ok(await page.$eval(`${rowSelector(10)} .is-row-actions`, el => el.scrollWidth <= el.clientWidth + 1));
      if (width === 390 && process.env.INTERVIEW_SCREENSHOT_DIR) {
        await page.$eval('.is-table-scroll', el => el.scrollIntoView({ block: 'center' }));
        await page.screenshot({ path: path.join(process.env.INTERVIEW_SCREENSHOT_DIR, 'interview-table-mobile.png') });
      }
    }
  });
  await check('No browser JavaScript crashes', async () => assert.deepEqual(pageErrors, []));
  console.log(`Frontend interview schedules: ${passed} PASS, 0 FAIL`);
})().catch(error => {
  console.error(`FAIL after ${passed} passing checks:`, error);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
});
