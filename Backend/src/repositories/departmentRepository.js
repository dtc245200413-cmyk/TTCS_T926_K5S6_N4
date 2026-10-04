/**
 * departmentRepository.js
 * Database queries for department management.
 */

const { pool } = require('../config/database');

/**
 * Get all departments.
 * Includes parent department and manager information.
 */
async function getAll() {
    const sql = `
        SELECT
            d.department_id,
            d.department_code,
            d.department_name,
            d.description,
            d.parent_department_id,
            d.manager_user_id,
            d.created_at,

            parent.department_name AS parent_department_name,

            manager.full_name AS manager_name,
            manager.company_email AS manager_email

        FROM departments d

        LEFT JOIN departments parent
            ON d.parent_department_id = parent.department_id

        LEFT JOIN users manager
            ON d.manager_user_id = manager.user_id

        ORDER BY d.department_id ASC
    `;

    const [rows] = await pool.execute(sql);
    return rows;
}

/**
 * Find a department by ID.
 */
async function findById(departmentId) {
    const sql = `
        SELECT
            d.department_id,
            d.department_code,
            d.department_name,
            d.description,
            d.parent_department_id,
            d.manager_user_id,
            d.created_at,

            parent.department_name AS parent_department_name,

            manager.full_name AS manager_name,
            manager.company_email AS manager_email

        FROM departments d

        LEFT JOIN departments parent
            ON d.parent_department_id = parent.department_id

        LEFT JOIN users manager
            ON d.manager_user_id = manager.user_id

        WHERE d.department_id = ?
        LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [departmentId]);

    return rows.length > 0 ? rows[0] : null;
}

/**
 * Find a department by department code.
 */
async function findByCode(departmentCode) {
    const sql = `
        SELECT
            department_id,
            department_code,
            department_name,
            description,
            parent_department_id,
            manager_user_id,
            created_at

        FROM departments

        WHERE department_code = ?
        LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [departmentCode]);

    return rows.length > 0 ? rows[0] : null;
}

/**
 * Create a new department.
 */
async function create({
    departmentCode,
    departmentName,
    description,
    parentDepartmentId,
    managerUserId
}) {
    const sql = `
        INSERT INTO departments (
            department_code,
            department_name,
            description,
            parent_department_id,
            manager_user_id
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(sql, [
        departmentCode,
        departmentName,
        description || null,
        parentDepartmentId || null,
        managerUserId || null
    ]);

    return result.insertId;
}

/**
 * Update an existing department.
 */
async function update(
    departmentId,
    {
        departmentCode,
        departmentName,
        description,
        parentDepartmentId,
        managerUserId
    }
) {
    const sql = `
        UPDATE departments
        SET
            department_code = ?,
            department_name = ?,
            description = ?,
            parent_department_id = ?,
            manager_user_id = ?

        WHERE department_id = ?
    `;

    const [result] = await pool.execute(sql, [
        departmentCode,
        departmentName,
        description || null,
        parentDepartmentId || null,
        managerUserId || null,
        departmentId
    ]);

    return result.affectedRows;
}

/**
 * Check whether a department has recruitment requests.
 *
 * Used by SCRUM-95:
 * A department cannot be deleted if it has job requisitions.
 */
async function hasJobRequisitions(departmentId) {
    const sql = `
        SELECT COUNT(*) AS total
        FROM job_requisitions
        WHERE department_id = ?
    `;

    const [rows] = await pool.execute(sql, [departmentId]);

    return Number(rows[0].total) > 0;
}

/**
 * Delete a department.
 *
 * The service layer must check hasJobRequisitions()
 * before calling this function.
 */
async function remove(departmentId) {
    const sql = `
        DELETE FROM departments
        WHERE department_id = ?
    `;

    const [result] = await pool.execute(sql, [departmentId]);

    return result.affectedRows;
}

module.exports = {
    getAll,
    findById,
    findByCode,
    create,
    update,
    hasJobRequisitions,
    remove
};