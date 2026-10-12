/** Shared validation and exact decimal arithmetic for recruitment budgets. */
function businessError(message, statusCode = 400, code = 'INVALID_BUDGET_DATA', details) {
  const error = new Error(message);
  Object.assign(error, { statusCode, code, details });
  return error;
}

function positiveInteger(value, name, allowZero = false) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) ||
      Number(value) < (allowZero ? 0 : 1) || Number(value) > 2147483647) {
    throw businessError(`${name} phải là số nguyên ${allowZero ? 'không âm' : 'dương'}.`);
  }
  return Number(value);
}

function moneyToCents(value, name = 'Ngân sách') {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw businessError(`${name} phải là số không âm, tối đa 2 chữ số thập phân.`);
  }
  const [whole, fraction = ''] = String(value).split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > 99999999999999999999n) throw businessError(`${name} vượt giới hạn lưu trữ.`);
  return cents;
}

function formatMoney(cents) {
  const sign = cents < 0n ? '-' : '';
  const amount = cents < 0n ? -cents : cents;
  return `${sign}${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}

function validateYear(value) {
  const year = positiveInteger(value, 'Năm');
  if (year < 1000 || year > 9999) throw businessError('Năm phải có 4 chữ số.');
  return year;
}

function calculateRequestBudget(data, required = false) {
  const present = value => value !== undefined && value !== null && value !== '';
  let year = null;
  if (present(data.date_needed)) {
    const value = data.date_needed instanceof Date
      ? `${data.date_needed.getFullYear()}-${String(data.date_needed.getMonth() + 1).padStart(2, '0')}-${String(data.date_needed.getDate()).padStart(2, '0')}`
      : String(data.date_needed);
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw businessError('Ngày cần người không hợp lệ.');
    }
    year = validateYear(value.slice(0, 4));
  }
  const headcount = present(data.headcount) ? positiveInteger(data.headcount, 'Headcount') : null;
  const max = present(data.proposed_max_salary) ? moneyToCents(data.proposed_max_salary, 'Lương tối đa') : null;
  const min = present(data.proposed_min_salary) ? moneyToCents(data.proposed_min_salary, 'Lương tối thiểu') : null;
  if ((max !== null && max > 999999999999999n) || (min !== null && min > 999999999999999n)) {
    throw businessError('Lương vượt giới hạn DECIMAL(15,2) của job_requisitions.');
  }
  if (min !== null && max !== null && min > max) throw businessError('Lương tối thiểu không được lớn hơn lương tối đa.');
  if (required && (year === null || headcount === null || max === null)) {
    throw businessError('Cần ngày cần người, headcount và lương tối đa để tính ngân sách.');
  }
  const cost = headcount !== null && max !== null ? BigInt(headcount) * max * 12n : null;
  if (cost !== null && cost > 99999999999999999999n) throw businessError('Chi phí lương vượt giới hạn lưu trữ.');
  return { budget_year: year, estimated_salary_cost: cost === null ? null : formatMoney(cost) };
}

function requireHrPermission(user, permission) {
  if (!user?.roles?.some(role => role.role_code === 'HR_MANAGER') || !user?.permissions?.includes(permission)) {
    throw businessError('Chỉ HR_MANAGER có quyền phù hợp mới được thực hiện thao tác này.', 403, 'FORBIDDEN');
  }
}

module.exports = { businessError, positiveInteger, moneyToCents, formatMoney, validateYear, calculateRequestBudget, requireHrPermission };
