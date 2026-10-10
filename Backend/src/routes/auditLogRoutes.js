const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticate } = require('../middleware/authMiddleware');

// Get all audit logs
router.get('/', authenticate, auditLogController.getAuditLogs);

module.exports = router;
