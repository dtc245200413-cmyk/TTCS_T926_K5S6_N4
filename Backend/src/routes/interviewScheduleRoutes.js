const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const controller = require('../controllers/interviewScheduleController');

router.use(authenticate);
router.get('/', controller.getAll);
router.get('/options', controller.getOptions);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id/cancel', controller.cancel);
router.patch('/:id', controller.update);

module.exports = router;
