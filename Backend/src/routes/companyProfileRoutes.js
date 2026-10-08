const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const profileController = require('../controllers/companyProfileController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Configure multer storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép tải lên hình ảnh!'), false);
    }
  }
});

// Role check middleware
const checkRole = (req, res, next) => {
  const hasRole = req.user.roles.some(r => r.role_code === 'HR_MANAGER');
  if (!hasRole) return res.status(403).json({ success: false, message: 'Forbidden' });
  next();
};

// GET endpoint (public or authenticated? let's make it authenticated for now, or public if candidates need to see it)
router.get('/', profileController.getProfile);

// PUT endpoint to update profile (only HR Manager or Admin)
router.put('/', authenticate, checkRole, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), profileController.updateProfile);

module.exports = router;
