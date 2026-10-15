const repository = require('../repositories/interviewScheduleRepository');
const managers = ['ADMIN', 'HR_MANAGER', 'RECRUITER'];
const allScope = { type: 'all' };

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function id(value, label) {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))
      || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) fail(400, `${label} không hợp lệ.`);
  return Number(value);
}

function requireRole(user, write = false) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');
  const roles = user.roles?.map(role => role.role_code) || [];
  if (roles.includes('CANDIDATE')) fail(403, 'Ứng viên không được truy cập lịch phỏng vấn nội bộ.');
  const manager = roles.some(role => managers.includes(role));
  if (!manager && (write || !roles.some(role => ['INTERVIEWER', 'HIRING_MANAGER'].includes(role)))) {
    fail(403, 'Bạn không có quyền quản lý hoặc xem lịch phỏng vấn.');
  }
  return { roles, manager };
}

async function readScope(user) {
  const { roles, manager } = requireRole(user);
  if (manager) return allScope;
  if (roles.includes('INTERVIEWER')) return { type: 'interviewer', userId: user.user_id };
  if (!user.department_id || !await repository.supportsDepartmentScope()) {
    fail(403, 'Không xác định an toàn được phạm vi phòng ban của lịch phỏng vấn.');
  }
  return { type: 'department', departmentId: user.department_id };
}

function bodyFields(body, allowed, requireNonempty = true) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Dữ liệu lịch không hợp lệ.');
  const fields = Object.keys(body);
  if (requireNonempty && !fields.length) fail(400, 'Chưa có thông tin cần cập nhật.');
  if (fields.some(field => !allowed.includes(field))) fail(400, 'Có trường không được phép gửi hoặc thay đổi.');
}

function parseTime(value, label) {
  // Accept ISO 8601 with an explicit offset, to whole seconds (DATETIME precision).
  const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.000)?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match) fail(400, `${label} phải là ISO 8601 có múi giờ, ví dụ 2026-10-13T10:00:00+07:00.`);
  const [, yy, mm, dd, hh, min, ss = '00', zone] = match;
  const parts = [yy, mm, dd, hh, min, ss].map(Number);
  const local = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  if (parts[0] < 1000 || local.getUTCFullYear() !== parts[0] || local.getUTCMonth() + 1 !== parts[1]
      || local.getUTCDate() !== parts[2] || local.getUTCHours() !== parts[3]
      || local.getUTCMinutes() !== parts[4] || local.getUTCSeconds() !== parts[5]) fail(400, `${label} không hợp lệ.`);
  let offset = 0;
  if (zone !== 'Z') {
    const hours = Number(zone.slice(1, 3));
    const minutes = Number(zone.slice(4, 6));
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) fail(400, `${label} có múi giờ không hợp lệ.`);
    offset = (hours * 60 + minutes) * (zone[0] === '+' ? 1 : -1);
  }
  const utc = new Date(local.getTime() - offset * 60000);
  if (utc.getUTCFullYear() < 1000 || utc.getUTCFullYear() > 9999) fail(400, `${label} ngoài phạm vi lưu trữ.`);
  return utc.toISOString().slice(0, 19).replace('T', ' ');
}

const editable = ['position_id', 'interviewer_id', 'room_id', 'start_at', 'end_at'];
function normalize(body, existing) {
  bodyFields(body, existing ? editable : ['candidate_id', ...editable]);
  const data = existing ? { ...existing } : {};
  for (const field of ['candidate_id', 'position_id', 'interviewer_id', 'room_id']) {
    if (!existing || Object.prototype.hasOwnProperty.call(body, field)) data[field] = id(body[field], field);
  }
  for (const field of ['start_at', 'end_at']) {
    if (!existing || Object.prototype.hasOwnProperty.call(body, field)) data[field] = parseTime(body[field], field);
  }
  if (data.end_at <= data.start_at) fail(400, 'Thời gian kết thúc phải sau thời gian bắt đầu.');
  return data;
}

