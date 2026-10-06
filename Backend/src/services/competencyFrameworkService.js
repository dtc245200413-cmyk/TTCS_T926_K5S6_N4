/**
 * competencyFrameworkService.js
 * Business logic for competency frameworks.
 */

const competencyRepo = require('../repositories/competencyFrameworkRepository');
const auditRepo = require('../repositories/auditRepository');

async function getAllFrameworks(query) {
  const data = await competencyRepo.getAll(query);
  const total = await competencyRepo.countAll(query);
  const limit = parseInt(query.limit, 10) || 20;
  const page = parseInt(query.page, 10) || 1;

  // Enhance with criteria list
  for (const framework of data) {
    framework.criteria = await competencyRepo.getCriteriaByFrameworkId(framework.framework_id);
  }

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

async function getFrameworkById(id) {
  const framework = await competencyRepo.findById(id);
  if (!framework) {
    const error = new Error('Khung năng lực không tồn tại.');
    error.statusCode = 404;
    throw error;
  }
  framework.criteria = await competencyRepo.getCriteriaByFrameworkId(id);
  return framework;
}

function validateCriteriaWeights(criteriaList) {
  if (!criteriaList || criteriaList.length === 0) return;
  const totalWeight = criteriaList.reduce((sum, item) => sum + Number(item.weight), 0);
  // Round to 2 decimal places to avoid floating point issues
  const roundedTotal = Math.round(totalWeight * 100) / 100;
  if (roundedTotal !== 100) {
    const error = new Error(`Tổng trọng số của một khung năng lực phải đúng bằng 100%. Hiện tại là ${roundedTotal}%.`);
    error.statusCode = 400;
    throw error;
  }
}

async function createFramework(data, performedByUserId, ipAddress) {
  const { frameworkCode, frameworkName, description, criteriaList } = data;

  if (!frameworkCode || !frameworkName) {
    const error = new Error('Mã và Tên khung năng lực là bắt buộc.');
    error.statusCode = 400;
    throw error;
  }

  const existing = await competencyRepo.findByCode(frameworkCode);
  if (existing) {
    const error = new Error('Mã khung năng lực đã tồn tại.');
    error.statusCode = 400;
    throw error;
  }

  validateCriteriaWeights(criteriaList);

  const insertId = await competencyRepo.createFramework({
    frameworkCode,
    frameworkName,
    description
  }, criteriaList);

  const newFramework = await getFrameworkById(insertId);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'COMPETENCY_FRAMEWORK_CREATED',
    entityType: 'competency_frameworks',
    entityId: String(insertId),
    description: `Created framework: ${frameworkCode}`,
    ipAddress
  });

  return newFramework;
}

async function updateFramework(id, data, performedByUserId, ipAddress) {
  const framework = await competencyRepo.findById(id);
  if (!framework) {
    const error = new Error('Khung năng lực không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  const { framework_name, description, criteriaList } = data;

  if (criteriaList !== undefined) {
    validateCriteriaWeights(criteriaList);
  }

  const fields = {};
  if (framework_name !== undefined) fields.framework_name = framework_name;
  if (description !== undefined) fields.description = description;

  await competencyRepo.updateFramework(id, Object.keys(fields).length > 0 ? fields : null, criteriaList);

  const updatedFramework = await getFrameworkById(id);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'COMPETENCY_FRAMEWORK_UPDATED',
    entityType: 'competency_frameworks',
    entityId: String(id),
    description: `Updated framework: ${framework.framework_code}`,
    ipAddress
  });

  return updatedFramework;
}

async function deleteFramework(id, performedByUserId, ipAddress) {
  const framework = await competencyRepo.findById(id);
  if (!framework) {
    const error = new Error('Khung năng lực không tồn tại.');
    error.statusCode = 404;
    throw error;
  }

  // Handle constraints if it's used in job_positions.
  // database.sql says: CONSTRAINT fk_jp_framework FOREIGN KEY (competency_framework_id) REFERENCES competency_frameworks (framework_id) ON DELETE SET NULL
  // So it's safe to delete.

  await competencyRepo.deleteFramework(id);

  await auditRepo.create({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'COMPETENCY_FRAMEWORK_DELETED',
    entityType: 'competency_frameworks',
    entityId: String(id),
    description: `Deleted framework: ${framework.framework_code}`,
    ipAddress
  });

  return true;
}

module.exports = {
  getAllFrameworks,
  getFrameworkById,
  createFramework,
  updateFramework,
  deleteFramework
};
