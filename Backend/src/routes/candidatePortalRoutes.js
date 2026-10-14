const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const controller = require('../controllers/candidatePortalController');
const { authenticateCandidate } = require('../middleware/candidateAuthMiddleware');

const router = express.Router();
const resumeDirectory = path.join(__dirname, '../../private_uploads/resumes');
fs.mkdirSync(resumeDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: resumeDirectory,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) return callback(new Error('CV phải ở định dạng PDF hoặc Word.'));
    callback(null, true);
  }
});

router.post('/register', controller.register);
router.post('/login', controller.login);
router.use(authenticateCandidate);
router.get('/me', controller.me);
router.patch('/me', controller.updateProfile);
router.get('/dashboard', controller.dashboard);
router.get('/applications', controller.applications);
router.post('/applications/:jobPostingId', upload.single('resume'), controller.apply);
router.get('/interviews', controller.interviews);
router.patch('/interviews/:id/respond', controller.respondInterview);
router.get('/offers', controller.offers);
router.patch('/offers/:id/respond', controller.respondOffer);
router.get('/notifications', controller.notifications);
router.patch('/notifications/:id/read', controller.markNotificationRead);
router.put('/password', controller.changePassword);

module.exports = router;