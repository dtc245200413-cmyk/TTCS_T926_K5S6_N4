// Browser tests against the production bundle. All API requests are intercepted;
// no backend, database, real login or migration is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const puppeteer = require('puppeteer');

const dialog = '[role="dialog"]';
const saveButton = `${dialog} button[type="submit"]`;
const commentInput = '#candidate-rating-comment';
const delayGate = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
};

test('SCRUM-214 candidate ratings browser tests', { timeout: 180000 }, async t => {
  const { preview } = await import('vite');
  const server = await preview({ root: __dirname, configFile: false, preview: { host: '127.0.0.1', port: 0, open: false } });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  let browser;
  const defaultBrowser = await puppeteer.executablePath();
  const executablePath = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    defaultBrowser,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(file => file && fs.existsSync(file));

  async function fixture(role = 'RECRUITER', options = {}) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    page.setDefaultTimeout(10000);
    const state = {
      ratings: options.ratings ?? [], gets: 0, puts: [], statuses: [], errors: [], documents: 0,
      getError: null, putError: null, getGate: null, putGate: null,
    };
    const candidates = [{ id: 1, full_name: 'Ứng viên thử nghiệm', email: 'candidate@example.test', status: options.status ?? 'NEW', source_code: 'WEB', position_name: 'Developer', department_name: 'Kỹ thuật' }];
    const data = () => ({
      average_rating: state.ratings.length ? state.ratings.reduce((sum, row) => sum + row.rating, 0) / state.ratings.length : null,
      rating_count: state.ratings.length,
      my_rating: state.ratings.find(row => row.reviewer_id === 10) ?? null,
      ratings: state.ratings,
    });
    await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'scrum214-test-token'));
    page.on('pageerror', error => state.errors.push(error.message));
    page.on('dialog', prompt => prompt.accept());
    await page.setRequestInterception(true);
    page.on('request', request => {
      (async () => {
        const url = new URL(request.url());
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) state.documents++;
        if (!url.pathname.startsWith('/api/')) {
          if (url.origin === origin || url.protocol === 'data:') return request.continue();
          return request.abort();
        }
        const headers = {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        };
        const respond = (payload, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(payload) });
        if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers });
        assert.equal(request.headers().authorization, 'Bearer scrum214-test-token');
        if (url.pathname === '/api/auth/me') return respond({ success: true, data: { user_id: 10, full_name: 'Người thử nghiệm', roles: [{ role_code: role }], permissions: [] } });
        if (url.pathname === '/api/notifications') return respond({ success: true, data: { notifications: [], unreadCount: 0 } });
        if (url.pathname === '/api/master-data') return respond({ success: true, data: [
          { category_group: 'CANDIDATE_SOURCE', code: 'WEB', name: 'Website' },
          { category_group: 'REJECTION_REASON', code: 'SKILLS', name: 'Chưa phù hợp kỹ năng' },
        ] });
        if (url.pathname === '/api/candidates') return respond({ success: true, data: candidates });
        if (url.pathname === '/api/candidates/1/status') {
          const payload = JSON.parse(request.postData());
          state.statuses.push(payload);
          Object.assign(candidates[0], payload);
          return respond({ success: true, data: candidates[0] });
        }
        if (url.pathname === '/api/candidates/1/ratings' && request.method() === 'GET') {
          state.gets++;
          if (state.getGate) await state.getGate.promise;
          if (state.getError) return respond({ success: false, message: state.getError }, 503);
          return respond({ success: true, data: data() });
        }
        if (url.pathname === '/api/candidates/1/ratings/me' && request.method() === 'PUT') {
          const payload = JSON.parse(request.postData());
          state.puts.push(payload);
          if (state.putGate) await state.putGate.promise;
          if (state.putError) return respond({ success: false, message: state.putError }, 500);
          const row = { reviewer_id: 10, reviewer_name: 'Người thử nghiệm', ...payload, created_at: '2026-10-12T09:00:00Z', updated_at: '2026-10-12T10:00:00Z' };
          state.ratings = [...state.ratings.filter(item => item.reviewer_id !== 10), row];
          return respond({ success: true, data: data() });
        }
        state.errors.push(`Unexpected API request: ${request.method()} ${url.pathname}`);
        return respond({ success: false }, 404);
      })().catch(error => { state.errors.push(error.message); request.abort().catch(() => {}); });
    });
    await page.goto(`${origin}/candidates`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('tbody tr');
    const clickText = async (text, scope = 'button') => {
      const elements = await page.$$(scope);
      for (const element of elements) {
        if ((await element.evaluate(el => el.textContent.trim())) === text) return element.click();
      }
      throw new Error(`Button not found: ${text}`);
    };
    const open = async (wait = true) => {
      await clickText('Đánh giá');
      await page.waitForSelector(dialog);
      if (wait) await page.waitForFunction(selector => !document.querySelector(selector).disabled, {}, saveButton);
    };
    const setComment = async value => {
      await page.$eval(commentInput, (element, text) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(element, text);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
    };
    const select = value => page.click(`${dialog} .candidate-rating-stars label:nth-child(${value})`);
    const close = async () => {
      state.getGate?.release();
      state.putGate?.release();
      await page.close();
      assert.deepEqual(state.errors, [], 'No browser errors or unexpected API calls');
    };
    return { page, state, open, select, setComment, clickText, close };
  }

  async function run(name, action, role, options) {
    await t.test(name, async () => {
      const context = await fixture(role, options);
      try { await action(context); } finally { await context.close(); }
    });
  }

  try {
    assert(executablePath, 'Install a Puppeteer browser or set PUPPETEER_EXECUTABLE_PATH');
    browser = await puppeteer.launch({ headless: true, executablePath });

    await run('01 - five stars, initial zero, empty summary and hover', async ({ page, open }) => {
      assert.match(await page.$eval('.candidate-rating-cell', el => el.textContent), /Chưa có đánh giá/);
      await open();
      assert.equal(await page.$$eval(`${dialog} input[type=radio]`, elements => elements.length), 5);
      assert.match(await page.$eval('.candidate-rating-selection', el => el.textContent), /0\/5/);
      await page.hover(`${dialog} .candidate-rating-stars label:nth-child(4)`);
      assert.equal(await page.$$eval('.candidate-rating-stars .is-selected', elements => elements.length), 4);
    });
    for (const value of [1, 5]) await run(`02 - select rating ${value}`, async ({ page, open, select }) => {
      await open(); await select(value);
      assert.equal(await page.$eval(`${dialog} input:checked`, el => Number(el.value)), value);
      assert.match(await page.$eval('.candidate-rating-selection', el => el.textContent), new RegExp(`${value}/5`));
    });
    await run('03 - saving without stars is blocked', async ({ page, state, open }) => {
      await open(); await page.click(saveButton);
      await page.waitForSelector(`${dialog} [role=alert]`);
      assert.match(await page.$eval(`${dialog} [role=alert]`, el => el.textContent), /chọn từ 1 đến 5 sao/);
      assert.equal(state.puts.length, 0);
    });
    await run('04 - comment limit and character counter', async ({ page, state, open, select, setComment }) => {
      await open(); await select(5); await setComment('a'.repeat(2001));
      assert.match(await page.$eval('#candidate-rating-count', el => el.textContent), /2001\/2000/);
      assert.equal(await page.$eval(saveButton, el => el.disabled), true);
      assert.equal(state.puts.length, 0);
      await setComment('🙂'.repeat(2000));
      assert.match(await page.$eval('#candidate-rating-count', el => el.textContent), /2000\/2000/);
      assert.equal(await page.$eval(saveButton, el => el.disabled), false);
    });
    await run('05 - NEW can save, reopen, edit comment/rating and refresh summary without reload', async ({ page, state, open, select, setComment }) => {
      await open(); await select(5); await setComment('  Phù hợp  '); await page.click(saveButton);
      await page.waitForSelector(dialog, { hidden: true });
      assert.deepEqual(state.puts[0], { rating: 5, comment: 'Phù hợp' });
      assert.match(await page.$eval('.candidate-rating-cell', el => el.textContent), /4\.0 \(2 đánh giá\)/);
      const previousGets = state.gets;
      await open();
      assert(state.gets > previousGets);
      assert.equal(await page.$eval(`${dialog} input:checked`, el => el.value), '5');
      assert.equal(await page.$eval(commentInput, el => el.value), 'Phù hợp');
      await select(1); await setComment('Cần xem lại'); await page.click(saveButton);
      await page.waitForSelector(dialog, { hidden: true });
      assert.deepEqual(state.puts[1], { rating: 1, comment: 'Cần xem lại' });
      assert.match(await page.$eval('.candidate-rating-cell', el => el.textContent), /2\.0 \(2 đánh giá\)/);
      assert.equal(state.documents, 1);
    }, 'RECRUITER', { ratings: [{ reviewer_id: 20, reviewer_name: 'Reviewer khác', rating: 3, comment: 'Đã xem', updated_at: '2026-10-12T09:00:00Z' }] });
    await run('06 - HIRING_MANAGER sees scores without rate button', async ({ page, state }) => {
      assert.equal(await page.$$eval('.candidate-rating-cell button', elements => elements.length), 0);
      assert.match(await page.$eval('.candidate-rating-cell', el => el.textContent), /Chưa có đánh giá/);
      assert(state.gets > 0);
    }, 'HIRING_MANAGER');
    await run('07 - CANDIDATE cannot access rating UI or rating requests', async ({ page, state }) => {
      assert.equal(await page.$('.candidate-rating-cell'), null);
      assert.equal(await page.$(dialog), null);
      assert.equal(state.gets, 0);
    }, 'CANDIDATE');
    for (const role of ['HR_MANAGER', 'ADMIN']) await run(`08 - ${role} can rate`, async ({ open, page }) => {
      await open(); assert(await page.$(saveButton));
    }, role);
    await run('09 - GET error, retry and loading state', async ({ page, state, open, clickText }) => {
      state.getGate = delayGate(); state.getError = 'Không thể tải nhận xét lúc này.';
      await open(false);
      assert.match(await page.$eval(`${dialog} [role=status]`, el => el.textContent), /Đang tải/);
      assert.equal(await page.$eval(saveButton, el => el.disabled), true);
      state.getGate.release();
      await page.waitForSelector(`${dialog} [role=alert]`);
      assert.match(await page.$eval(`${dialog} [role=alert]`, el => el.textContent), /Không thể tải nhận xét lúc này/);
      assert.equal(await page.$eval(saveButton, el => el.disabled), true);
      state.getError = null; await clickText('Thử lại');
      await page.waitForFunction(selector => !document.querySelector(selector).disabled, {}, saveButton);
    });
    await run('10 - PUT error keeps draft and allows retry', async ({ page, state, open, select, setComment }) => {
      await open(); await select(5); await setComment('Giữ bản nháp');
      state.putError = 'Không thể lưu đánh giá lúc này.';
      await page.click(saveButton); await page.waitForSelector(`${dialog} [role=alert]`);
      assert.match(await page.$eval(`${dialog} [role=alert]`, el => el.textContent), /Không thể lưu đánh giá lúc này/);
      assert.equal(await page.$eval(commentInput, el => el.value), 'Giữ bản nháp');
      assert.equal(await page.$eval(saveButton, el => el.disabled), false);
      state.putError = null; await page.click(saveButton);
      await page.waitForSelector(dialog, { hidden: true });
    });
    await run('11 - saving disables controls and prevents duplicate submission', async ({ page, state, open, select }) => {
      await open(); await select(1); state.putGate = delayGate(); await page.click(saveButton);
      await page.waitForFunction(selector => document.querySelector(selector).textContent.includes('Đang lưu'), {}, saveButton);
      assert.equal(await page.$eval(saveButton, el => el.disabled), true);
      assert.equal(await page.$eval(`${dialog} fieldset`, el => el.disabled), true);
      assert.equal(await page.$eval(`${dialog} button[type=button]`, el => el.disabled), true);
      await page.keyboard.press('Escape'); assert(await page.$(dialog));
      await page.click(saveButton); state.putGate.release();
      await page.waitForSelector(dialog, { hidden: true });
      assert.equal(state.puts.length, 1);
    });
    await run('12 - reviewer history uses text, dates and public fields only', async ({ page, open }) => {
      await open();
      const history = await page.$eval('.candidate-rating-history', el => el.textContent);
      assert.match(history, /Reviewer khác/); assert.match(history, /5\/5/); assert.match(history, /Cập nhật:/);
      assert.match(history, /<img src=x onerror=alert\(1\)>/);
      assert.equal(await page.$('.candidate-rating-history img'), null);
      assert.doesNotMatch(history, /SECRET/);
    }, 'RECRUITER', { ratings: [{ reviewer_id: 20, reviewer_name: 'Reviewer khác', rating: 5, comment: '<img src=x onerror=alert(1)>', updated_at: '2026-10-12T09:00:00Z', password: 'SECRET' }] });
    await run('13 - responsive modal and keyboard close/focus restore', async ({ page, open }) => {
      await page.setViewport({ width: 375, height: 667 }); await open();
      const bounds = await page.$eval(dialog, el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }; });
      assert(bounds.left >= 0 && bounds.right <= 375 && bounds.height <= 667);
      assert(bounds.scrollWidth <= bounds.clientWidth);
      await page.keyboard.press('Escape'); await page.waitForSelector(dialog, { hidden: true });
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Đánh giá');
    });
    await run('14 - existing rejection flow still works', async ({ page, state, clickText }) => {
      await clickText('Đánh trượt');
      await page.select('select', 'SKILLS'); await clickText('Xác nhận Trượt');
      await page.waitForFunction(() => document.querySelector('tbody').textContent.includes('Lý do:'));
      assert.deepEqual(state.statuses, [{ status: 'REJECTED', rejection_reason_code: 'SKILLS' }]);
      assert.match(await page.$eval('tbody', el => el.textContent), /Website/);
      assert.equal(await page.$('.candidate-rating-cell button'), null);
      assert.match(await page.$eval('.candidate-rating-cell', el => el.textContent), /Hồ sơ đã đánh trượt/);
    });
    await run('15 - existing hiring flow still works', async ({ page, state, clickText }) => {
      await clickText('Tuyển dụng');
      await page.waitForFunction(() => document.querySelector('tbody').textContent.includes('Đã tuyển'));
      assert.deepEqual(state.statuses, [{ status: 'HIRED' }]);
    }, 'HR_MANAGER');
    for (const role of ['RECRUITER', 'HR_MANAGER', 'ADMIN']) await run(`16 - REJECTED keeps previous summary and hides rating button for ${role}`, async ({ page, state }) => {
      const summary = await page.$eval('.candidate-rating-cell', el => el.textContent);
      assert.match(summary, /4\.0 \(2 đánh giá\)/);
      assert.match(summary, /Hồ sơ đã đánh trượt/);
      assert.equal(await page.$('.candidate-rating-cell button'), null);
      assert(state.gets > 0);
      assert.equal(state.puts.length, 0);
    }, role, { status: 'REJECTED', ratings: [
      { reviewer_id: 10, reviewer_name: 'Reviewer 1', rating: 3, comment: 'Nhận xét cũ' },
      { reviewer_id: 20, reviewer_name: 'Reviewer 2', rating: 5, comment: 'Nhận xét khác' },
    ] });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
});
