/**
 * positionController.js
 * Controller for Job Positions & Salary Range endpoints (SCRUM-62 / SCRUM-98).
 */

const positionService = require('../services/positionService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Check if the current authenticated user has HR Manager or Admin role
 */
function isUserHrManager(req) {
  if (!req.user || !req.user.roles) return false;
  return req.user.roles.some((r) =>
    ['ADMIN', 'HR_MANAGER', 'HR_DIRECTOR'].includes(r.role_code)
  );
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
    const filters = {
      search: req.query.search,
      level: req.query.level,
      status: req.query.status,
    };
    const positions = await positionService.getAllPositions(filters);
    const isHrMgr = isUserHrManager(req);

    // Apply security rule: Chỉ Trưởng phòng Nhân sự xem được dải lương
    const sanitized = positions.map((p) => maskPositionSalary(p, isHrMgr));

    return sendSuccess(res, 'Lấy danh sách chức danh thành công.', sanitized);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/positions/:id
 */
const getPositionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const position = await positionService.getPositionById(id);
    const isHrMgr = isUserHrManager(req);

    return sendSuccess(
      res,
      'Lấy thông tin chức danh thành công.',
      maskPositionSalary(position, isHrMgr)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/positions
 * Create a new position (Requires HR Manager or Admin)
 */
const createPosition = async (req, res, next) => {
  try {
    const newPos = await positionService.createPosition(req.body);
    return sendSuccess(res, 'Tạo chức danh và dải lương thành công.', newPos, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/positions/:id
 * Update an existing position
 */
const updatePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await positionService.updatePosition(id, req.body);
    return sendSuccess(res, 'Cập nhật chức danh thành công.', updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/positions/:id
 * Delete a position
 */
const deletePosition = async (req, res, next) => {
  try {
    const { id } = req.params;
    await positionService.deletePosition(id);
    return sendSuccess(res, 'Xóa chức danh thành công.');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/positions/:id/validate-offer
 * Validate if proposed salary is within the approved range (SCRUM-62 / SCRUM-98)
 */
const validateOffer = async (req, res, next) => {
  try {
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
