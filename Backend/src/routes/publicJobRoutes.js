const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const controller = require('../controllers/jobPostingController');

const resumeDirectory = path.join(__dirname, '../../private_uploads/resumes');
fs.mkdirSync(resumeDirectory, { recursive: true });
const upload = multer({
	storage: multer.diskStorage({
		destination: resumeDirectory,
		filename: (req, file, callback) => {
			const extension = path.extname(file.originalname).toLowerCase();
			callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
		}
	}),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB tối đa theo yêu cầu
	fileFilter: (req, file, callback) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const allowedExts = ['.pdf', '.doc', '.docx'];
		const allowedTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/octet-stream'
		];
		if (!allowedExts.includes(ext) && !allowedTypes.includes(file.mimetype)) {
			return callback(new Error('CV phải ở định dạng PDF hoặc Word (.pdf, .doc, .docx).'));
		}
		callback(null, true);
	}
});

router.get('/filter-options', controller.getPublicFilterOptions);
router.get('/', controller.getPublicJobs);
router.post('/track', controller.trackApplication);
router.get('/track', controller.trackApplication);
router.post('/apply', upload.single('resume'), controller.applyPublicJob);
router.get('/:id', controller.getPublicJob);
router.post('/:id/apply', upload.single('resume'), controller.applyPublicJob);

module.exports = router;