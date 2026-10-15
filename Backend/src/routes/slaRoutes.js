const express = require('express');
const router = express.Router();
const controller = require('../controllers/slaController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

router.use(authenticate);
router.use(requireRoles('ADMIN', 'HR_MANAGER'));
router.get('/configs', controller.getConfigs);
router.put('/configs', controller.saveConfigs);
router.post('/run', controller.runCheck);

module.exports = router;