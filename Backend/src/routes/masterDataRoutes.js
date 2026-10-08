const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterDataController');
const { authenticate } = require('../middleware/authMiddleware');

// Role check middleware for HR_MANAGER only
const checkHRManager = (req, res, next) => {
  const hasRole = req.user.roles.some(r => r.role_code === 'HR_MANAGER');
  if (!hasRole) return res.status(403).json({ success: false, message: 'Forbidden: HR Manager only' });
  next();
};

router.use(authenticate);

// We can allow other roles to read if needed, but for now we'll restrict all to HR_MANAGER
// Or wait, reading might be needed by all recruiters when creating requests/applications.
// So GET is authenticated for everyone.
router.get('/', masterDataController.getAll);

// Create, Update, Delete are HR_MANAGER only
router.post('/', checkHRManager, masterDataController.create);
router.put('/reorder', checkHRManager, masterDataController.reorder);
router.put('/:id', checkHRManager, masterDataController.update);
router.delete('/:id', checkHRManager, masterDataController.remove);

module.exports = router;
