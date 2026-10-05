const express = require('express');

const router = express.Router();

const controller =
    require('../controllers/competencyFrameworkController');

const {
    authenticate,
    authorize
} = require('../middleware/authMiddleware');

// HR/Admin hiện có quyền ROLE_VIEW trong database
router.get(
    '/',
    authenticate,
    authorize('ROLE_VIEW'),
    controller.getAll
);

router.get(
    '/:id',
    authenticate,
    authorize('ROLE_VIEW'),
    controller.getById
);

router.post(
    '/',
    authenticate,
    authorize('ROLE_VIEW'),
    controller.create
);

router.put(
    '/:id',
    authenticate,
    authorize('ROLE_VIEW'),
    controller.update
);

router.delete(
    '/:id',
    authenticate,
    authorize('ROLE_VIEW'),
    controller.remove
);

module.exports = router;