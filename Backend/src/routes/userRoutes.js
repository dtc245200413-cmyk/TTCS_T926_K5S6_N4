/**
 * userRoutes.js
 * API routes for user management under /api/users.
 */

const express = require('express');
const router  = express.Router();

const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/temp/', 
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG are allowed'));
    }
  }
});

router.post('/me/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

router.get('/', authenticate, authorize('USER_VIEW'), userController.getAllUsers);

// SCRUM-58: Self-update route — any authenticated user can update their OWN profile.
// Must be declared BEFORE the generic /:id routes to avoid collision.
router.put('/me', authenticate, userController.updateOwnProfile);
router.get('/me', authenticate, userController.getOwnProfile);

router.get('/:id', authenticate, authorize('USER_VIEW'), userController.getUserById);
router.post('/', authenticate, authorize('USER_CREATE'), userController.createUser);
// Admin-only update (allows changing any user's data with USER_UPDATE permission)
router.put('/:id', authenticate, authorize('USER_UPDATE'), userController.updateUser);

// PART 3: User Roles
router.get('/:id/roles', authenticate, authorize('USER_VIEW'), userController.getUserRoles);
router.post('/:id/roles', authenticate, authorize('ROLE_ASSIGN'), userController.assignRole);
router.delete('/:id/roles/:roleId', authenticate, authorize('ROLE_REVOKE'), userController.revokeRole);

// PART 3: Lock/Unlock
router.patch('/:id/lock', authenticate, authorize('USER_LOCK'), userController.lockUser);
router.patch('/:id/unlock', authenticate, authorize('USER_UNLOCK'), userController.unlockUser);

// SPRINT 2: Import Excel
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/import/template', authenticate, authorize('USER_CREATE'), userController.downloadTemplate);
router.post('/import/preview', authenticate, authorize('USER_CREATE'), upload.single('file'), userController.previewImport);
router.post('/import/confirm', authenticate, authorize('USER_CREATE'), userController.confirmImport);

module.exports = router;
