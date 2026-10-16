const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const repository = require('../repositories/candidatePortalRepository');
const jobPostingRepository = require('../repositories/jobPostingRepository');
const { httpError } = require('../utils/roles');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 30;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function publicCandidate(account) {
  return {
    account_id: account.account_id,
    candidate_id: account.candidate_id,
    email: account.email,
    full_name: account.full_name,
    phone: account.phone || '',
    status: account.candidate_status || account.status
  };
}

async function register(data) {
  const fullName = String(data.full_name || '').trim();
  const email = normalizeEmail(data.email);
  const phone = String(data.phone || '').trim();
  const password = String(data.password || '');
  if (!fullName || !email || !password) throw httpError('Vui lòng nhập họ tên, email và mật khẩu.', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError('Email không hợp lệ.', 400);
  if (password.length < 8) throw httpError('Mật khẩu phải có ít nhất 8 ký tự.', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  const ids = await repository.register({ fullName, email, phone, passwordHash });
  const account = await repository.findAuthById(ids.account_id);
  return { candidate: publicCandidate(account), token: createToken(account) };
}

function createToken(account) {
  return jwt.sign(
    { candidateAccountId: account.account_id, tokenType: 'candidate' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.CANDIDATE_JWT_EXPIRES_IN || '12h' }
  );
}

async function login(emailInput, password) {
  const email = normalizeEmail(emailInput);
  const account = await repository.findAuthByEmail(email);
  if (!account || account.account_status !== 'ACTIVE') throw httpError('Email hoặc mật khẩu không đúng.', 401);
  if (account.locked_until && new Date(account.locked_until) > new Date()) {
    throw httpError('Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau.', 429);
  }

  const matches = await bcrypt.compare(String(password || ''), account.password_hash);
  if (!matches) {
    const attempts = Number(account.failed_login_attempts || 0) + 1;
    const lockedUntil = attempts >= MAX_FAILED_LOGINS
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;
    await repository.recordFailedLogin(account.account_id, attempts >= MAX_FAILED_LOGINS ? 0 : attempts, lockedUntil);
    throw httpError(attempts >= MAX_FAILED_LOGINS
      ? 'Tài khoản tạm khóa 30 phút do đăng nhập sai nhiều lần.'
      : 'Email hoặc mật khẩu không đúng.', attempts >= MAX_FAILED_LOGINS ? 429 : 401);
  }

  await repository.recordSuccessfulLogin(account.account_id);
  return { candidate: publicCandidate(account), token: createToken(account) };
}

async function getMe(accountId) {
  const account = await repository.findAuthById(accountId);
  if (!account || account.account_status !== 'ACTIVE') throw httpError('Tài khoản ứng viên không còn hoạt động.', 401);
  return publicCandidate(account);
}

async function updateProfile(accountId, data) {
  const fullName = String(data.full_name || '').trim();
  if (!fullName) throw httpError('Họ tên không được để trống.', 400);
  const account = await repository.findAuthById(accountId);
  if (!account) throw httpError('Không tìm thấy tài khoản ứng viên.', 404);
  await repository.updateProfile(account.candidate_id, { fullName, phone: String(data.phone || '').trim() });
  return getMe(accountId);
}

async function submitApplication(candidate, postingId, data, resumeUrl) {
  const posting = await jobPostingRepository.findPublicById(postingId);
  if (!posting) throw httpError('Tin tuyển dụng không tồn tại hoặc đã hết hạn.', 404);
  if (!resumeUrl) throw httpError('Vui lòng đính kèm CV.', 400);
  const { applicationId, applicationCode } = await repository.applyToPosting({
    candidateId: candidate.candidate_id,
    posting,
    resumeUrl,
    coverLetter: String(data.cover_letter || '').trim(),
    candidateProfile: { full_name: candidate.full_name, phone: candidate.phone }
  });
  return { application_id: applicationId, application_code: applicationCode, job_title: posting.title };
}

async function getApplications(candidateId) {
  return repository.getApplications(candidateId);
}

async function getDashboard(candidateId) {
  const [applications, interviews, offers, notifications] = await Promise.all([
    repository.getApplications(candidateId),
    repository.getInterviews(candidateId),
    repository.getOffers(candidateId),
    repository.getNotifications(candidateId)
  ]);
  return {
    counts: {
      applications: applications.length,
      active_applications: applications.filter(item => !['REJECTED', 'HIRED', 'WITHDRAWN'].includes(item.status)).length,
      interviews: interviews.filter(item => ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(item.status)).length,
      offers: offers.filter(item => item.status === 'PENDING_RESPONSE').length
    },
    recent_applications: applications.slice(0, 3),
    notifications: notifications.slice(0, 5)
  };
}

async function getInterviews(candidateId) {
  return repository.getInterviews(candidateId);
}

async function respondToInterview(candidateId, interviewId, data) {
  const validStatuses = new Set(['CONFIRMED', 'RESCHEDULE_REQUESTED', 'DECLINED']);
  if (!validStatuses.has(data.status)) throw httpError('Phản hồi lịch phỏng vấn không hợp lệ.', 400);
  if (data.status === 'RESCHEDULE_REQUESTED' && !String(data.response || '').trim()) {
    throw httpError('Vui lòng nhập lý do hoặc thời gian muốn đổi lịch.', 400);
  }
  const updated = await repository.respondToInterview(candidateId, interviewId, {
    status: data.status,
    response: String(data.response || '').trim()
  });
  if (!updated) throw httpError('Không tìm thấy lịch phỏng vấn có thể phản hồi.', 404);
  return { success: true };
}

async function getOffers(candidateId) {
  return repository.getOffers(candidateId);
}

async function respondToOffer(candidateId, offerId, data) {
  if (!['ACCEPTED', 'DECLINED'].includes(data.status)) throw httpError('Phản hồi thư mời không hợp lệ.', 400);
  if (data.status === 'DECLINED' && !String(data.response || '').trim()) {
    throw httpError('Vui lòng nhập lý do từ chối thư mời.', 400);
  }
  const updated = await repository.respondToOffer(candidateId, offerId, {
    status: data.status,
    response: String(data.response || '').trim()
  });
  if (!updated) throw httpError('Không tìm thấy thư mời đang chờ phản hồi.', 404);
  return { success: true };
}

async function getNotifications(candidateId) {
  return repository.getNotifications(candidateId);
}

async function markNotificationRead(candidateId, notificationId) {
  const updated = await repository.markNotificationRead(candidateId, notificationId);
  if (!updated) throw httpError('Không tìm thấy thông báo chưa đọc.', 404);
  return { success: true };
}

async function changePassword(accountId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw httpError('Mật khẩu mới phải có ít nhất 8 ký tự.', 400);
  }
  const account = await repository.findAuthById(accountId);
  if (!account) throw httpError('Không tìm thấy tài khoản ứng viên.', 404);
  const accountWithHash = await repository.findAuthByEmail(account?.email);
  if (!accountWithHash || !(await bcrypt.compare(currentPassword, accountWithHash.password_hash))) {
    throw httpError('Mật khẩu hiện tại không đúng.', 400);
  }
  await repository.changePassword(accountId, await bcrypt.hash(newPassword, 12));
  return { success: true };
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  submitApplication,
  getApplications,
  getDashboard,
  getInterviews,
  respondToInterview,
  getOffers,
  respondToOffer,
  getNotifications,
  markNotificationRead,
  changePassword
};