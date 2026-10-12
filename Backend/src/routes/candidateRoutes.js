const express = require('express');
const multer = require('multer');

const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      const error = new Error('Chỉ chấp nhận tệp CV định dạng PDF.');
      error.statusCode = 400;
      return cb(error);
    }

    cb(null, true);
  }
});

router.use(authenticate);

// Đọc CV PDF và bóc tách thông tin.
// Chưa lưu ứng viên ở bước này.
router.post(
  '/parse-cv',
  upload.single('cv'),
  candidateController.parseCv
);

// Recruiters and HR can access
router.get('/', candidateController.getAllCandidates);
router.post('/', candidateController.createCandidate);
router.put('/:id/status', candidateController.updateStatus);

module.exports = router;