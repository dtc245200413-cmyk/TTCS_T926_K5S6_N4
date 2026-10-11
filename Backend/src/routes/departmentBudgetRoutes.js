const router = require('express').Router();
const controller = require('../controllers/departmentBudgetController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.get('/', authenticate, authorize('DEPARTMENT_BUDGET_VIEW'), controller.getBudgets);
router.get('/:departmentId/:year/availability', authenticate, authorize('DEPARTMENT_BUDGET_VIEW'), controller.getAvailability);
router.put('/:departmentId/:year', authenticate, authorize('DEPARTMENT_BUDGET_MANAGE'), controller.saveBudget);

module.exports = router;
