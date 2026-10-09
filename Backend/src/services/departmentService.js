/**
 * departmentService.js
 * Business logic for department management.
 */

const departmentRepository = require('../repositories/departmentRepository');
const auditRepository = require('../repositories/auditRepository');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Convert flat department list to tree structure.
 */
function buildDepartmentTree(departments) {
  const map = new Map();
  const roots = [];

  for (const department of departments) {
    map.set(department.department_id, {
      ...department,
      children: [],
    });
  }

  for (const department of map.values()) {
    if (
      department.parent_department_id &&
      map.has(department.parent_department_id)
    ) {
      map
        .get(department.parent_department_id)
        .children.push(department);
    } else {
      roots.push(department);
    }
  }

  return roots;
}

/**
 * Get department hierarchy.
 */
async function getAllDepartments() {
  const departments = await departmentRepository.getAll();

  return {
    departments,
    tree: buildDepartmentTree(departments),
  };
}

/**
 * Get one department.
 */
async function getDepartmentById(departmentId) {
  const department = await departmentRepository.findById(departmentId);

  if (!department) {
    throw createError('Department not found.', 404);
  }

  return department;
}

/**
 * Validate selected manager.
 */
async function validateManager(managerUserId) {
  if (managerUserId === null || managerUserId === undefined || managerUserId === '') {
    return null;
  }

  const managerId = parseInt(managerUserId, 10);

  if (isNaN(managerId)) {
    throw createError('manager_user_id must be a valid number.', 400);
  }

  const exists = await departmentRepository.managerExists(managerId);

  if (!exists) {
    throw createError('Selected manager does not exist.', 400);
  }

  return managerId;
}

/**
 * Validate parent department.
 */
async function validateParent(parentDepartmentId, currentDepartmentId = null) {
  if (
    parentDepartmentId === null ||
    parentDepartmentId === undefined ||
    parentDepartmentId === ''
  ) {
    return null;
  }

  const parentId = parseInt(parentDepartmentId, 10);

  if (isNaN(parentId)) {
    throw createError('parent_department_id must be a valid number.', 400);
  }

  if (
    currentDepartmentId !== null &&
    parentId === currentDepartmentId
  ) {
    throw createError(
      'A department cannot be its own parent.',
      400
    );
  }

  const parent = await departmentRepository.findById(parentId);

  if (!parent) {
    throw createError('Parent department does not exist.', 400);
  }

  /*
   * Prevent circular hierarchy:
   *
   * Example:
   * A -> B -> C
   * Cannot update A so that parent = C.
   */
  if (currentDepartmentId !== null) {
    const allDepartments = await departmentRepository.getAll();

    const parentMap = new Map();

    for (const department of allDepartments) {
      parentMap.set(
        department.department_id,
        department.parent_department_id
      );
    }

    let cursor = parentId;

    while (cursor !== null && cursor !== undefined) {
      if (cursor === currentDepartmentId) {
        throw createError(
          'Invalid hierarchy. This change would create a circular department structure.',
          400
        );
      }

      cursor = parentMap.get(cursor) ?? null;
    }
  }

  return parentId;
}

/**
 * Create department.
 */
async function createDepartment(data, performedByUserId, ipAddress) {
  const {
    department_code,
    department_name,
    description,
    parent_department_id,
    manager_user_id,
  } = data;

  if (!department_code || String(department_code).trim() === '') {
    throw createError('department_code is required.', 400);
  }

  if (!department_name || String(department_name).trim() === '') {
    throw createError('department_name is required.', 400);
  }

  const code = String(department_code).trim().toUpperCase();
  const name = String(department_name).trim();

  const codeTaken = await departmentRepository.codeExists(code);

  if (codeTaken) {
    throw createError('Department code already exists.', 409);
  }

  const parentId = await validateParent(parent_department_id);
  const managerId = await validateManager(manager_user_id);

  const newDepartmentId = await departmentRepository.create({
    departmentCode: code,
    departmentName: name,
    description:
      description === undefined || description === ''
        ? null
        : description,
    parentDepartmentId: parentId,
    managerUserId: managerId,
    status: 'ACTIVE',
  });

  await auditRepository.createLog({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'DEPARTMENT_CREATED',
    entityType: 'departments',
    entityId: String(newDepartmentId),
    description: `Department '${name}' (${code}) created.`,
    ipAddress,
  });

  return getDepartmentById(newDepartmentId);
}

/**
 * Update department.
 */
