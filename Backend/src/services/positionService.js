/**
 * positionService.js
 * Business logic for Job Positions & Salary Ranges (SCRUM-62 / SCRUM-98).
 */

const positionRepo = require('../repositories/positionRepository');

/**
 * Get all job positions
 */
async function getAllPositions(filters = {}) {
  return await positionRepo.getAll(filters);
}

/**
 * Get single position
 */
async function getPositionById(id) {
  const position = await positionRepo.findById(id);
  if (!position) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  return position;
}

/**
 * Create a new position
 */
async function createPosition(data) {
  if (!data.position_code || !data.position_code.trim()) {
    const error = new Error('Mã chức danh là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  if (!data.position_name || !data.position_name.trim()) {
    const error = new Error('Tên chức danh là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  // Check unique code
  const existing = await positionRepo.findByCode(data.position_code);
  if (existing) {
    const error = new Error(`Mã chức danh "${data.position_code.toUpperCase()}" đã tồn tại.`);
    error.statusCode = 409;
    throw error;
  }

  // Validate salary range
  const min = data.min_salary !== undefined ? Number(data.min_salary) : null;
  const max = data.max_salary !== undefined ? Number(data.max_salary) : null;

  if (min !== null && min < 0) {
    const error = new Error('Lương tối thiểu không được nhỏ hơn 0.');
    error.statusCode = 400;
    throw error;
  }

  if (min !== null && max !== null && max < min) {
    const error = new Error('Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.');
    error.statusCode = 400;
    throw error;
  }

  return await positionRepo.create(data);
}

/**
 * Update an existing position
 */
async function updatePosition(id, data) {
  const existing = await positionRepo.findById(id);
  if (!existing) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  if (!data.position_name || !data.position_name.trim()) {
    const error = new Error('Tên chức danh là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  // Validate salary range
  const min = data.min_salary !== undefined ? Number(data.min_salary) : null;
  const max = data.max_salary !== undefined ? Number(data.max_salary) : null;

  if (min !== null && min < 0) {
    const error = new Error('Lương tối thiểu không được nhỏ hơn 0.');
    error.statusCode = 400;
    throw error;
  }

  if (min !== null && max !== null && max < min) {
    const error = new Error('Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu.');
    error.statusCode = 400;
    throw error;
  }

  return await positionRepo.update(id, data);
}

/**
 * Delete a position
 */
async function deletePosition(id) {
  const existing = await positionRepo.findById(id);
  if (!existing) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  return await positionRepo.deleteById(id);
}

/**
 * Check if proposed offer salary is within approved salary range (SCRUM-62 / SCRUM-98)
 */
async function validateOfferSalary(positionId, proposedSalary) {
  const position = await positionRepo.findById(positionId);
  if (!position) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const proposed = Number(proposedSalary);
  if (isNaN(proposed) || proposed <= 0) {
    const error = new Error('Mức lương đề xuất không hợp lệ.');
    error.statusCode = 400;
    throw error;
  }

  const min = position.min_salary ? Number(position.min_salary) : 0;
  const max = position.max_salary ? Number(position.max_salary) : Infinity;

  let isValid = true;
  let status = 'VALID';
  let message = 'Mức lương đề xuất nằm trong khung công ty đã duyệt.';

  if (proposed < min) {
    isValid = false;
    status = 'BELOW_MINIMUM';
    message = `Mức lương đề xuất (${proposed.toLocaleString()} VNĐ) thấp hơn mức tối thiểu đã duyệt (${min.toLocaleString()} VNĐ).`;
  } else if (proposed > max) {
    isValid = false;
    status = 'EXCEEDS_MAXIMUM';
    message = `Mức lương đề xuất (${proposed.toLocaleString()} VNĐ) vượt trần khung lương duyệt (${max.toLocaleString()} VNĐ). Cần xin phê duyệt ngoại lệ!`;
  }

  return {
    is_valid: isValid,
    status,
    message,
    position: {
      position_id: position.position_id,
      position_code: position.position_code,
      position_name: position.position_name,
      min_salary: position.min_salary,
      max_salary: position.max_salary,
    },
    proposed_salary: proposed,
  };
}

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  validateOfferSalary,
};
