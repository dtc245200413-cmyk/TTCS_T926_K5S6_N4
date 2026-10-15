const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const resumeDirectory = path.join(__dirname, '../../private_uploads/resumes');
fs.mkdirSync(resumeDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: resumeDirectory,
    filename: (req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      callback(null, `cv-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return callback(new Error('CV phải ở định dạng .pdf, .doc hoặc .docx'));
    }
    callback(null, true);
  }
});

router.use(authenticate);

// Recruiters and HR can access
router.get('/duplicates', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.findDuplicates);
router.get('/merges', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.getActiveMerges);
router.post('/merge', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.mergeCandidates);
router.post('/merges/:mergeId/undo', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.undoMerge);
router.get('/:id/resume', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.downloadResume);

// Xem danh sách/chi tiết, thêm thủ công, ghi chú — chỉ ADMIN, HR_MANAGER, RECRUITER (403 nếu không đủ quyền)
const candidateAccess = requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER');
router.get('/positions', candidateAccess, candidateController.getAvailablePositions);
router.get('/', candidateAccess, candidateController.getAllCandidates);
router.post('/', candidateAccess, upload.single('resume'), candidateController.createCandidate);
router.get('/:id/notes', candidateAccess, candidateController.getNotes);
router.post('/:id/notes', candidateAccess, candidateController.addNote);
router.put('/:id/notes/:noteId', candidateAccess, candidateController.updateNote);
router.get('/:id', candidateAccess, candidateController.getCandidateDetail);
router.put('/:id/status', candidateController.updateStatus);

module.exports = router;
