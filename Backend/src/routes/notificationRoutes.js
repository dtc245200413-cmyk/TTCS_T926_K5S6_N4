const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, notificationController.getMyNotifications);
router.put('/all/read', authenticate, notificationController.markAllAsRead);
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.put('/:id/unread', authenticate, notificationController.markAsUnread);
router.put('/:id/toggle', authenticate, notificationController.toggleRead);

module.exports = router;
