const candidateService = require('../services/candidateService');
const { parseCvBuffer } = require('../utils/cvParser');
const candidateRepo = require('../repositories/candidateRepository');
const { sendSuccess, sendError } = require('../utils/response');
const path = require('path');
const fs = require('fs');

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

const parseCv = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('Vui lòng chọn một tệp CV PDF.');
      error.statusCode = 400;
      throw error;
    }

    try {
      const extracted = await parseCvBuffer(req.file.buffer);

      return sendSuccess(
        res,
        'Đã bóc tách thông tin từ CV. Vui lòng kiểm tra trước khi lưu.',
        {
          parse_success: true,
          ...extracted
        }
      );
    } catch (parseError) {
      /*
       * Jira yêu cầu:
       * Bóc tách thất bại không được làm hỏng luồng tạo hồ sơ.
       *
       * Vì vậy API vẫn trả kết quả để Frontend cho phép
       * Recruiter nhập thông tin thủ công.
       */
      return sendSuccess(
        res,
        'Không thể tự động bóc tách CV. Bạn vẫn có thể nhập thông tin thủ công.',
        {
          parse_success: false,
          full_name: '',
          email: '',
          phone: '',
          missing_fields: [
            'full_name',
            'email',
            'phone'
          ],
          warning:
            parseError.message ||
            'Không đọc được nội dung CV.'
        }
      );
    }
  } catch (error) {
    next(error);
  }
};

const createCandidate = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.resume_url = req.file.filename;
    }
    const result = await candidateService.createCandidate(
      payload,
      req.user.user_id,
      getIp(req),
      req.body.allow_duplicate === true || req.body.allow_duplicate === 'true'
    );
    return sendSuccess(res, 'Tạo ứng viên thành công.', result, 201);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ success: false, message: error.message, duplicates: error.duplicates || [] });
    }
    if (error.statusCode === 400 && error.errors) {
      return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    next(error);
  }
};

const getAvailablePositions = async (req, res, next) => {
  try {
    const result = await candidateService.getAvailablePositions();
    return sendSuccess(res, 'Lấy danh sách vị trí thành công.', result);
  } catch (error) { next(error); }
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
    const result = candidateService.listCandidates
      ? await candidateService.listCandidates(req.query, req.user)
      : await candidateService.getAllCandidates(req.user, req.query);
    return sendSuccess(res, 'Lấy danh sách ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const getUnifiedProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await candidateService.getUnifiedProfile(id, req.user, getIp(req));
    return sendSuccess(res, 'Lấy thông tin hồ sơ ứng viên hợp nhất thành công.', result);
  } catch (error) { next(error); }
};

const noteErrorResponse = (error, res, next) => {
  if (error.statusCode === 400 && error.errors) {
    return res.status(400).json({ success: false, message: error.message, errors: error.errors });
  }
  return next(error);
};

const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note_content = req.body.note_content || req.body.content;
    const result = await candidateService.addCandidateNote(id, note_content, req.user, getIp(req));
    return sendSuccess(res, 'Thêm ghi chú thành công.', result, 201);
  } catch (error) { noteErrorResponse(error, res, next); }
};

const updateStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage_code, note } = req.body;
    const result = await candidateService.updateCandidateStage(id, stage_code, note, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật giai đoạn ứng tuyển thành công.', result);
  } catch (error) { next(error); }
};

const updateRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const result = await candidateService.updateCandidateRating(id, rating, req.user, getIp(req));
    return sendSuccess(res, 'Đánh giá ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const updateTags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    const result = await candidateService.updateCandidateTags(id, tags, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật nhãn phân loại thành công.', result);
  } catch (error) { next(error); }
};

const toggleTalentPool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_talent_pool } = req.body;
    const result = await candidateService.toggleCandidateTalentPool(id, is_talent_pool, req.user, getIp(req));
    return sendSuccess(res, 'Cập nhật kho ứng viên tiềm năng thành công.', result);
  } catch (error) { next(error); }
};

const uploadCv = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return sendError(res, 'Vui lòng chọn tệp CV để tải lên.', 400);
    }
    const cvFilePath = `/uploads/cvs/${req.file.filename}`;
    const result = await candidateService.updateCandidateCv(id, cvFilePath, req.user, getIp(req));
    return sendSuccess(res, 'Tải lên CV thành công.', { cv_file_path: cvFilePath, candidate: result });
  } catch (error) { next(error); }
};

const getCandidateDetail = async (req, res, next) => {
  try {
    const result = await candidateService.getCandidateDetail(req.params.id);
    return sendSuccess(res, 'Lấy chi tiết ứng viên thành công.', result);
  } catch (error) { next(error); }
};

const getNotes = async (req, res, next) => {
  try {
    const result = await candidateService.getCandidateNotes(req.params.id);
    return sendSuccess(res, 'Lấy ghi chú thành công.', result);
  } catch (error) { next(error); }
};


const updateNote = async (req, res, next) => {
  try {
    const result = await candidateService.updateCandidateNote(req.params.id, req.params.noteId, req.body.content, req.user.user_id, getIp(req));
    return sendSuccess(res, 'Cập nhật ghi chú thành công.', result);
  } catch (error) { noteErrorResponse(error, res, next); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason_code, rejection_reason, rejection_note } = req.body;
    
    const result = await candidateService.updateCandidateStatus(
      id, 
      status, 
      rejection_reason_code || null, 
      rejection_note || rejection_reason || null,
      req.user.user_id, 
      getIp(req)
    );
    return sendSuccess(res, 'Cập nhật trạng thái thành công.', result);
  } catch (error) { next(error); }
};

const getStageHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await candidateService.getCandidateHistory(id);
    return sendSuccess(res, 'Lấy lịch sử chuyển giai đoạn thành công.', history);
  } catch (error) { next(error); }
};

const saveMyRating = async (req, res, next) => {
  try {
    const result = await candidateService.saveMyRating(req.params.id, req.body, req.user);
    return sendSuccess(res, 'Lưu đánh giá thành công.', result);
  } catch (error) { next(error); }
};

const getRatings = async (req, res, next) => {
  try {
    const result = await candidateService.getCandidateRatings(req.params.id, req.user);
    return sendSuccess(res, 'Lấy đánh giá thành công.', result);
  } catch (error) { next(error); }
};

module.exports = {
  parseCv,
  createCandidate,
  getAllCandidates,
  getUnifiedProfile,
  addNote,
  updateStage,
  updateRating,
  updateTags,
  toggleTalentPool,
  uploadCv,
  updateStatus,
  getStageHistory,
  saveMyRating,
  getRatings,
  findDuplicates,
  mergeCandidates,
  getActiveMerges,
  undoMerge,
  downloadResume,
  getCandidateDetail,
  getNotes,
  addNote,
  updateNote,
  getAvailablePositions
};
