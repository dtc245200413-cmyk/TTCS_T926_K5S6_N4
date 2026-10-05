const { pool } = require('../config/database');
const repository = require('../repositories/competencyFrameworkRepository');

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function validateCriteria(criteria) {
    if (!Array.isArray(criteria) || criteria.length === 0) {
        throw createError(
            'Framework must contain at least one criterion.',
            400
        );
    }

    let totalWeight = 0;

    for (const item of criteria) {
        if (!item.criteria_name || !item.criteria_name.trim()) {
            throw createError(
                'Criteria name is required.',
                400
            );
        }

        const weight = Number(item.weight);

        if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
            throw createError(
                `Invalid weight for criterion '${item.criteria_name}'. Weight must be between 0 and 100.`,
                400
            );
        }

        totalWeight += weight;
    }

    totalWeight = Number(totalWeight.toFixed(2));

    if (totalWeight !== 100) {
        throw createError(
            `Total criteria weight must equal 100%. Current total: ${totalWeight}%.`,
            400
        );
    }
}

async function getAll() {
    return repository.getAll();
}

async function getById(id) {
    const framework = await repository.findById(id);

    if (!framework) {
        throw createError('Competency framework not found.', 404);
    }

    return framework;
}

async function create(data) {
    const {
        framework_code,
        framework_name,
        description,
        criteria
    } = data;

    if (!framework_code || !framework_name) {
        throw createError(
            'framework_code and framework_name are required.',
            400
        );
    }

    const existing = await repository.findByCode(framework_code);

    if (existing) {
        throw createError(
            `Framework code '${framework_code}' already exists.`,
            409
        );
    }

    validateCriteria(criteria);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const frameworkId = await repository.create(
            connection,
            {
                framework_code,
                framework_name,
                description
            },
            criteria
        );

        await connection.commit();

        return repository.findById(frameworkId);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

async function update(id, data) {
    const existing = await repository.findById(id);

    if (!existing) {
        throw createError(
            'Competency framework not found.',
            404
        );
    }

    const {
        framework_name,
        description,
        criteria
    } = data;

    if (!framework_name) {
        throw createError(
            'framework_name is required.',
            400
        );
    }

    validateCriteria(criteria);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await repository.update(
            connection,
            id,
            {
                framework_name,
                description
            },
            criteria
        );

        await connection.commit();

        return repository.findById(id);

    } catch (error) {
        await connection.rollback();
        throw error;

    } finally {
        connection.release();
    }
}

async function remove(id) {
    const existing = await repository.findById(id);

    if (!existing) {
        throw createError(
            'Competency framework not found.',
            404
        );
    }

    return repository.deleteById(id);
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};