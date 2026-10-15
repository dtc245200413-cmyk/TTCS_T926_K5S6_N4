import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiBriefcase, 
  FiCheckCircle, 
  FiMapPin, 
  FiUpload, 
  FiCalendar, 
  FiDollarSign, 
  FiUsers, 
  FiClock, 
  FiCheckSquare, 
  FiGift, 
  FiFileText,
  FiAlertCircle
} from 'react-icons/fi';
import '../../styles/public-jobs.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = new URL(API, window.location.origin).origin;

const PublicJobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', cover_letter: '', resume: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/public/jobs/${id}`),
      axios.get(`${API}/company-profile`).catch(() => null)
    ]).then(([jobResponse, companyResponse]) => {
      setJob(jobResponse.data.data);
      setCompany(companyResponse?.data?.data || null);
    }).catch(requestError => {
      setError(requestError.response?.data?.message || 'Tin tuyển dụng không tồn tại hoặc đã hết hạn nhận hồ sơ.');
    }).finally(() => setLoading(false));
  }, [id]);

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!form.resume) {
      setError('Vui lòng đính kèm tệp CV của bạn.');
      return;
    }
    if (form.resume.size > 5 * 1024 * 1024) {
      setError('Tệp CV không được vượt quá dung lượng 5 MB.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('full_name', form.full_name);
      payload.append('email', form.email);
      payload.append('phone', form.phone);
      if (form.cover_letter) payload.append('cover_letter', form.cover_letter);
      payload.append('resume', form.resume);

      const response = await axios.post(`${API}/public/jobs/${id}/apply`, payload);
      setApplicationId(response.data.data?.application_id || 'APP-' + Math.floor(1000 + Math.random() * 9000));
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi hồ sơ lúc này. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDeadlineStatus = (deadlineStr) => {
    if (!deadlineStr) return { text: 'Không giới hạn hạn nộp', isUrgent: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    const formatted = new Date(deadlineStr).toLocaleDateString('vi-VN');

    if (diffDays === 0) return { text: 'Hôm nay là hạn chót', isUrgent: true, date: formatted };
    if (diffDays > 0 && diffDays <= 3) return { text: `Còn ${diffDays} ngày nữa (Hạn: ${formatted})`, isUrgent: true, date: formatted };
    return { text: `Hạn nộp: ${formatted} (còn ${diffDays} ngày)`, isUrgent: false, date: formatted };
  };

  if (loading) {
    return (
      <div className="pj-portal" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <p>Đang tải thông tin vị trí tuyển dụng...</p>
        </div>
      </div>
    );
  }

  // Not found or expired state
  if (!job) {
    return (
      <div className="pj-portal">
        <header className="pj-navbar">
          <div className="pj-nav-container">
            <Link to="/jobs" className="pj-logo-group">
              <div className="pj-logo-badge">T</div>
              <div className="pj-logo-text">
                <span className="pj-logo-title">TechCorp Careers</span>
              </div>
            </Link>
          </div>
        </header>

        <div className="pj-detail-container" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ maxWidth: 540, margin: '0 auto', background: '#fff', padding: 40, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <FiAlertCircle size={56} color="#f59e0b" style={{ marginBottom: 16 }} />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
              Tin tuyển dụng không khả dụng
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {error || 'Vị trí này đã hết hạn nhận hồ sơ, bị ẩn hoặc đã được gỡ khỏi danh sách công khai. Vui lòng tham khảo các cơ hội nghề nghiệp khác.'}
            </p>
            <Link to="/jobs" className="pj-btn-submit" style={{ textDecoration: 'none' }}>
              <FiArrowLeft /> Xem các vị trí đang mở tuyển
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bannerUrl = company?.banner_url ? `${API_ORIGIN}${company.banner_url}` : '';
  const logoUrl = company?.logo_url ? `${API_ORIGIN}${company.logo_url}` : '';
  const deadlineInfo = getDeadlineStatus(job.deadline);

  return (
    <div className="pj-portal">
      {/* Top Navbar */}
      <header className="pj-navbar">
        <div className="pj-nav-container">
          <Link to="/jobs" className="pj-logo-group">
            <div className="pj-logo-badge">T</div>
            <div className="pj-logo-text">
              <span className="pj-logo-title">{company?.name || 'TechCorp'} Careers</span>
              <span className="pj-logo-sub">Thông tin tuyển dụng</span>
            </div>
          </Link>
          <div className="pj-nav-links">
            <Link to="/jobs" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13 }}>
              Tất cả việc làm
            </Link>
          </div>
        </div>
      </header>

      {/* Main Detail Content */}
      <main className="pj-detail-container">
        {/* Breadcrumb Navigation */}
        <Link to="/jobs" className="pj-breadcrumb" id="back-to-jobs-link">
          <FiArrowLeft /> Quay lại danh sách việc làm
        </Link>

        {/* Detail Card Container */}
        <article className="pj-detail-card">
          {bannerUrl && (
            <img 
              src={bannerUrl} 
              alt="Ảnh bìa công ty" 
              className="pj-detail-banner" 
            />
          )}

          {/* Job Header */}
          <div className="pj-detail-header">
            <div className="pj-company-info">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="pj-company-logo" />
              ) : (
                <div className="pj-logo-badge" style={{ width: 56, height: 56, borderRadius: 12 }}>T</div>
              )}
              <div className="pj-header-title-box">
                <span className="pj-dept-badge">{job.department_name || 'TechCorp'}</span>
                <h1>{job.title}</h1>
              </div>
            </div>

            <a href="#apply-box" className="pj-btn-submit" style={{ textDecoration: 'none' }}>
              Ứng tuyển ngay
            </a>
          </div>

          {/* Key Job Overview Bar */}
          <div className="pj-overview-grid">
            <div className="pj-overview-item">
              <div className="pj-overview-icon"><FiDollarSign /></div>
              <div>
                <div className="pj-overview-label">Mức lương</div>
                <div className="pj-overview-value" style={{ color: '#059669' }}>
                  {job.salary_display || 'Thỏa thuận'}
                </div>
              </div>
            </div>

            <div className="pj-overview-item">
              <div className="pj-overview-icon"><FiMapPin /></div>
              <div>
                <div className="pj-overview-label">Địa điểm</div>
                <div className="pj-overview-value">{job.location_name || 'Linh hoạt'}</div>
              </div>
            </div>

            <div className="pj-overview-item">
              <div className="pj-overview-icon"><FiBriefcase /></div>
              <div>
                <div className="pj-overview-label">Hình thức</div>
                <div className="pj-overview-value">{job.work_type_name || 'Toàn thời gian'}</div>
              </div>
            </div>

            <div className="pj-overview-item">
              <div className="pj-overview-icon" style={{ background: deadlineInfo.isUrgent ? '#fef2f2' : '#eef2ff', color: deadlineInfo.isUrgent ? '#ef4444' : '#4f46e5' }}>
                <FiClock />
              </div>
              <div>
                <div className="pj-overview-label">Hạn nộp hồ sơ</div>
                <div className="pj-overview-value" style={{ color: deadlineInfo.isUrgent ? '#b91c1c' : '#0f172a' }}>
                  {deadlineInfo.text}
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Content */}
          <div className="pj-detail-columns">
            {/* Left Column: Requirements, Description, Benefits */}
            <div>
              {/* Section 1: Mô tả công việc */}
              <section className="pj-section" id="job-description-section">
                <h2 className="pj-section-title">
                  <FiFileText style={{ color: '#4f46e5' }} /> Mô tả công việc
                </h2>
                <div className="pj-section-body">
                  {job.description || 'Chưa có thông tin mô tả chi tiết.'}
                </div>
              </section>

              {/* Section 2: Yêu cầu ứng viên */}
              {job.requirements && (
                <section className="pj-section" id="job-requirements-section">
                  <h2 className="pj-section-title">
                    <FiCheckSquare style={{ color: '#4f46e5' }} /> Yêu cầu ứng viên
                  </h2>
                  <div className="pj-section-body">
                    {job.requirements}
                  </div>
                </section>
              )}

              {/* Section 3: Quyền lợi */}
              {job.benefits && (
                <section className="pj-section" id="job-benefits-section">
                  <h2 className="pj-section-title">
                    <FiGift style={{ color: '#4f46e5' }} /> Quyền lợi được hưởng
                  </h2>
                  <div className="pj-section-body">
                    {job.benefits}
                  </div>
                </section>
              )}

              {/* Section 4: Hạn nộp & Quy trình */}
              <section className="pj-section" style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                  <FiCalendar style={{ verticalAlign: 'middle', marginRight: 6, color: '#4f46e5' }} /> 
                  Thông tin hạn nộp & tiếp nhận
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  Hạn chót nhận hồ sơ cho vị trí này là <strong>{job.deadline ? new Date(job.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong>. 
                  Hội đồng tuyển dụng sẽ liên hệ trực tiếp với các ứng viên có hồ sơ phù hợp qua email và số điện thoại đã cung cấp.
                </p>
              </section>
            </div>

            {/* Right Column: Sticky Application Box */}
            <div>
              <aside className="pj-apply-card" id="apply-box">
                {submitted ? (
                  <div className="pj-success-box">
                    <FiCheckCircle className="pj-success-icon" />
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                      Đã gửi hồ sơ thành công!
                    </h2>
                    <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
                      Cảm ơn bạn đã ứng tuyển vị trí <strong>{job.title}</strong>. 
                      Bộ phận Tuyển dụng đã ghi nhận hồ sơ và sẽ phản hồi trong vòng 3-5 ngày làm việc.
                    </p>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, color: '#334155', marginBottom: 20 }}>
                      Mã hồ sơ: <strong>{applicationId}</strong>
                    </div>
                    <Link to="/jobs" className="pj-btn-submit" style={{ display: 'block', textDecoration: 'none' }}>
                      Xem các việc làm khác
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={submitApplication}>
                    <div className="pj-apply-header">
                      <div className="pj-apply-title">Ứng tuyển vị trí này</div>
                      <div className="pj-apply-subtitle">Nộp hồ sơ trực tiếp · Không cần tạo tài khoản</div>
                    </div>

                    {error && (
                      <div role="alert" style={{ padding: 10, borderRadius: 8, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, marginBottom: 14 }}>
                        {error}
                      </div>
                    )}

                    <div className="pj-form-group">
                      <label className="pj-label">
                        Họ và tên <span className="pj-required">*</span>
                      </label>
                      <input
                        required
                        id="apply-fullname"
                        type="text"
                        maxLength={150}
                        className="pj-form-input"
                        placeholder="Nguyễn Văn A"
                        value={form.full_name}
                        onChange={(e) => setForm(curr => ({ ...curr, full_name: e.target.value }))}
                      />
                    </div>

                    <div className="pj-form-group">
                      <label className="pj-label">
                        Địa chỉ Email <span className="pj-required">*</span>
                      </label>
                      <input
                        required
                        id="apply-email"
                        type="email"
                        maxLength={150}
                        className="pj-form-input"
                        placeholder="email@example.com"
                        value={form.email}
                        onChange={(e) => setForm(curr => ({ ...curr, email: e.target.value }))}
                      />
                    </div>

                    <div className="pj-form-group">
                      <label className="pj-label">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        id="apply-phone"
                        type="tel"
                        maxLength={50}
                        className="pj-form-input"
                        placeholder="09xx xxx xxx"
                        value={form.phone}
                        onChange={(e) => setForm(curr => ({ ...curr, phone: e.target.value }))}
                      />
                    </div>

                    <div className="pj-form-group">
                      <label className="pj-label">
                        Đính kèm CV (PDF/Word, tối đa 5 MB) <span className="pj-required">*</span>
                      </label>
                      <div className="pj-file-dropzone">
                        <FiUpload size={22} color="#6366f1" style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                          {form.resume ? form.resume.name : 'Nhấn để chọn tệp CV của bạn'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                          Định dạng hỗ trợ: .pdf, .doc, .docx
                        </div>
                        <input
                          required
                          id="apply-resume"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          onChange={(e) => setForm(curr => ({ ...curr, resume: e.target.files?.[0] || null }))}
                        />
                      </div>
                    </div>

                    <div className="pj-form-group">
                      <label className="pj-label">
                        Lời nhắn hoặc giới thiệu ngắn (Tùy chọn)
                      </label>
                      <textarea
                        id="apply-cover-letter"
                        rows={3}
                        className="pj-form-input"
                        placeholder="Chia sẻ thêm về mục tiêu nghề nghiệp hoặc dự án nổi bật..."
                        value={form.cover_letter}
                        onChange={(e) => setForm(curr => ({ ...curr, cover_letter: e.target.value }))}
                      />
                    </div>

                    <button
                      type="submit"
                      id="btn-submit-application"
                      className="pj-btn-submit-apply"
                      disabled={submitting}
                    >
                      {submitting ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ ứng tuyển'}
                    </button>

                    <p style={{ margin: '12px 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.4 }}>
                      Thông tin của bạn được cam kết bảo mật và chỉ phục vụ mục đích tuyển dụng.
                    </p>
                  </form>
                )}
              </aside>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', background: '#0f172a', color: '#94a3b8', padding: '32px 20px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>© {new Date().getFullYear()} {company?.name || 'TechCorp'}. Tất cả quyền được bảo lưu.</div>
          <Link to="/jobs" style={{ color: '#c7d2fe', textDecoration: 'none', fontSize: 13 }}>Danh sách việc làm</Link>
        </div>
      </footer>
    </div>
  );
};

export default PublicJobDetail;
