const candidateService = require('../services/candidateService');
const { parseCvBuffer } = require('../utils/cvParser');
const { sendSuccess } = require('../utils/response');

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
    const result = await candidateService.createCandidate(
      req.body,
      req.user.user_id,
      getIp(req)
    );

    return sendSuccess(
      res,
      'Tạo ứng viên thành công.',
      result,
      201
    );
  } catch (error) {
    next(error);
  }
};

const getAllCandidates = async (req, res, next) => {
  try {
    const result = await candidateService.getAllCandidates(
      req.user
    );

    return sendSuccess(
      res,
      'Lấy danh sách ứng viên thành công.',
      result
    );
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason_code } = req.body;

    const result =
      await candidateService.updateCandidateStatus(
        id,
        status,
        rejection_reason_code || null,
        req.user.user_id,
        getIp(req)
      );

    return sendSuccess(
      res,
      'Cập nhật trạng thái thành công.',
      result
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  parseCv,
  createCandidate,
  getAllCandidates,
  updateStatus
};