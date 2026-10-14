const repository = require('../repositories/candidateProfileRepository');

const writerRoles = ['ADMIN', 'HR_MANAGER', 'RECRUITER'];

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function parseId(value, label) {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value))
      || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    fail(400, `${label} không hợp lệ.`);
  }
  return Number(value);
}

async function requireAccess(id, user, write = false) {
  if (!user?.user_id) fail(401, 'Bạn chưa đăng nhập.');
  const roles = (user.roles || []).map(role => role.role_code);
  // Explicit denial also covers a misconfigured account combining Candidate with staff roles.
  if (roles.includes('CANDIDATE')) fail(403, 'Bạn không có quyền truy cập hồ sơ nội bộ.');
  const writer = roles.some(role => writerRoles.includes(role));
  if (!writer && (write || !roles.includes('HIRING_MANAGER'))) {
    fail(403, 'Bạn không có quyền thực hiện thao tác này.');
  }
  const candidateId = parseId(id, 'ID ứng viên');
  const candidate = await repository.findCandidate(candidateId);
  if (!candidate) fail(404, 'Không tìm thấy ứng viên.');
  if (!writer) {
    if (!user.department_id || !candidate.recruitment_request_id) {
      fail(403, 'Không xác định được phạm vi phòng ban của hồ sơ.');
    }
    const departmentId = await repository.findRequestDepartment(candidate.recruitment_request_id);
    if (!departmentId || String(departmentId) !== String(user.department_id)) {
      fail(403, 'Hồ sơ không thuộc phạm vi phòng ban được phép.');
    }
  }
  return candidateId;
}

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Dữ liệu không hợp lệ.');
}

async function getTags(id, user) {
  return repository.getTags(await requireAccess(id, user));
}

async function addTag(id, body, user) {
  const candidateId = await requireAccess(id, user, true);
  requireBody(body);
  const tagId = parseId(body.tag_id, 'ID nhãn');
  try {
    return await repository.withTransaction(async connection => {
      // Hold the catalogue row lock until insert commits, including concurrent deactivation.
      const tag = await repository.findTagForUpdate(tagId, connection);
      if (!tag) fail(404, 'Không tìm thấy nhãn.');
      if (tag.category_group !== 'CANDIDATE_TAG') fail(400, 'Nhãn không thuộc danh mục CANDIDATE_TAG.');
      if (Number(tag.is_active) !== 1) fail(400, 'Nhãn đã ngừng hoạt động.');
      await repository.insertTag(candidateId, tagId, user.user_id, connection);
      return { candidate_id: candidateId, tag_id: tagId };
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') fail(409, 'Ứng viên đã được gắn nhãn này.');
    throw error;
  }
}

async function removeTag(id, tagId, user) {
  const candidateId = await requireAccess(id, user, true);
  const parsedTagId = parseId(tagId, 'ID nhãn');
  const removed = await repository.removeTag(candidateId, parsedTagId);
  return { candidate_id: candidateId, tag_id: parsedTagId, removed };
}

async function getNotes(id, user) {
  return repository.getNotes(await requireAccess(id, user));
}

async function addNote(id, body, user) {
  const candidateId = await requireAccess(id, user, true);
  requireBody(body);
  if (Object.prototype.hasOwnProperty.call(body, 'author_id')) {
    fail(400, 'Không được gửi author_id. Người viết được xác định từ phiên đăng nhập.');
  }
  if (typeof body.note_content !== 'string') fail(400, 'Nội dung ghi chú phải là chuỗi.');
  const content = body.note_content.trim();
  if (!content) fail(400, 'Nội dung ghi chú không được rỗng.');
  if (Array.from(content).length > 5000) fail(400, 'Ghi chú không được vượt quá 5000 ký tự.');
  return repository.withTransaction(connection =>
    repository.insertNote(candidateId, user.user_id, content, connection)
  );
}

module.exports = { getTags, addTag, removeTag, getNotes, addNote };
