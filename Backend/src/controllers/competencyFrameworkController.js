const service = require('../services/competencyFrameworkService');
const { sendSuccess } = require('../utils/response');

async function getAll(req, res, next) {
    try {
        const data = await service.getAll();

        return sendSuccess(
            res,
            'Competency frameworks retrieved successfully.',
            data
        );

    } catch (error) {
        next(error);
    }
}

async function getById(req, res, next) {
    try {
        const data = await service.getById(req.params.id);

        return sendSuccess(
            res,
            'Competency framework retrieved successfully.',
            data
        );

    } catch (error) {
        next(error);
    }
}

async function create(req, res, next) {
    try {
        const data = await service.create(req.body);

        return sendSuccess(
            res,
            'Competency framework created successfully.',
            data,
            201
        );

    } catch (error) {
        next(error);
    }
}

async function update(req, res, next) {
    try {
        const data = await service.update(
            req.params.id,
            req.body
        );

        return sendSuccess(
            res,
            'Competency framework updated successfully.',
            data
        );

    } catch (error) {
        next(error);
    }
}

async function remove(req, res, next) {
    try {
        await service.remove(req.params.id);

        return sendSuccess(
            res,
            'Competency framework deleted successfully.'
        );

    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};