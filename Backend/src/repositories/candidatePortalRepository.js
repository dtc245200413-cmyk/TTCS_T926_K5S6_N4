const { pool } = require('../config/database');

async function register({ fullName, email, phone, passwordHash }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingAccounts] = await connection.execute(
      'SELECT id FROM candidate_accounts WHERE email = ? LIMIT 1 FOR UPDATE',
      [email]
    );
    if (existingAccounts.length) throw Object.assign(new Error('Email này đã có tài khoản ứng viên.'), { statusCode: 409 });

    const [candidateRows] = await connection.execute(
      'SELECT id FROM candidates WHERE email = ? AND merged_into_id IS NULL ORDER BY id LIMIT 1 FOR UPDATE',
      [email]
    );
    let candidateId = candidateRows[0]?.id;
    if (!candidateId) {
      const [candidateResult] = await connection.execute(`
        INSERT INTO candidates (full_name, email, phone, status, source_code, created_by, resume_url, stage_changed_at)
        VALUES (?, ?, ?, 'NEW', 'CAREER_SITE', NULL, NULL, NOW())
      `, [fullName, email, phone || null]);
      candidateId = candidateResult.insertId;
    } else {
      await connection.execute(
        'UPDATE candidates SET full_name = ?, phone = COALESCE(?, phone) WHERE id = ?',
        [fullName, phone || null, candidateId]
      );
    }

    const [accountResult] = await connection.execute(`
      INSERT INTO candidate_accounts (candidate_id, email, password_hash)
      VALUES (?, ?, ?)
    `, [candidateId, email, passwordHash]);
    await connection.commit();
    return { account_id: accountResult.insertId, candidate_id: candidateId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findAuthByEmail(email) {
  const [rows] = await pool.execute(`
    SELECT a.id AS account_id, a.candidate_id, a.email, a.password_hash, a.status AS account_status,
           a.failed_login_attempts, a.locked_until,
           c.full_name, c.phone, c.status AS candidate_status
    FROM candidate_accounts a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.email = ? LIMIT 1
  `, [email]);
  return rows[0] || null;
}

async function findAuthById(accountId) {
  const [rows] = await pool.execute(`
    SELECT a.id AS account_id, a.candidate_id, a.email, a.status AS account_status,
           c.full_name, c.phone, c.status AS candidate_status
    FROM candidate_accounts a
    JOIN candidates c ON c.id = a.candidate_id
    WHERE a.id = ? LIMIT 1
  `, [accountId]);
  return rows[0] || null;
}

async function recordFailedLogin(accountId, attempts, lockedUntil = null) {
  await pool.execute(
    'UPDATE candidate_accounts SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
    [attempts, lockedUntil, accountId]
  );
}

async function recordSuccessfulLogin(accountId) {
  await pool.execute(
    'UPDATE candidate_accounts SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
    [accountId]
  );
}

async function updateProfile(candidateId, { fullName, phone }) {
  await pool.execute(
    'UPDATE candidates SET full_name = ?, phone = ? WHERE id = ?',
    [fullName, phone || null, candidateId]
  );
}

function generateApplicationCode() {
  const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `HS${dateStr}-${randomChars}`;
}

async function applyToPosting({ candidateId, posting, resumeUrl, coverLetter, candidateProfile }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      'SELECT id, application_code FROM candidate_applications WHERE candidate_id = ? AND job_posting_id = ? LIMIT 1 FOR UPDATE',
      [candidateId, posting.id]
    );
    if (existing.length) {
      const err = new Error(`Bạn đã ứng tuyển vị trí này rồi. Mã tra cứu hồ sơ: ${existing[0].application_code || ('HS-' + existing[0].id)}`);
      err.statusCode = 409;
      err.existingApplicationCode = existing[0].application_code;
      throw err;
    }

    const applicationCode = generateApplicationCode();

    const [result] = await connection.execute(`
      INSERT INTO candidate_applications
        (candidate_id, job_posting_id, recruitment_request_id, status, resume_url, cover_letter, application_code, applied_at)
      VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, NOW())
    `, [candidateId, posting.id, posting.recruitment_request_id, resumeUrl, coverLetter || null, applicationCode]);
    await connection.execute(`
      UPDATE candidates
      SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), resume_url = ?, recruitment_request_id = COALESCE(recruitment_request_id, ?), application_code = COALESCE(application_code, ?)
      WHERE id = ?
    `, [candidateProfile?.full_name || null, candidateProfile?.phone || null, resumeUrl, posting.recruitment_request_id, applicationCode, candidateId]);
    await connection.execute(`
      INSERT INTO candidate_notifications (candidate_id, title, message, type, link)
      VALUES (?, ?, ?, 'APPLICATION_SUBMITTED', ?)
    `, [candidateId, 'Đã nhận hồ sơ ứng tuyển', `Hồ sơ của bạn cho vị trí ${posting.title} đã được gửi thành công. Mã hồ sơ tra cứu: ${applicationCode}`, `/candidate/applications/${result.insertId}`]);
    await connection.commit();
    return { applicationId: result.insertId, applicationCode };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getApplications(candidateId) {
  const [rows] = await pool.execute(`
    SELECT a.id AS application_id, a.status, a.applied_at, a.updated_at,
           jp.id AS job_id, jp.title, jp.salary_display, jp.deadline, jp.status AS posting_status,
           d.department_name, p.position_name, COALESCE(loc.name, jp.work_location) AS location_name
    FROM candidate_applications a
    JOIN job_postings jp ON jp.id = a.job_posting_id
    LEFT JOIN recruitment_requests rr ON rr.id = a.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    LEFT JOIN job_positions p ON p.position_id = rr.position_id
    LEFT JOIN master_data loc ON loc.category_group = 'WORK_LOCATION' AND loc.code = rr.work_location_code
    WHERE a.candidate_id = ?
    ORDER BY a.applied_at DESC
  `, [candidateId]);
  return rows;
}

async function getInterviews(candidateId) {
  const [rows] = await pool.execute(`
    SELECT i.*, a.status AS application_status, jp.title AS job_title, d.department_name
    FROM candidate_interviews i
    JOIN candidate_applications a ON a.id = i.application_id
    JOIN job_postings jp ON jp.id = a.job_posting_id
    LEFT JOIN recruitment_requests rr ON rr.id = a.recruitment_request_id
    LEFT JOIN departments d ON d.department_id = rr.department_id
    WHERE a.candidate_id = ?
    ORDER BY i.starts_at DESC
  `, [candidateId]);
  return rows;
}

async function respondToInterview(candidateId, interviewId, { status, response }) {
  const [result] = await pool.execute(`
    UPDATE candidate_interviews i
    JOIN candidate_applications a ON a.id = i.application_id
    SET i.status = ?, i.candidate_response = ?
    WHERE i.id = ? AND a.candidate_id = ? AND i.status IN ('SCHEDULED', 'RESCHEDULE_REQUESTED')
  `, [status, response || null, interviewId, candidateId]);
  return result.affectedRows > 0;
}

async function getOffers(candidateId) {
  const [rows] = await pool.execute(`
    SELECT o.id, o.offer_code, o.application_id, o.salary_amount, o.basic_salary,
      o.currency, o.start_date, o.expected_start_date, o.response_deadline,
      o.work_location, o.benefits, o.message, o.status, o.candidate_response,
      o.responded_at, o.created_at,
      COALESCE(o.job_title, jp.title) AS job_title, d.department_name
    FROM candidate_offers o
    JOIN candidate_applications a ON a.id = o.application_id
    LEFT JOIN job_postings jp ON jp.id = a.job_posting_id
    LEFT JOIN departments d ON d.department_id = o.department_id
    WHERE a.candidate_id = ? AND o.candidate_id = ?
      AND o.status IN ('SENT', 'PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'EXPIRED')
    ORDER BY o.created_at DESC`, [candidateId, candidateId]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return rows.map(offer => {
    const expired = offer.status === 'SENT' && offer.response_deadline &&
      new Date(offer.response_deadline) < today;
    return { ...offer, status: expired ? 'EXPIRED' : offer.status,
      is_expired: Boolean(expired) };
  });
}

// Updates response, candidate/application state, and creates onboarding inside
// a single transaction. Unlike PR #35, two simultaneous responses cannot both
// succeed and a failure cannot leave half of the workflow persisted.
async function respondToOffer(candidateId, offerId, { status, response }) {
  const conn = await pool.getConnection();
  let started = false;
  try {
    await conn.beginTransaction(); started = true;
    const [rows] = await conn.execute(`
      SELECT o.id, o.status, o.application_id, o.candidate_id, o.created_by,
        o.response_deadline, o.expected_start_date, o.start_date
      FROM candidate_offers o
      JOIN candidate_applications a ON a.id = o.application_id
      WHERE o.id = ? AND o.candidate_id = ? AND a.candidate_id = ?
      FOR UPDATE`, [offerId, candidateId, candidateId]);
    if (rows.length !== 1) {
      throw Object.assign(new Error('Không tìm thấy Thư mời nhận việc.'), { statusCode: 404 });
    }
    if (!['SENT', 'PENDING_RESPONSE'].includes(rows[0].status)) {
      throw Object.assign(new Error('Thư mời không còn ở trạng thái chờ phản hồi.'), { statusCode: 409 });
    }
    const offer = rows[0];
    const deadline = offer.response_deadline && new Date(offer.response_deadline);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (deadline && deadline < today) {
      throw Object.assign(new Error('Thư mời đã hết hạn.'), { statusCode: 409 });
    }
    const [changed] = await conn.execute(`
      UPDATE candidate_offers
      SET status = ?, candidate_response = ?, responded_at = CURRENT_TIMESTAMP,
        row_version = row_version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('SENT', 'PENDING_RESPONSE')`,
    [status, response || null, offerId]);
    if (changed.affectedRows !== 1) {
      throw Object.assign(new Error('Trạng thái thư mời đã thay đổi.'), { statusCode: 409 });
    }
    if (status === 'ACCEPTED') {
      // There must be an accountable HR owner: NEVER fall back to a magic ID.
      if (!Number.isSafeInteger(Number(offer.created_by)) || Number(offer.created_by) <= 0) {
        throw Object.assign(new Error('Thiếu nhân sự phụ trách onboarding.'), { statusCode: 503 });
      }
      const officialStart = offer.expected_start_date || offer.start_date;
      if (!officialStart) {
        throw Object.assign(new Error('Thiếu ngày bắt đầu nhận việc.'), { statusCode: 503 });
      }
      await conn.execute(`INSERT INTO candidate_onboardings
        (offer_id, candidate_id, hr_in_charge_id, official_start_date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'PREPARING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [offerId, candidateId, offer.created_by, officialStart]);
      await conn.execute(`UPDATE candidate_applications SET status = 'HIRED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND candidate_id = ?`, [offer.application_id, candidateId]);
      await conn.execute(`UPDATE candidates SET status = 'HIRED', current_stage = 'HIRED',
        stage_changed_at = CURRENT_TIMESTAMP WHERE id = ?`, [candidateId]);
    }
    if (status === 'DECLINED') {
      // Do not globally reject candidate: they may have other applications.
      await conn.execute(`UPDATE candidate_applications SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND candidate_id = ?`, [offer.application_id, candidateId]);
    }
    if (Number.isSafeInteger(Number(offer.created_by)) && Number(offer.created_by) > 0) {
      // Internal recruiter notification is stored in the same transaction,
      // avoiding a successfully changed Offer with no durable notification.
      await conn.execute(`INSERT INTO notifications
        (user_id, title, message, type, link, is_read)
        VALUES (?, ?, ?, ?, '/offers', 0)`,
      [offer.created_by,
        status === 'ACCEPTED' ? 'Ứng viên đã chấp nhận Offer' : 'Ứng viên đã từ chối Offer',
        `Ứng viên đã phản hồi Offer #${offerId}. Vui lòng kiểm tra hồ sơ.`,
        status === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED']);
    }
    await conn.commit(); started = false;
    return true;
  } catch (error) {
    if (started) { try { await conn.rollback(); } catch { /* preserve cause */ } }
    throw error;
  } finally { conn.release(); }
}

async function getNotifications(candidateId) {
  const [rows] = await pool.execute(
    'SELECT * FROM candidate_notifications WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 50',
    [candidateId]
  );
  return rows;
}

async function markNotificationRead(candidateId, notificationId) {
  const [result] = await pool.execute(
    'UPDATE candidate_notifications SET read_at = NOW() WHERE id = ? AND candidate_id = ? AND read_at IS NULL',
    [notificationId, candidateId]
  );
  return result.affectedRows > 0;
}

async function changePassword(accountId, passwordHash) {
  await pool.execute('UPDATE candidate_accounts SET password_hash = ? WHERE id = ?', [passwordHash, accountId]);
}

module.exports = {
  register,
  findAuthByEmail,
  findAuthById,
  recordFailedLogin,
  recordSuccessfulLogin,
  updateProfile,
  applyToPosting,
  getApplications,
  getInterviews,
  respondToInterview,
  getOffers,
  respondToOffer,
  getNotifications,
  markNotificationRead,
  changePassword
};