async function updateDepartment(
  departmentId,
  data,
  performedByUserId,
  ipAddress
) {
  const existing = await departmentRepository.findById(departmentId);

  if (!existing) {
    throw createError('Department not found.', 404);
  }

  const fields = {};

  if (data.department_code !== undefined) {
    const code = String(data.department_code).trim().toUpperCase();

    if (!code) {
      throw createError('department_code cannot be empty.', 400);
    }

    const codeTaken = await departmentRepository.codeExists(
      code,
      departmentId
    );

    if (codeTaken) {
      throw createError('Department code already exists.', 409);
    }

    fields.department_code = code;
  }

  if (data.department_name !== undefined) {
    const name = String(data.department_name).trim();

    if (!name) {
      throw createError('department_name cannot be empty.', 400);
    }

    fields.department_name = name;
  }

  if (data.description !== undefined) {
    fields.description =
      data.description === '' ? null : data.description;
  }

  if (data.parent_department_id !== undefined) {
    fields.parent_department_id = await validateParent(
      data.parent_department_id,
      departmentId
    );
  }

  if (data.manager_user_id !== undefined) {
    fields.manager_user_id = await validateManager(
      data.manager_user_id
    );
  }

  if (data.status !== undefined) {
    const status = String(data.status).toUpperCase();

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw createError(
        'status must be ACTIVE or INACTIVE.',
        400
      );
    }

    fields.status = status;
  }

  if (Object.keys(fields).length === 0) {
    throw createError(
      'No valid fields provided to update.',
      400
    );
  }

  await departmentRepository.update(departmentId, fields);

  await auditRepository.createLog({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'departments',
    entityId: String(departmentId),
    description: `Department updated. Fields changed: ${Object.keys(fields).join(', ')}.`,
    ipAddress,
  });

  return getDepartmentById(departmentId);
}

/**
 * Deactivate department.
 */
async function deactivateDepartment(
  departmentId,
  performedByUserId,
  ipAddress
) {
  const department =
    await departmentRepository.findById(departmentId);

  if (!department) {
    throw createError('Department not found.', 404);
  }

  if (department.status === 'INACTIVE') {
    throw createError(
      'Department is already inactive.',
      409
    );
  }

  await departmentRepository.updateStatus(
    departmentId,
    'INACTIVE'
  );

  await auditRepository.createLog({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'DEPARTMENT_DEACTIVATED',
    entityType: 'departments',
    entityId: String(departmentId),
    description: `Department '${department.department_name}' deactivated.`,
    ipAddress,
  });

  return getDepartmentById(departmentId);
}

/**
 * Reactivate department.
 */
async function activateDepartment(
  departmentId,
  performedByUserId,
  ipAddress
) {
  const department =
    await departmentRepository.findById(departmentId);

  if (!department) {
    throw createError('Department not found.', 404);
  }

  if (department.status === 'ACTIVE') {
    throw createError(
      'Department is already active.',
      409
    );
  }

  await departmentRepository.updateStatus(
    departmentId,
    'ACTIVE'
  );

  await auditRepository.createLog({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'DEPARTMENT_ACTIVATED',
    entityType: 'departments',
    entityId: String(departmentId),
    description: `Department '${department.department_name}' activated.`,
    ipAddress,
  });

  return getDepartmentById(departmentId);
}

/**
 * Delete department.
 */
async function deleteDepartment(
  departmentId,
  performedByUserId,
  ipAddress
) {
  const department =
    await departmentRepository.findById(departmentId);

  if (!department) {
    throw createError('Department not found.', 404);
  }

  const childCount =
    await departmentRepository.countChildren(departmentId);

  if (childCount > 0) {
    throw createError(
      'Cannot delete a department that still has child departments.',
      409
    );
  }

  const activeRequisitionCount =
    await departmentRepository.countActiveRequisitions(
      departmentId
    );

  if (activeRequisitionCount > 0) {
    throw createError(
      `Cannot delete this department because it has ${activeRequisitionCount} open recruitment requisition(s). Please deactivate the department instead.`,
      409
    );
  }

  /*
   * Database foreign key uses ON DELETE RESTRICT.
   * Therefore even CLOSED/REJECTED historical requisitions
   * must be preserved.
   */
  const allRequisitionCount =
    await departmentRepository.countAllRequisitions(
      departmentId
    );

  if (allRequisitionCount > 0) {
    throw createError(
      'Cannot permanently delete this department because recruitment history exists. Please deactivate the department instead.',
      409
    );
  }

  await departmentRepository.remove(departmentId);

  await auditRepository.createLog({
    userId: performedByUserId,
    performedBy: performedByUserId,
    action: 'DEPARTMENT_DELETED',
    entityType: 'departments',
    entityId: String(departmentId),
    description: `Department '${department.department_name}' deleted.`,
    ipAddress,
  });

  return {
    department_id: departmentId,
    deleted: true,
  };
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  activateDepartment,
  deleteDepartment,
};