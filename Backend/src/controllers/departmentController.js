/**
 * departmentController.js
 * HTTP handlers for department management.
 */

const departmentService = require('../services/departmentService');
const { sendSuccess, sendError } = require('../utils/response');

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

const getAllDepartments = async (req, res, next) => {
  try {
    const result = await departmentService.getAllDepartments();

    return sendSuccess(
      res,
      'Departments retrieved successfully.',
      result
    );
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      return sendError(
        res,
        'Department ID must be a valid number.',
        400
      );
    }

    const department =
      await departmentService.getDepartmentById(departmentId);

    return sendSuccess(
      res,
      'Department retrieved successfully.',
      department
    );
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const department =
      await departmentService.createDepartment(
        req.body,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Department created successfully.',
      department,
      201
    );
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      return sendError(
        res,
        'Department ID must be a valid number.',
        400
      );
    }

    const department =
      await departmentService.updateDepartment(
        departmentId,
        req.body,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Department updated successfully.',
      department
    );
  } catch (error) {
    next(error);
  }
};

const deactivateDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      return sendError(
        res,
        'Department ID must be a valid number.',
        400
      );
    }

    const department =
      await departmentService.deactivateDepartment(
        departmentId,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Department deactivated successfully.',
      department
    );
  } catch (error) {
    next(error);
  }
};

const activateDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      return sendError(
        res,
        'Department ID must be a valid number.',
        400
      );
    }

    const department =
      await departmentService.activateDepartment(
        departmentId,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Department activated successfully.',
      department
    );
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id, 10);

    if (isNaN(departmentId)) {
      return sendError(
        res,
        'Department ID must be a valid number.',
        400
      );
    }

    const result =
      await departmentService.deleteDepartment(
        departmentId,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Department deleted successfully.',
      result
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  activateDepartment,
  deleteDepartment,
};