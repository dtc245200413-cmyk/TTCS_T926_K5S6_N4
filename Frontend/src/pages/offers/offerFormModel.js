import { toLocalInput } from '../../utils/interviewSchedules';

export const EDITABLE_STATUSES = ['DRAFT', 'CHANGE_REQUESTED'];

function dateInput(value) {
  // Preserve DATE-only values; legacy MySQL responses may serialize a Date
  // as UTC. Reuse the application's Vietnam wall-time conversion for those.
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value : toLocalInput(value).slice(0, 10);
}

export function canUseOfferDrafts(user) {
  const roles = user?.roles?.map(role => role.role_code) || [];
  return !roles.some(role => ['CANDIDATE', 'INTERVIEWER'].includes(role)) &&
    roles.some(role => ['ADMIN', 'HR_MANAGER', 'RECRUITER'].includes(role));
}

// The Offer must first have been returned by the scoped Backend GET.
// HR_MANAGER scope is verified there, never inferred from a department name.
export function canEditOffer(user, offer) {
  if (!offer || !canUseOfferDrafts(user) || !EDITABLE_STATUSES.includes(offer.status)) return false;
  const roles = user.roles.map(role => role.role_code);
  return roles.includes('ADMIN') || roles.includes('HR_MANAGER') ||
    (Number(user.user_id) > 0 && Number(offer.created_by) === Number(user.user_id));
}

export function formFromOffer(offer = {}) {
  return {
    job_title: offer.job_title ?? '',
    basic_salary: offer.basic_salary == null ? '' : String(offer.basic_salary),
    currency: offer.currency ?? 'VND',
    expected_start_date: dateInput(offer.expected_start_date),
    response_deadline: dateInput(offer.response_deadline),
    message: offer.message ?? '',
    work_location: offer.work_location ?? '',
    benefits: offer.benefits ?? '',
    special_terms: offer.special_terms ?? '',
  };
}

export function validateOfferForm(form, positionId, submitting) {
  const errors = {};
  if (Array.from(form.job_title.trim()).length > 150) errors.job_title = 'Chức danh tối đa 150 ký tự.';
  if (form.basic_salary && (!/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(form.basic_salary) || Number(form.basic_salary) <= 0)) {
    errors.basic_salary = 'Mức lương phải lớn hơn 0, tối đa 13 chữ số nguyên và 2 chữ số thập phân.';
  }
  if (!/^[A-Z]{3}$/.test(form.currency)) errors.currency = 'Tiền tệ gồm 3 chữ cái in hoa, ví dụ VND.';
  if (Array.from(form.work_location.trim()).length > 255) errors.work_location = 'Địa điểm tối đa 255 ký tự.';
  for (const key of ['message', 'benefits', 'special_terms']) {
    if (new TextEncoder().encode(form[key].trim()).length > 65535) errors[key] = 'Nội dung quá dài.';
  }
  for (const key of ['expected_start_date', 'response_deadline']) {
    const value = form[key];
    const date = new Date(`${value}T00:00:00Z`);
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000 ||
        Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)) {
      errors[key] = 'Ngày không hợp lệ.';
    }
  }
  if (submitting) {
    for (const key of ['job_title', 'basic_salary', 'expected_start_date', 'response_deadline']) {
      if (!form[key].trim()) errors[key] = 'Bắt buộc khi gửi duyệt.';
    }
    if (!positionId) errors.position_id = 'Chưa có vị trí được xác minh cho hồ sơ này.';
  }
  return errors;
}

export function draftPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) =>
    [key, key === 'currency' ? value : value.trim() || null]));
}
