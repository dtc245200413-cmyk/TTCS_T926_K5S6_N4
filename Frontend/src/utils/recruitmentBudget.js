export function cents(value) {
  if (value === null || value === undefined || !/^-?\d+(\.\d{1,2})?$/.test(String(value))) return null;
  const text = String(value);
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))) * (text.startsWith('-') ? -1n : 1n);
}

export function decimal(value) {
  const amount = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
}

export function money(value) {
  const amount = cents(value);
  if (amount === null) return '—';
  const [whole, fraction] = decimal(amount).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${fraction === '00' ? '' : `,${fraction}`} ₫`;
}

export function estimateCost(headcount, maxSalary) {
  const salary = cents(maxSalary);
  if (!/^\d+$/.test(String(headcount)) || Number(headcount) <= 0 || !Number.isSafeInteger(Number(headcount)) || salary === null || salary < 0n) return null;
  return decimal(BigInt(headcount) * salary * 12n);
}

export function requestYear(request) {
  return String(request.date_needed || request.needed_by_date || '').slice(0, 4) || String(request.budget_year || '');
}

export function requestCost(request) {
  return request.estimated_salary_cost ?? estimateCost(request.headcount, request.proposed_max_salary ?? request.proposed_salary_max);
}

export function budgetExcess(availability, headcount, cost, status = 'PENDING') {
  if (!availability || cents(cost) === null || !Number.isFinite(Number(headcount)) || Number(headcount) <= 0) return null;
  const remaining = cents(availability.remaining_salary_budget);
  if (remaining === null) return null;
  // APPROVED is already included in usage: never add the same request twice.
  const additional = status === 'PENDING' || status === 'DRAFT';
  const salary = (additional ? cents(cost) : 0n) - remaining;
  const count = Math.max(0, (additional ? Number(headcount) : 0) - Number(availability.remaining_headcount));
  return { headcount: count, salary: decimal(salary > 0n ? salary : 0n), exceeded: count > 0 || salary > 0n };
}

export function budgetError(error) {
  if (error.response?.status === 403) return 'Bạn chưa có quyền xem chỉ tiêu phòng ban.';
  if (error.response?.data?.code === 'BUDGET_NOT_CONFIGURED') return 'Phòng ban chưa được thiết lập đầy đủ chỉ tiêu cho năm này.';
  return error.response?.data?.message || 'Không tải được chỉ tiêu. Vui lòng thử lại.';
}

export const statusLabels = { DRAFT: 'Lưu nháp', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CLOSED: 'Đã đóng' };
