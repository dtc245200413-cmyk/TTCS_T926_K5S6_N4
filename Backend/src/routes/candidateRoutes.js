const express = require('express');
const multer = require('multer');

const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');
const { sendError } = require('../utils/response');

// Same internal writer roles and Candidate exclusion as SCRUM-337 profiles.
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
  // Same readers as SCRUM-337. Hiring Manager scope remains in the repository.
  return requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER', 'HIRING_MANAGER')(req, res, next);
};

const requireStatusWriter = (req, res, next) => {
  // CandidateList reserves the hire decision for HR management.
  if (req.body.status === 'HIRED') {
    return requireRoles('ADMIN', 'HR_MANAGER')(req, res, next);
  }
  next();
};

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
  requireCandidateWriter,
  (req, res, next) => upload.single('cv')(req, res, error => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'Dung lượng CV tối đa là 5 MB. Vui lòng chọn tệp nhỏ hơn.', 413);
    }
    next(error);
  }),
  candidateController.parseCv
);

// Recruiters and HR can access
router.get('/duplicates', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.findDuplicates);
router.get('/merges', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.getActiveMerges);
router.post('/merge', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.mergeCandidates);
router.post('/merges/:mergeId/undo', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.undoMerge);
router.get('/:id/resume', requireRoles('ADMIN', 'HR_MANAGER', 'RECRUITER'), candidateController.downloadResume);
router.get('/', requireCandidateReader, candidateController.getAllCandidates);
router.post('/', requireCandidateWriter, candidateController.createCandidate);
router.put('/:id/status', requireCandidateWriter, requireStatusWriter, candidateController.updateStatus);

// SCRUM-215: role checks and reviewer ownership are enforced in the service.
router.put('/:id/ratings/me', candidateController.saveMyRating);
router.get('/:id/ratings', candidateController.getRatings);

module.exports = router;
