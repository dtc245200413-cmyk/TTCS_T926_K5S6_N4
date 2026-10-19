export function interviewAccess(user) {
  const roles = user?.roles?.map(role => role.role_code) || [];
  const blocked = roles.includes('CANDIDATE');
  const canManage = !blocked && roles.some(role => ['ADMIN', 'HR_MANAGER', 'RECRUITER'].includes(role));
  return { canManage, canView: !blocked && (canManage || roles.some(role => ['HIRING_MANAGER', 'INTERVIEWER'].includes(role))) };
}

export function interviewError(error, fallback) {
  // Preserve the Backend's resource-specific conflict message verbatim.
  if (error.response?.status === 409) return error.response.data?.message || 'Lịch bị trùng. Vui lòng chọn thời gian hoặc tài nguyên khác.';
  if (error.response?.status === 403) return error.response.data?.message || 'Bạn không có quyền truy cập lịch phỏng vấn trong phạm vi này.';
  if (error.response?.status === 404) return error.response.data?.message || 'Không tìm thấy lịch phỏng vấn.';
  return error.response?.data?.message || fallback;
}

export const INTERVIEW_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const INTERVIEW_DURATIONS = [30, 45, 60, 90, 120];
const vietnamFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: INTERVIEW_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

export function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const p = Object.fromEntries(vietnamFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

export function localToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  // Vietnam uses UTC+07:00; never interpret a wall time in the browser's zone.
  const date = new Date(`${value}+07:00`);
  const canonical = value.length === 16 ? `${value}:00` : value;
  if (Number.isNaN(date.getTime()) || toLocalInput(date) !== canonical
      || date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) return null;
  return date.toISOString();
}

export function displayTime(value) {
  const local = toLocalInput(value);
  if (!local) return 'Không rõ thời gian';
  const [day, time] = local.split('T');
  return `${time} ${day.split('-').reverse().join('/')}`;
}

export function scheduleTimeFields(schedule) {
  if (!schedule) return { interview_date: '', start_time: '', duration: '60', end_date: '', end_time: '' };
  const [interview_date = '', start_time = ''] = toLocalInput(schedule.start_at).split('T');
  const [end_date = '', end_time = ''] = toLocalInput(schedule.end_at).split('T');
  const minutes = (new Date(schedule.end_at) - new Date(schedule.start_at)) / 60000;
  const preset = INTERVIEW_DURATIONS.includes(minutes) && start_time.endsWith(':00') && end_time.endsWith(':00');
  return { interview_date, start_time, duration: preset ? String(minutes) : 'custom', end_date, end_time };
}

export function resolveScheduleTime(form) {
  const custom = form.duration === 'custom';
  if (!form.interview_date || !form.start_time || (custom && (!form.end_date || !form.end_time))) {
    return { error: 'Vui lòng nhập thời gian bắt đầu và kết thúc.' };
  }
  const start = localToIso(`${form.interview_date}T${form.start_time}`);
  if (!start) return { error: 'Thời gian không hợp lệ. Vui lòng kiểm tra lại.' };
  let end;
  if (custom) end = localToIso(`${form.end_date}T${form.end_time}`);
  else if (INTERVIEW_DURATIONS.includes(Number(form.duration))) {
    end = new Date(new Date(start).getTime() + Number(form.duration) * 60000).toISOString();
    if (!localToIso(toLocalInput(end))) end = null;
  }
  if (!end) return { error: 'Thời gian không hợp lệ. Vui lòng kiểm tra lại.' };
  if (new Date(end) <= new Date(start)) return { error: 'Thời gian kết thúc phải sau thời gian bắt đầu.' };
  return { start, end };
}

export function getScheduleStatusInfo(status) {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Đã lên lịch', className: 'is-badge' };
    case 'IN_PROGRESS':
      return { label: 'Đang diễn ra', className: 'is-badge', style: { background: '#fef3c7', color: '#b45309' } };
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', className: 'is-badge', style: { background: '#dcfce7', color: '#15803d' } };
    case 'CANCELLED':
      return { label: 'Đã hủy', className: 'is-badge is-cancelled', style: { background: '#f1f5f9', color: '#64748b' } };
    default:
      return { label: status || 'Chưa xác định', className: 'is-badge' };
  }
}

