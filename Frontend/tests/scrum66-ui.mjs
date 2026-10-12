// Browser checks against the production build. Every API call is mocked;
// no request is sent to the real backend or database.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const root = path.resolve('dist');
const server = http.createServer((req, res) => {
  const requested = path.resolve(root, `.${decodeURIComponent(req.url.split('?')[0])}`);
  const file = requested.startsWith(`${root}${path.sep}`) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
const permissions = ['DEPARTMENT_BUDGET_VIEW', 'DEPARTMENT_BUDGET_MANAGE', 'RECRUITMENT_REQUEST_VIEW_ALL', 'RECRUITMENT_REQUEST_APPROVE', 'RECRUITMENT_REQUEST_REJECT', 'RECRUITMENT_REQUEST_OVERRIDE'];
let user = { user_id: 7, full_name: 'HR Test', roles: [{ role_code: 'HR_MANAGER' }], permissions };
let request = {};
let totalHeadcount = 1;
let totalSalary = 240000000;
let usedHeadcount = 0;
let usedSalary = 0;
let missingBudget = false;
let stale = false;
let decisions = [];
let created;
let saved;
const reset = () => {
  request = { requisition_id: 1, id: 1, requisition_code: 'REQ-TEST', department_id: 2, department_name: 'Kỹ thuật', position_name: 'Developer',
    headcount: 2, date_needed: '2099-06-15', proposed_min_salary: '10000000.00', proposed_max_salary: '20000000.00', estimated_salary_cost: '480000000.00',
    budget_year: 2099, status: 'PENDING', reason: 'Tăng mới', job_description: 'Developer', requirements: 'Node.js', created_by_name: 'Test', created_at: '2026-10-11' };
  totalHeadcount = 1; totalSalary = 240000000; usedHeadcount = 0; usedSalary = 0; missingBudget = false; stale = false; decisions = [];
};
const availability = () => ({ department_id: 2, budget_year: 2099, total_headcount: totalHeadcount, used_headcount: usedHeadcount,
  remaining_headcount: totalHeadcount - usedHeadcount, total_salary_budget: `${totalSalary}.00`, used_salary_budget: `${usedSalary}.00`, remaining_salary_budget: `${totalSalary - usedSalary}.00` });
let browser;
try {
  browser = await puppeteer.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.evaluateOnNewDocument(() => localStorage.setItem('token', 'ui-test-only'));
  await page.setRequestInterception(true);
  page.on('request', async event => {
    const url = new URL(event.url());
    if (!url.pathname.startsWith('/api/')) return event.continue();
    const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS' };
    if (event.method() === 'OPTIONS') return event.respond({ status: 204, headers });
    let data = {}; let status = 200; let failure;
    if (url.pathname === '/api/auth/me') data = user;
    else if (url.pathname === '/api/notifications') data = { notifications: [], unreadCount: 0 };
    else if (url.pathname === '/api/departments') data = { departments: [{ department_id: 2, department_name: 'Kỹ thuật' }] };
    else if (url.pathname === '/api/job-positions') data = [{ position_id: 3, position_name: 'Developer', min_salary: 10000000, max_salary: 30000000 }];
    else if (url.pathname === '/api/master-data') data = [{ category_group: 'WORK_LOCATION', code: 'HN', name: 'Hà Nội', is_active: true }, { category_group: 'WORK_TYPE', code: 'FT', name: 'Toàn thời gian', is_active: true }];
    else if (url.pathname.endsWith('/availability')) {
      if (missingBudget) { status = 409; failure = { code: 'BUDGET_NOT_CONFIGURED', message: 'Chưa thiết lập chỉ tiêu.' }; }
      else data = availability();
    } else if (url.pathname.startsWith('/api/department-budgets')) {
      if (event.method() === 'PUT') { saved = JSON.parse(event.postData()); totalHeadcount = saved.total_headcount; totalSalary = Number(saved.total_salary_budget); data = availability(); }
      else data = [{ ...availability(), department_name: 'Kỹ thuật', budget_id: 1 }];
    } else if (url.pathname.endsWith('/status')) {
      const payload = JSON.parse(event.postData()); decisions.push(payload);
      if (stale && !payload.is_override) {
        totalHeadcount = 1; totalSalary = 240000000;
        status = 409; failure = { code: 'BUDGET_EXCEEDED', details: { ...availability(), exceeded_headcount: 1, exceeded_salary_budget: '240000000.00' } };
      } else { request = { ...request, status: payload.status, rejection_reason: payload.rejection_reason }; if (payload.status === 'APPROVED') { usedHeadcount += 2; usedSalary += 480000000; } data = request; }
    } else if (url.pathname === '/api/recruitment-requests' && event.method() === 'POST') { created = JSON.parse(event.postData()); data = request; }
    else if (url.pathname.endsWith('/my') || url.pathname.endsWith('/approvals')) data = [request];
    else if (url.pathname === '/api/recruitment-requests/1') data = request;
    else { status = 404; failure = { message: `Unmocked API: ${url.pathname}` }; }
    await event.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(failure ? { success: false, ...failure } : { success: true, data }) });
  });
  const visit = route => page.goto(`${base}${route}`, { waitUntil: 'networkidle0' });
  const text = () => page.evaluate(() => document.body.innerText);
  const click = async label => {
    await page.waitForFunction(label => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === label && !button.disabled), {}, label);
    await page.evaluate(label => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label).click(), label);
  };
  const fill = async (selector, value) => {
    await page.$eval(selector, (input, value) => {
      const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  };
  const waitText = value => page.waitForFunction(value => document.body.innerText.includes(value), {}, value);
  reset();
  await visit('/department-budgets');
  assert.match(await text(), /Ngân sách còn lại/);
  await click('Chỉnh sửa');
  await fill('.rb-form input[type="number"]', '5');
  await fill('.rb-form input[type="text"]', '1000000000.00');
  await click('Lưu chỉ tiêu'); await waitText('Đã lưu chỉ tiêu');
  assert.deepEqual(saved, { total_headcount: 5, total_salary_budget: '1000000000.00' });
  console.log('PASS budget list and edit');

  reset();
  await visit('/recruitment-requests/create');
  await page.select('[name="department_id"]', '2'); await page.select('[name="position_id"]', '3');
  await fill('[name="headcount"]', '2'); await fill('[name="needed_by_date"]', '2099-06-15');
  await fill('[name="proposed_salary_min"]', '10000000'); await fill('[name="proposed_salary_max"]', '20000000');
  await page.select('[name="work_location_code"]', 'HN'); await page.select('[name="work_type_code"]', 'FT');
  await fill('[name="job_description"]', 'Developer'); await fill('[name="candidate_requirements"]', 'Node.js');
  await waitText('Vượt chỉ tiêu');
  await click('Gửi Yêu Cầu Tuyển Dụng');
  await page.waitForFunction(() => location.pathname === '/recruitment-requests');
  assert.equal(created.status, 'PENDING'); assert.equal(created.date_needed, '2099-06-15'); assert.equal(created.is_override, undefined);
  console.log('PASS over-limit creation remains PENDING without override');

  await visit('/recruitment-requests/approvals'); await waitText('Vượt chỉ tiêu'); assert.match(await text(), /480\.000\.000/);
  await visit('/recruitment-requests/1'); await click('Duyệt');
  await page.waitForSelector('dialog[open]');
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  await fill('dialog textarea', '   '); await page.click('dialog input[type="checkbox"]');
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  await fill('dialog textarea', '  Dự án cần gấp  '); await click('Xác nhận ghi đè và duyệt'); await waitText('Đã phê duyệt yêu cầu.');
  assert.deepEqual(decisions[0], { status: 'APPROVED', is_override: true, override_reason: 'Dự án cần gấp' });
  await waitText('Mức vượt headcount: 1');
  console.log('PASS approval list, required override reason/confirmation, no double counting');

  reset(); await visit('/recruitment-requests/1'); await click('Từ chối');
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  await fill('dialog textarea', 'Không cần tuyển'); await click('Xác nhận từ chối'); await waitText('Đã từ chối yêu cầu.');
  assert.equal(decisions[0].rejection_reason, 'Không cần tuyển'); assert.equal(usedHeadcount, 0);
  console.log('PASS rejection reason and unchanged usage');

  reset(); totalHeadcount = 5; totalSalary = 1000000000; stale = true;
  await visit('/recruitment-requests/1'); await click('Duyệt'); await click('Xác nhận duyệt');
  await waitText('Xác nhận ghi đè chỉ tiêu'); assert.equal(decisions.length, 1);
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  await fill('dialog textarea', 'Đã kiểm tra lại'); await page.click('dialog input[type="checkbox"]'); await click('Xác nhận ghi đè và duyệt'); await waitText('Đã phê duyệt yêu cầu.');
  assert.equal(decisions.length, 2); assert.equal(decisions[1].is_override, true);
  console.log('PASS stale availability 409 requires a new explicit override');

  reset(); user = { ...user, permissions: permissions.filter(permission => permission !== 'RECRUITMENT_REQUEST_OVERRIDE') };
  await visit('/recruitment-requests/1'); await click('Duyệt'); await waitText('Bạn không có quyền RECRUITMENT_REQUEST_OVERRIDE');
  assert.equal(await page.$eval('dialog button[type="submit"]', button => button.disabled), true);
  user = { ...user, roles: [{ role_code: 'ADMIN' }], permissions, job_title: 'Trưởng phòng nhân sự', company_email: 'dtc245200002@ictu.edu.vn' };
  await visit('/department-budgets'); assert.equal(new URL(page.url()).pathname, '/unauthorized');
  await visit('/recruitment-requests/approvals'); assert.equal(new URL(page.url()).pathname, '/unauthorized');
  await visit('/recruitment-requests/1'); assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].some(button => ['Duyệt', 'Từ chối'].includes(button.textContent.trim()))), false);
  assert.equal(await page.$('a[href="/department-budgets"]'), null);
  console.log('PASS role/permission guards ignore job title and email');

  user = { ...user, roles: [{ role_code: 'HR_MANAGER' }], permissions }; missingBudget = true;
  await visit('/recruitment-requests/1'); await waitText('chưa được thiết lập đầy đủ chỉ tiêu');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Duyệt').disabled), true);
  console.log('PASS missing budget is not shown as zero or within limits');
  assert.deepEqual(pageErrors, []);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
