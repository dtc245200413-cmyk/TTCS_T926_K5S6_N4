const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');
const { sendError } = require('../utils/response');

// Internal writer roles
const requireCandidateWriter = (req, res, next) => {
  if (req.user?.roles?.some(role => role.role_code === 'CANDIDATE')) {
    return sendError(res, 'Bạn không có quyền quản lý hồ sơ ứng viên nội bộ.', 403);
  }
  return requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER')(req, res, next);
};

const requireCandidateReader = (req, res, next) => {
  if (req.user?.roles?.some(role => role.role_code === 'CANDIDATE')) {
    return sendError(res, 'Bạn không có quyền truy cập hồ sơ ứng viên nội bộ.', 403);
  }
  const roles = req.user?.roles || [];
  if (roles.some(role => role.role_code === 'HIRING_MANAGER')
      && !roles.some(role => ['ADMIN', 'HR_MANAGER', 'RECRUITER'].includes(role.role_code))
      && !req.user.department_id) {
    return sendError(res, 'Không xác định được phạm vi phòng ban của hồ sơ.', 403);
  }
  return requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER')(req, res, next);
};

const requireStatusWriter = (req, res, next) => {
  if (req.body.status === 'HIRED') {
    return requireRoles('ADMIN', 'HR_MANAGER')(req, res, next);
  }
  next();
};

// Memory storage for CV parsing
const memoryUpload = multer({
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

// Disk storage for CV file attachment
const diskStorage = multer.diskStorage({
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

const diskUpload = multer({
  storage: diskStorage,
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

// CV Parsing (SCRUM-67)
router.post(
  '/parse-cv',
  requireCandidateWriter,
  (req, res, next) => memoryUpload.single('cv')(req, res, error => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'Dung lượng CV tối đa là 5 MB. Vui lòng chọn tệp nhỏ hơn.', 413);
    }
    next(error);
  }),
  candidateController.parseCv
);

// Merge routes
router.get('/duplicates', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.findDuplicates);
router.get('/merges', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.getActiveMerges);
router.post('/merge', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.mergeCandidates);
router.post('/merges/:mergeId/undo', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.undoMerge);

// Positions master list for candidates form
router.get('/positions', requireCandidateReader, candidateController.getAvailablePositions);

// List & Create
router.get('/', requireCandidateReader, candidateController.getAllCandidates);
router.post('/', requireCandidateWriter, upload.single('resume'), candidateController.createCandidate);

// Unified Profile (SCRUM-189: Hồ sơ ứng viên hợp nhất)
router.get('/:id/unified-profile', requireCandidateReader, candidateController.getUnifiedProfile);
router.get('/:id', requireCandidateReader, candidateController.getCandidateDetail);

// Resume download
router.get('/:id/resume', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.downloadResume);

// Stage History
router.get('/:id/history', requireCandidateReader, candidateController.getStageHistory);

// Ratings (SCRUM-215 & SCRUM-189)
router.put('/:id/ratings/me', candidateController.saveMyRating);
router.get('/:id/ratings', candidateController.getRatings);
router.put('/:id/rating', requireCandidateWriter, candidateController.updateRating);

// Notes (Ghi chú đánh giá)
router.get('/:id/notes', requireCandidateWriter, candidateController.getNotes);
router.post('/:id/notes', requireCandidateWriter, candidateController.addNote);
router.put('/:id/notes/:noteId', requireCandidateWriter, candidateController.updateNote);

// Stage Transition (Kanban / Pipeline stage)
router.put('/:id/stage', requireCandidateWriter, candidateController.updateStage);

// Tags & Talent Pool
router.put('/:id/tags', requireCandidateWriter, candidateController.updateTags);
router.put('/:id/talent-pool', requireCandidateWriter, candidateController.toggleTalentPool);

// CV Upload
router.post('/:id/cv', requireCandidateWriter, diskUpload.single('cv'), candidateController.uploadCv);

// Status update (Reject / Hire)
router.put('/:id/status', requireCandidateWriter, requireStatusWriter, candidateController.updateStatus);

module.exports = router;
