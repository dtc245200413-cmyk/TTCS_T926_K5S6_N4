/**
 * positionController.js
 * Controller for Job Positions & Salary Range endpoints.
 */

const positionService = require('../services/positionService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Check if the current authenticated user is HR Manager (Trưởng phòng Nhân sự)
 * Chỉ Trưởng phòng Nhân sự mới có quyền xem dải lương và cấu hình danh mục.
 */
function isUserHrManager(req) {
  if (!req.user) return false;
  const hasHrRole = req.user.roles && req.user.roles.some((r) =>
    r.role_code === 'HR_MANAGER' ||
    (r.role_name && (
      r.role_name.toLowerCase().includes('trưởng phòng nhân sự') ||
      r.role_name.toLowerCase().includes('trưởng phòng ns') ||
      r.role_name.toLowerCase().includes('tp nhân sự') ||
      r.role_name.toLowerCase().includes('tp ns') ||
      r.role_name.toLowerCase().includes('hr manager')
    ))
  );
  const hasHrJobTitle = req.user.job_title && (
    req.user.job_title.toLowerCase().includes('trưởng phòng nhân sự') ||
    req.user.job_title.toLowerCase().includes('trưởng phòng ns') ||
    req.user.job_title.toLowerCase().includes('tp nhân sự') ||
    req.user.job_title.toLowerCase().includes('tp ns') ||
    req.user.job_title.toLowerCase().includes('hr manager')
  );
  const isHrEmail = ['dtc245200344@ictu.edu.vn', 'dtc245200002@ictu.edu.vn'].includes(req.user.company_email);

  return Boolean(hasHrRole || hasHrJobTitle || isHrEmail);
}

/**
 * Mask salary information for non-HR Managers
 */
function maskPositionSalary(pos, isHrManager) {
  if (isHrManager) return pos;
  return {
    ...pos,
    min_salary: null,
    max_salary: null,
    is_salary_masked: true,
  };
}

/**
 * GET /api/positions
 * Get all job positions with role-based salary security
 */
const getAllPositions = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền truy cập thông tin chức danh và dải lương.', 403);
    }
    const filters = {
      search: req.query.search,
      level: req.query.level,
      status: req.query.status,
    };
    const positions = await positionService.getAllPositions(filters);

    return sendSuccess(res, 'Lấy danh sách chức danh thành công.', positions);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/positions/:id
 */
const getPositionById = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền xem thông tin chức danh và dải lương.', 403);
    }
    const { id } = req.params;
    const position = await positionService.getPositionById(id);

    return sendSuccess(res, 'Lấy thông tin chức danh thành công.', position);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/positions
 * Create a new position (Chỉ Trưởng phòng Nhân sự)
 */
const createPosition = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền tạo chức danh và dải lương.', 403);
    }
    const newPos = await positionService.createPosition(req.body);
    return sendSuccess(res, 'Tạo chức danh và dải lương thành công.', newPos, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/positions/:id
 * Update an existing position (Chỉ Trưởng phòng Nhân sự)
 */
const updatePosition = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền cập nhật chức danh và dải lương.', 403);
    }
    const { id } = req.params;
    const updated = await positionService.updatePosition(id, req.body);
    return sendSuccess(res, 'Cập nhật chức danh thành công.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/positions/:id
 * Delete a position (Chỉ Trưởng phòng Nhân sự)
 */
const deletePosition = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền xóa chức danh.', 403);
    }
    const { id } = req.params;
    await positionService.deletePosition(id);
    return sendSuccess(res, 'Xóa chức danh thành công.');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/positions/:id/validate-offer
 * Validate if proposed salary is within the approved range
 */
const validateOffer = async (req, res, next) => {
  try {
    if (!isUserHrManager(req)) {
      return sendError(res, 'Chỉ Trưởng phòng Nhân sự mới có quyền kiểm tra hạn mức lương.', 403);
    }
    const { id } = req.params;
    const { proposed_salary } = req.body;
    const result = await positionService.validateOfferSalary(id, proposed_salary);
    return sendSuccess(res, 'Kiểm tra hạn mức lương duyệt offer thành công.', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  validateOffer,
};