async function validateAndLock(data, connection) {
  if (!await repository.candidateExists(data.candidate_id, connection)) fail(404, 'Không tìm thấy ứng viên.');
  if (!await repository.positionExists(data.position_id, connection)) fail(404, 'Không tìm thấy vị trí tuyển dụng.');
  // Every create/reschedule locks resources in the same user -> room order.
  // The locks are held through conflict detection, write and COMMIT.
  const interviewer = await repository.lockInterviewer(data.interviewer_id, connection);
  if (!interviewer) fail(404, 'Không tìm thấy người phỏng vấn.');
  if (interviewer.status !== 'ACTIVE') fail(400, 'Người phỏng vấn không còn hoạt động.');
  if (interviewer.role_codes.includes('CANDIDATE')
      || !interviewer.role_codes.some(role => repository.interviewerRoles.includes(role))) {
    fail(400, 'Người dùng không có vai trò phù hợp để phỏng vấn.');
  }
  const room = await repository.lockRoom(data.room_id, connection);
  if (!room) fail(404, 'Không tìm thấy phòng phỏng vấn.');
  if (room.category_group !== 'INTERVIEW_ROOM') fail(400, 'Phòng phải thuộc danh mục INTERVIEW_ROOM.');
  if (Number(room.is_active) !== 1) fail(400, 'Phòng phỏng vấn đã ngừng hoạt động.');
}

async function checkConflicts(data, excludeId, connection) {
  const conflicts = await repository.findConflicts(data, excludeId, connection);
  const interviewerConflict = conflicts.some(row => row.interviewer_id === data.interviewer_id);
  const roomConflict = conflicts.some(row => row.room_id === data.room_id);
  if (interviewerConflict && roomConflict) fail(409, 'Người phỏng vấn đã có lịch và phòng phỏng vấn đã được sử dụng trong khoảng thời gian này.');
  if (interviewerConflict) fail(409, 'Người phỏng vấn đã có lịch trong khoảng thời gian này.');
  if (roomConflict) fail(409, 'Phòng phỏng vấn đã được sử dụng trong khoảng thời gian này.');
}

async function getAll(query, user) {
  const scope = await readScope(user);
  const filters = {};
  for (const field of ['candidate_id', 'interviewer_id', 'room_id']) {
    if (query[field] !== undefined) filters[field] = id(query[field], field);
  }
  if (query.status !== undefined) {
    if (!['SCHEDULED', 'CANCELLED'].includes(query.status)) fail(400, 'Trạng thái không hợp lệ.');
    filters.status = query.status;
  }
  for (const field of ['from', 'to']) if (query[field] !== undefined) filters[field] = parseTime(query[field], field);
  if (filters.from && filters.to && filters.to <= filters.from) fail(400, 'Khoảng thời gian lọc không hợp lệ.');
  return repository.getAll(filters, scope);
}

async function getById(scheduleId, user) {
  const scope = await readScope(user);
  const result = await repository.findById(id(scheduleId, 'ID lịch'), scope);
  if (!result) fail(404, 'Không tìm thấy lịch phỏng vấn trong phạm vi được phép.');
  return result;
}

async function getOptions(user) {
  // Global selectors are only needed by managers; do not disclose all candidates to scoped readers.
  requireRole(user, true);
  return repository.getOptions();
}

async function create(body, user) {
  requireRole(user, true);
  const data = normalize(body);
  return repository.withTransaction(async connection => {
    await validateAndLock(data, connection);
    await checkConflicts(data, null, connection);
    const scheduleId = await repository.insert(data, user.user_id, connection);
    return repository.findById(scheduleId, allScope, connection);
  });
}

async function update(scheduleId, body, user) {
  requireRole(user, true);
  const parsedId = id(scheduleId, 'ID lịch');
  bodyFields(body, editable);
  return repository.withTransaction(async connection => {
    const existing = await repository.findForUpdate(parsedId, connection);
    if (!existing) fail(404, 'Không tìm thấy lịch phỏng vấn.');
    if (existing.status === 'CANCELLED') fail(409, 'Không thể sửa lịch đã hủy.');
    const data = normalize(body, existing);
    await validateAndLock(data, connection);
    await checkConflicts(data, parsedId, connection);
    await repository.update(parsedId, data, user.user_id, connection);
    return repository.findById(parsedId, allScope, connection);
  });
}

async function cancel(scheduleId, body, user) {
  requireRole(user, true);
  const parsedId = id(scheduleId, 'ID lịch');
  bodyFields(body ?? {}, [], false);
  return repository.withTransaction(async connection => {
    const existing = await repository.findForUpdate(parsedId, connection);
    if (!existing) fail(404, 'Không tìm thấy lịch phỏng vấn.');
    // Repeated cancellation is idempotent and does not rewrite the original updater.
    if (existing.status !== 'CANCELLED') await repository.cancel(parsedId, user.user_id, connection);
    return repository.findById(parsedId, allScope, connection);
  });
}

module.exports = { getAll, getById, getOptions, create, update, cancel };
