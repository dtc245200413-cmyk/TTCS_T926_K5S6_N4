/**
 * departmentService.js
 * Business logic for department management.
 */

const departmentRepository = require('../repositories/departmentRepository');

/**
 * Create an Error with HTTP status code.
 */
function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

/**
 * Get all departments.
 */
async function getAllDepartments() {
    return departmentRepository.getAll();
}

/**
 * Get a department by ID.
 */
async function getDepartmentById(departmentId) {
    const department = await departmentRepository.findById(departmentId);

    if (!department) {
        throw createError('Không tìm thấy phòng ban', 404);
    }

    return department;
}

/**
 * Create a department.
 */
async function createDepartment(data) {
    const {
        departmentCode,
        departmentName,
        description,
        parentDepartmentId,
        managerUserId
    } = data;

    // Required fields
    if (!departmentCode || !departmentName) {
        throw createError(
            'Mã phòng ban và tên phòng ban là bắt buộc',
            400
        );
    }

    // Check duplicate department code
    const existingDepartment =
        await departmentRepository.findByCode(departmentCode);

    if (existingDepartment) {
        throw createError(
            'Mã phòng ban đã tồn tại',
            409
        );
    }

    // Parent department cannot be itself
    if (
        parentDepartmentId &&
        Number(parentDepartmentId) === Number(data.departmentId)
    ) {
        throw createError(
            'Phòng ban không thể là phòng ban cha của chính nó',
            400
        );
    }

    // If parent department is provided, it must exist
    if (parentDepartmentId) {
        const parentDepartment =
            await departmentRepository.findById(parentDepartmentId);

        if (!parentDepartment) {
            throw createError(
                'Phòng ban cha không tồn tại',
                404
            );
        }
    }

    const departmentId = await departmentRepository.create({
        departmentCode,
        departmentName,
        description,
        parentDepartmentId,
        managerUserId
    });

    return departmentRepository.findById(departmentId);
}

/**
 * Update a department.
 */
async function updateDepartment(departmentId, data) {
    const existingDepartment =
        await departmentRepository.findById(departmentId);

    if (!existingDepartment) {
        throw createError(
            'Không tìm thấy phòng ban',
            404
        );
    }

    const {
        departmentCode,
        departmentName,
        description,
        parentDepartmentId,
        managerUserId
    } = data;

    // Required fields
    if (!departmentCode || !departmentName) {
        throw createError(
            'Mã phòng ban và tên phòng ban là bắt buộc',
            400
        );
    }

    // Check duplicate department code
    const departmentWithSameCode =
        await departmentRepository.findByCode(departmentCode);

    if (
        departmentWithSameCode &&
        Number(departmentWithSameCode.department_id) !== Number(departmentId)
    ) {
        throw createError(
            'Mã phòng ban đã tồn tại',
            409
        );
    }

    // Department cannot be its own parent
    if (
        parentDepartmentId &&
        Number(parentDepartmentId) === Number(departmentId)
    ) {
        throw createError(
            'Phòng ban không thể là phòng ban cha của chính nó',
            400
        );
    }

    // If parent department is provided, it must exist
    if (parentDepartmentId) {
        const parentDepartment =
            await departmentRepository.findById(parentDepartmentId);

        if (!parentDepartment) {
            throw createError(
                'Phòng ban cha không tồn tại',
                404
            );
        }
    }

    await departmentRepository.update(
        departmentId,
        {
            departmentCode,
            departmentName,
            description,
            parentDepartmentId,
            managerUserId
        }
    );

    return departmentRepository.findById(departmentId);
}

/**
 * Delete a department.
 *
 * SCRUM-95:
 * A department cannot be deleted if it has
 * recruitment requests in job_requisitions.
 */
async function deleteDepartment(departmentId) {
    // Check department exists
    const existingDepartment =
        await departmentRepository.findById(departmentId);

    if (!existingDepartment) {
        throw createError(
            'Không tìm thấy phòng ban',
            404
        );
    }

    // SCRUM-95 business rule
    const hasRequisitions =
        await departmentRepository.hasJobRequisitions(departmentId);

    if (hasRequisitions) {
        throw createError(
            'Không thể xóa phòng ban vì phòng ban đang có yêu cầu tuyển dụng',
            409
        );
    }

    // Delete department
    const affectedRows =
        await departmentRepository.remove(departmentId);

    if (affectedRows === 0) {
        throw createError(
            'Xóa phòng ban thất bại',
            400
        );
    }

    return {
        message: 'Xóa phòng ban thành công'
    };
}

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};