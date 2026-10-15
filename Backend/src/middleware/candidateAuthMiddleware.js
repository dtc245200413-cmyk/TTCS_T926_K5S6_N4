const jwt = require('jsonwebtoken');
const candidatePortalRepository = require('../repositories/candidatePortalRepository');

const authenticateCandidate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập tài khoản ứng viên.' });
    }
    let decoded;
    try {
      decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Phiên ứng viên không hợp lệ hoặc đã hết hạn.' });
    }
    if (decoded.tokenType !== 'candidate' || !decoded.candidateAccountId) {
      return res.status(401).json({ success: false, message: 'Token không thuộc tài khoản ứng viên.' });
    }
    const account = await candidatePortalRepository.findAuthById(decoded.candidateAccountId);
    if (!account || account.account_status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Tài khoản ứng viên không còn hoạt động.' });
    }
    req.candidate = account;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticateCandidate };