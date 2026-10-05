const { pool } = require('../config/database');

async function getAll() {
    const [rows] = await pool.execute(`
        SELECT
            framework_id,
            framework_code,
            framework_name,
            description,
            created_at,
            updated_at
        FROM competency_frameworks
        ORDER BY framework_id DESC
    `);

    return rows;
}

async function findById(frameworkId) {
    const [frameworkRows] = await pool.execute(`
        SELECT
            framework_id,
            framework_code,
            framework_name,
            description,
            created_at,
            updated_at
        FROM competency_frameworks
        WHERE framework_id = ?
        LIMIT 1
    `, [frameworkId]);

    if (frameworkRows.length === 0) {
        return null;
    }

    const [criteriaRows] = await pool.execute(`
        SELECT
            criteria_id,
            framework_id,
            criteria_name,
            weight,
            description,
            created_at
        FROM competency_criteria
        WHERE framework_id = ?
        ORDER BY criteria_id ASC
    `, [frameworkId]);

    return {
        ...frameworkRows[0],
        criteria: criteriaRows
    };
}

async function findByCode(frameworkCode) {
    const [rows] = await pool.execute(`
        SELECT *
        FROM competency_frameworks
        WHERE framework_code = ?
        LIMIT 1
    `, [frameworkCode]);

    return rows.length ? rows[0] : null;
}

async function create(connection, framework, criteria) {
    const [result] = await connection.execute(`
        INSERT INTO competency_frameworks
        (framework_code, framework_name, description)
        VALUES (?, ?, ?)
    `, [
        framework.framework_code,
        framework.framework_name,
        framework.description || null
    ]);

    const frameworkId = result.insertId;

    for (const item of criteria) {
        await connection.execute(`
            INSERT INTO competency_criteria
            (framework_id, criteria_name, weight, description)
            VALUES (?, ?, ?, ?)
        `, [
            frameworkId,
            item.criteria_name,
            item.weight,
            item.description || null
        ]);
    }

    return frameworkId;
}

async function update(connection, frameworkId, framework, criteria) {
    await connection.execute(`
        UPDATE competency_frameworks
        SET framework_name = ?,
            description = ?
        WHERE framework_id = ?
    `, [
        framework.framework_name,
        framework.description || null,
        frameworkId
    ]);

    await connection.execute(`
        DELETE FROM competency_criteria
        WHERE framework_id = ?
    `, [frameworkId]);

    for (const item of criteria) {
        await connection.execute(`
            INSERT INTO competency_criteria
            (framework_id, criteria_name, weight, description)
            VALUES (?, ?, ?, ?)
        `, [
            frameworkId,
            item.criteria_name,
            item.weight,
            item.description || null
        ]);
    }
}

async function deleteById(frameworkId) {
    const [result] = await pool.execute(`
        DELETE FROM competency_frameworks
        WHERE framework_id = ?
    `, [frameworkId]);

    return result.affectedRows > 0;
}

module.exports = {
    getAll,
    findById,
    findByCode,
    create,
    update,
    deleteById
};