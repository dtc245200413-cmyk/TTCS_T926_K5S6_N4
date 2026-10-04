/**
 * departmentController.js
 * HTTP controllers for department management.
 */

const departmentService = require('../services/departmentService');

/**
 * GET /api/departments
 * Get all departments.
 */
const getAllDepartments = async (req, res, next) => {
    try {
        const departments =
            await departmentService.getAllDepartments();

        res.status(200).json({
            success: true,
            data: departments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/departments/:id
 * Get department by ID.
 */
const getDepartmentById = async (req, res, next) => {
    try {
        const department =
            await departmentService.getDepartmentById(
                req.params.id
            );

        res.status(200).json({
            success: true,
            data: department
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/departments
 * Create a new department.
 */
const createDepartment = async (req, res, next) => {
    try {
        const department =
            await departmentService.createDepartment(
                req.body
            );

        res.status(201).json({
            success: true,
            message: 'Tạo phòng ban thành công',
            data: department
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/departments/:id
 * Update a department.
 */
const updateDepartment = async (req, res, next) => {
    try {
        const department =
            await departmentService.updateDepartment(
                req.params.id,
                req.body
            );

        res.status(200).json({
            success: true,
            message: 'Cập nhật phòng ban thành công',
            data: department
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/departments/:id
 * Delete a department.
 */
const deleteDepartment = async (req, res, next) => {
    try {
        const result =
            await departmentService.deleteDepartment(
                req.params.id
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
