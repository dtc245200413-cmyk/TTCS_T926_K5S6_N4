/**
 * jobPositionService.js
 * Business logic for job positions.
 */

const jobPositionRepo = require('../repositories/jobPositionRepository');
const auditRepo = require('../repositories/auditRepository');

async function getAllPositions(query) {
  const data = await jobPositionRepo.getAll(query);
  const total = await jobPositionRepo.countAll(query);
  const limit = parseInt(query.limit, 10) || 20;
  const page = parseInt(query.page, 10) || 1;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getPositionById(id) {
  const position = await jobPositionRepo.findById(id);
  if (!position) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  return position;
}

async function createPosition(data, performedByUserId, ipAddress) {
  const { positionCode, positionName, positionLevel, minSalary, maxSalary, description } = data;

  if (!positionCode || !positionName) {
    const error = new Error('Mã và Tên chức danh là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  // Check unique code
  const existing = await jobPositionRepo.findByCode(positionCode);
  if (existing) {
    const error = new Error('Mã chức danh đã tồn tại.');
    error.statusCode = 400;
    throw error;
  }

  // Validate salary
  if (minSalary && maxSalary && Number(minSalary) > Number(maxSalary)) {
    const error = new Error('Mức lương tối thiểu không được lớn hơn tối đa.');
    error.statusCode = 400;
    throw error;
  }

  const insertId = await jobPositionRepo.create({
    positionCode,
    positionName,
    positionLevel,
    minSalary,
    maxSalary,
    description
  });

  const newPosition = await jobPositionRepo.findById(insertId);

  // Audit
  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'JOB_POSITION_CREATED',
    entityType: 'job_positions',
    entityId: String(insertId),
    description: `Created job position: ${positionCode}`,
    ipAddress
  });

  return newPosition;
}

async function updatePosition(id, data, performedByUserId, ipAddress) {
  const position = await jobPositionRepo.findById(id);
  if (!position) {
    const error = new Error('Chức danh không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const { position_name, position_level, min_salary, max_salary, description, status } = data;

  // Validate salary
  const min = min_salary !== undefined ? min_salary : position.min_salary;
  const max = max_salary !== undefined ? max_salary : position.max_salary;
  
  if (min && max && Number(min) > Number(max)) {
    const error = new Error('Mức lương tối thiểu không được lớn hơn tối đa.');
    error.statusCode = 400;
    throw error;
  }

  const fields = {};
  if (position_name !== undefined) fields.position_name = position_name;
  if (position_level !== undefined) fields.position_level = position_level;
  if (min_salary !== undefined) fields.min_salary = min_salary;
  if (max_salary !== undefined) fields.max_salary = max_salary;
  if (description !== undefined) fields.description = description;
  if (status !== undefined) fields.status = status;

  await jobPositionRepo.update(id, fields);

  const updatedPosition = await jobPositionRepo.findById(id);

  // Audit
  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'JOB_POSITION_UPDATED',
    entityType: 'job_positions',
    entityId: String(id),
    description: `Updated job position: ${position.position_code}`,
    ipAddress
  });

  return updatedPosition;
}

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition
};
