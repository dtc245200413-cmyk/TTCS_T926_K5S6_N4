function fail(statusCode, code, message) {
  const error = new Error(message);
  Object.assign(error, { statusCode, code });
  throw error;
}

function dependencyUnavailable() {
  fail(503, 'OFFER_DRAFT_DEPENDENCY_UNAVAILABLE',
    'Chưa thể ghi Offer: hợp đồng hồ sơ, quyết định Đạt và schema lưu nháp chưa được xác nhận.');
}

function positiveId(value, field) {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value))) {
    fail(400, 'INVALID_OFFER_INPUT', `${field} phải là ID hợp lệ.`);
  }
  return Number(value);
}

function date(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number(value.slice(0, 4)) < 1000) {
    fail(400, 'INVALID_OFFER_INPUT', `${field} phải có định dạng YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(400, 'INVALID_OFFER_INPUT', `${field} không phải ngày hợp lệ.`);
  }
  return value;
}

function money(value) {
  if (!['number', 'string'].includes(typeof value) ||
      !/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(String(value)) || Number(value) <= 0) {
    fail(400, 'INVALID_OFFER_INPUT', 'Mức lương phải là số dương, tối đa 13 chữ số nguyên và 2 chữ số thập phân.');
  }
  const [whole, fraction = ''] = String(value).split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

const textLimits = { job_title: 150, work_location: 255, message: null, benefits: null, special_terms: null };
const editableFields = [
  ...Object.keys(textLimits), 'position_id', 'basic_salary', 'currency',
  'expected_start_date', 'response_deadline'
];

function normalizeDraft(body, { create = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail(400, 'INVALID_OFFER_INPUT', 'Nội dung Offer phải là một object.');
  }
  const allowed = new Set(create ? [...editableFields, 'application_id'] : editableFields);
  if (Object.keys(body).some(key => !allowed.has(key))) {
    fail(400, 'IMMUTABLE_OFFER_FIELD', 'Có trường không được phép ghi trong Offer.');
  }
  const normalized = {};
  if (create) normalized.application_id = positiveId(body.application_id, 'application_id');
  for (const field of editableFields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value === null && field !== 'currency') {
      normalized[field] = null;
    } else if (Object.hasOwn(textLimits, field)) {
      if (typeof value !== 'string') fail(400, 'INVALID_OFFER_INPUT', `${field} phải là chuỗi.`);
      const clean = value.trim();
      if ((textLimits[field] && Array.from(clean).length > textLimits[field]) ||
          Buffer.byteLength(clean, 'utf8') > 65535) {
        fail(400, 'INVALID_OFFER_INPUT', `${field} vượt quá độ dài cho phép.`);
      }
      normalized[field] = clean || null;
    } else if (field === 'position_id') {
      normalized[field] = positiveId(value, field);
    } else if (field === 'basic_salary') {
      normalized[field] = money(value);
    } else if (field === 'currency') {
      if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
        fail(400, 'INVALID_OFFER_INPUT', 'currency phải là mã gồm 3 chữ cái in hoa.');
      }
      normalized[field] = value;
    } else {
      normalized[field] = date(value, field);
    }
  }
  if (!create && !Object.keys(normalized).length) {
    fail(400, 'INVALID_OFFER_INPUT', 'Cần ít nhất một trường nội dung để cập nhật.');
  }
  if (create && !Object.hasOwn(normalized, 'currency')) normalized.currency = 'VND';
  return normalized;
}

function expectedVersion(ifMatch) {
  if (ifMatch === undefined) fail(428, 'OFFER_VERSION_REQUIRED', 'Cần If-Match với phiên bản Offer đang chỉnh sửa.');
  if (typeof ifMatch !== 'string' || !/^"[1-9]\d*"$/.test(ifMatch)) {
    fail(400, 'INVALID_OFFER_INPUT', 'If-Match phải là phiên bản dạng "1".');
  }
  return positiveId(ifMatch.slice(1, -1), 'If-Match');
}

function assertEditable(offer, version) {
  if (!offer) fail(403, 'OFFER_OUT_OF_SCOPE', 'Offer không tồn tại hoặc nằm ngoài phạm vi được phép.');
  if (!['DRAFT', 'CHANGE_REQUESTED'].includes(offer.status)) {
    fail(400, 'OFFER_NOT_EDITABLE', 'Chỉ được sửa hoặc gửi Offer Nháp hoặc Yêu cầu chỉnh sửa.');
  }
  if (version !== undefined && Number(offer.row_version) !== version) {
    fail(409, 'OFFER_VERSION_CONFLICT', 'Offer đã thay đổi. Vui lòng tải lại trước khi lưu.');
  }
}

function assertApplication(application, expectedId) {
  if (!application || application.mapping_verified !== true) dependencyUnavailable();
  for (const field of ['id', 'candidate_id', 'recruitment_request_id', 'department_id']) {
    positiveId(application[field], field);
  }
  if (Number(application.id) !== Number(expectedId)) {
    fail(422, 'OFFER_APPLICATION_MISMATCH', 'Hồ sơ tuyển dụng không khớp.');
  }
}

// Internal reader contract, never taken from the HTTP body. No runtime reader
// is enabled until the source and authority policy are confirmed by its owner.
function assertPassedDecision(application, decision) {
  if (!decision || decision.authority_verified !== true || decision.is_current !== true ||
      !decision.source || !decision.reference || !decision.version || !decision.decided_at ||
      !Number.isSafeInteger(Number(decision.decided_by)) || Number(decision.decided_by) <= 0) {
    dependencyUnavailable();
  }
  if (decision.decision !== 'PASSED') {
    fail(422, 'OFFER_DECISION_NOT_PASSED', 'Hồ sơ chưa có quyết định Đạt hợp lệ.');
  }
  if (Number(decision.application_id) !== Number(application.id) ||
      Number(decision.candidate_id) !== Number(application.candidate_id) ||
      Number(decision.recruitment_request_id) !== Number(application.recruitment_request_id)) {
    fail(422, 'OFFER_DECISION_MISMATCH', 'Quyết định Đạt không thuộc đúng hồ sơ tuyển dụng.');
  }
}

function assertNoDuplicate(result) {
  // Unknown is not equivalent to no duplicates.
  if (!Array.isArray(result)) dependencyUnavailable();
  if (result.length) fail(409, 'OFFER_DUPLICATE', 'Hồ sơ đã có Offer còn hiệu lực.');
}

function assertCatalog(content, application, catalog, { submit = false } = {}) {
  if (!catalog || catalog.department?.id !== Number(application.department_id) ||
      catalog.department.active !== true) {
    fail(422, 'INVALID_OFFER_DEPARTMENT', 'Phòng ban của hồ sơ không hợp lệ.');
  }
  if (content.position_id != null) {
    if (catalog.position?.id !== Number(content.position_id) || catalog.position.active !== true) {
      fail(422, 'INVALID_OFFER_POSITION', 'Vị trí tuyển dụng không hợp lệ.');
    }
  } else if (submit) {
    fail(422, 'OFFER_REQUIRED_FIELD', 'Cần chọn vị trí tuyển dụng trước khi gửi duyệt.');
  }
}

function validateSubmission(offer, { application, decision, catalog, duplicates }) {
  assertEditable(offer);
  assertApplication(application, offer.application_id);
  if (Number(offer.candidate_id) !== Number(application.candidate_id) ||
      Number(offer.recruitment_request_id) !== Number(application.recruitment_request_id) ||
      Number(offer.department_id) !== Number(application.department_id)) {
    fail(422, 'OFFER_APPLICATION_MISMATCH', 'Offer không khớp hồ sơ tuyển dụng.');
  }
  assertPassedDecision(application, decision);
  assertCatalog(offer, application, catalog, { submit: true });
  // Normalize MySQL DATE values when reading a stored Offer.
  // HTTP input validation remains strict.
  const content = Object.fromEntries(editableFields.filter(key => Object.hasOwn(offer, key)).map(key => {
    const value = offer[key];
    if ((key === 'expected_start_date' || key === 'response_deadline') && value instanceof Date) {
      if (!Number.isFinite(value.getTime())) {
        fail(400, 'INVALID_OFFER_INPUT', 'Invalid stored date');
      }
      const pad = n => String(n).padStart(2, '0');
      return [key, `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`];
    }
    return [key, value];
  }));
  const normalized = normalizeDraft(content);
  for (const field of ['job_title', 'position_id', 'basic_salary', 'currency', 'expected_start_date', 'response_deadline']) {
    if (normalized[field] == null) fail(422, 'OFFER_REQUIRED_FIELD', `Thiếu ${field} trước khi gửi duyệt.`);
  }
  assertNoDuplicate(duplicates);
}

module.exports = {
  dependencyUnavailable, positiveId, normalizeDraft, expectedVersion, assertEditable,
  assertApplication, assertPassedDecision, assertNoDuplicate, assertCatalog, validateSubmission
};
