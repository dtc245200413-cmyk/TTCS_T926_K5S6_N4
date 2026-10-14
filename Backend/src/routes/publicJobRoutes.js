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
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
		if (!allowedTypes.includes(file.mimetype)) return callback(new Error('CV phải ở định dạng PDF hoặc Word.'));
		callback(null, true);
	}
});

router.get('/', controller.getPublicJobs);
router.get('/:id', controller.getPublicJob);
router.post('/:id/apply', upload.single('resume'), controller.applyPublicJob);

module.exports = router;