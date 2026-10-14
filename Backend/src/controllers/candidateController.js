const candidateService = require('../services/candidateService');
const candidateRepo = require('../repositories/candidateRepository');
const { sendSuccess, sendError } = require('../utils/response');
const path = require('path');
const fs = require('fs');

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
}

const createCandidate = async (req, res, next) => {
  try {
    const result = await candidateService.createCandidate(
      req.body,
      req.user.user_id,
      getIp(req),
      req.body.allow_duplicate === true
    );
    return sendSuccess(res, 'Tạo ứng viên thành công.', result, 201);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, duplicates: error.duplicates || [] });
    }
    next(error);
  }
};

const findDuplicates = async (req, res, next) => {
  try {
    const result = await candidateService.findPotentialDuplicates({
      email: req.query.email,
      phone: req.query.phone,
      candidateId: req.query.candidate_id
    });
    return sendSuccess(res, 'Kiểm tra hồ sơ trùng thành công.', result);
  } catch (error) { next(error); }
};

const mergeCandidates = async (req, res, next) => {
  try {
    const { primary_id, secondary_id, chosen_fields } = req.body;
    if (!primary_id || !secondary_id) return sendError(res, 'Cần chọn hồ sơ chính và hồ sơ trùng.', 400);
    const result = await candidateService.mergeCandidates(primary_id, secondary_id, chosen_fields, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Đã gộp hồ sơ và giữ lại lịch sử.', result);
  } catch (error) { next(error); }
};

const getActiveMerges = async (req, res, next) => {
  try {
    return sendSuccess(res, 'Lấy lịch sử gộp có thể hoàn tác thành công.', await candidateService.getActiveMerges());
  } catch (error) { next(error); }
};

const { getCandidateCvData, getCvHtml, renderHtmlToPdf } = require('../utils/generatePdfCv');

const downloadResume = async (req, res, next) => {
  try {
    const candidate = await candidateRepo.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin ứng viên.' });
    }

    const cvData = getCandidateCvData(candidate);

    if (req.query.view === 'json') {
      return res.json({ success: true, data: cvData });
    }

    if (req.query.view === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(getCvHtml(cvData));
    }

    const resumesDir = path.join(__dirname, '../../private_uploads/resumes');
    fs.mkdirSync(resumesDir, { recursive: true });

    let safeFilename = candidate.resume_url ? path.basename(candidate.resume_url) : `cv_${candidate.id}.pdf`;
    if (!safeFilename.toLowerCase().endsWith('.pdf')) {
      safeFilename = safeFilename + '.pdf';
    }
    const filePath = path.join(resumesDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      const html = getCvHtml(cvData);
      await renderHtmlToPdf(html, filePath);
    }

    res.setHeader('Content-Type', 'application/pdf');
    return res.download(filePath, safeFilename);
  } catch (error) { next(error); }
};

const undoMerge = async (req, res, next) => {
  try {
    const result = await candidateService.undoCandidateMerge(req.params.mergeId, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Đã hoàn tác gộp hồ sơ.', result);
  } catch (error) { next(error); }
};

const getAllCandidates = async (req, res, next) => {
  try {
    const result = await candidateService.getAllCandidates(req.user);
    return sendSuccess(res, 'Lấy danh sách thành công.', result);
  } catch (error) { next(error); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason_code } = req.body;
    
    const result = await candidateService.updateCandidateStatus(id, status, rejection_reason_code || null, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  updateStatus,
  findDuplicates,
  mergeCandidates,
  getActiveMerges,
  undoMerge,
  downloadResume
};
