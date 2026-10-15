const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/cvs');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cv-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file PDF, DOC, DOCX.'));
    }
  }
});

router.use(authenticate);

// List & Create
router.get('/', candidateController.getAllCandidates);
router.post('/', candidateController.createCandidate);

// Unified Profile (SCRUM-189: Hồ sơ ứng viên hợp nhất)
router.get('/:id/unified-profile', candidateController.getUnifiedProfile);

// Notes (Ghi chú đánh giá)
router.post('/:id/notes', candidateController.addNote);

// Stage Transition (Kanban / Pipeline stage)
router.put('/:id/stage', candidateController.updateStage);

// Rating & Tags & Talent Pool
router.put('/:id/rating', candidateController.updateRating);
router.put('/:id/tags', candidateController.updateTags);
router.put('/:id/talent-pool', candidateController.toggleTalentPool);

// CV Upload
router.post('/:id/cv', upload.single('cv'), candidateController.uploadCv);

// Status update (Reject / Hire)
router.put('/:id/status', candidateController.updateStatus);

module.exports = router;
