const router = require('express').Router();
const controller = require('../controllers/candidateProfileController');
const { authenticate } = require('../middleware/authMiddleware');

// Route-level authentication avoids intercepting existing candidate/rating endpoints.
router.get('/:id/tags', authenticate, controller.getTags);
router.post('/:id/tags', authenticate, controller.addTag);
router.delete('/:id/tags/:tagId', authenticate, controller.removeTag);
router.get('/:id/notes', authenticate, controller.getNotes);
router.post('/:id/notes', authenticate, controller.addNote);

module.exports = router;
