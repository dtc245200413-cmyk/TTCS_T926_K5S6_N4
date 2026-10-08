/**
 * competencyService.js
 * Business logic for Competency criteria management.
 */

const competencyRepository = require('../repositories/competencyRepository');
const auditRepository      = require('../repositories/auditRepository');

/** Create an Error with an attached HTTP status code */
function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Get all competencies.
 */
async function getAllCompetencies() {
  return await competencyRepository.findAll();
}

/**
 * Get competency by ID.
 */
async function getCompetencyById(id) {
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    throw createError('ID tiêu chí năng lực không hợp lệ.', 400);
  }

  const item = await competencyRepository.findById(parsedId);
  if (!item) {
    throw createError(`Không tìm thấy tiêu chí năng lực với ID ${parsedId}.`, 404);
  }

  return item;
}

/**
 * Create a new competency.
 */
async function createCompetency(data, userId = null, ipAddress = null) {
  const { name, description } = data;

  if (!name || !name.trim()) {
    throw createError('Tên tiêu chí năng lực không được để trống.', 400);
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    throw createError('Tên tiêu chí năng lực phải có ít nhất 2 ký tự.', 400);
  }

  if (trimmedName.length > 150) {
    throw createError('Tên tiêu chí năng lực không được vượt quá 150 ký tự.', 400);
  }

  // Check duplicate name
  const existing = await competencyRepository.findByName(trimmedName);
  if (existing) {
    throw createError(`Tiêu chí năng lực "${trimmedName}" đã tồn tại trên hệ thống.`, 409);
  }

  const newId = await competencyRepository.create({
    name: trimmedName,
    description: description ? description.trim() : null
  });

  // Audit log
  try {
    await auditRepository.createLog({
      userId: null,
      performedBy: userId,
      action: 'COMPETENCY_CREATE',
      entityType: 'competencies',
      entityId: String(newId),
      description: `Đã tạo mới tiêu chí năng lực: "${trimmedName}" (ID: ${newId})`,
      ipAddress
    });
  } catch (err) {
    console.error('Audit log failed for COMPETENCY_CREATE:', err.message);
  }

  return await competencyRepository.findById(newId);
}

module.exports = {
  getAllCompetencies,
  getCompetencyById,
  createCompetency
};
