import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FiSearch, 
  FiFileText, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiArrowLeft, 
  FiUpload, 
  FiCopy, 
  FiCheck, 
  FiBriefcase, 
  FiMapPin 
} from 'react-icons/fi';

const API = 'http://localhost:5000/api';

const TrackApplication = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'apply' ? 'apply' : 'track';
  const initialCode = searchParams.get('code') || '';
  const initialEmail = searchParams.get('email') || '';

  const [activeTab, setActiveTab] = useState(initialTab);

  // Tracking state
  const [trackForm, setTrackForm] = useState({ code: initialCode, email: initialEmail });
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResult, setTrackResult] = useState(null);

  // Apply state
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [applyForm, setApplyForm] = useState({
    job_posting_id: searchParams.get('job_id') || '',
    full_name: '',
    email: '',
    phone: '',
    cover_letter: '',
    resume: null
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccessData, setApplySuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch open jobs for the apply tab
  useEffect(() => {
    axios.get(`${API}/public/jobs`)
      .then(res => {
        const list = res.data.data || [];
        setJobs(list);
        if (!applyForm.job_posting_id && list.length > 0) {
          setApplyForm(prev => ({ ...prev, job_posting_id: list[0].id }));
        }
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  // Auto trigger tracking if query params are present
  useEffect(() => {
    if (initialCode && initialEmail) {
      handleTrackSubmit(null, initialCode, initialEmail);
    }
  }, []);

  const handleTrackSubmit = async (e, codeOverride, emailOverride) => {
    if (e) e.preventDefault();
    const code = (codeOverride || trackForm.code).trim();
    const email = (emailOverride || trackForm.email).trim().toLowerCase();

    if (!code || !email) {
      setTrackError('Vui lòng nhập đầy đủ mã hồ sơ và email.');
      return;
    }

    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const response = await axios.post(`${API}/public/jobs/track`, {
        application_code: code,
        email
      });
      setTrackResult(response.data.data);
    } catch (err) {
      setTrackError(err.response?.data?.message || 'Thông tin mã hồ sơ hoặc email không chính xác. Vui lòng kiểm tra lại.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');

    if (!applyForm.job_posting_id) {
      setApplyError('Vui lòng chọn vị trí tuyển dụng.');
      return;
    }
    if (!applyForm.full_name.trim()) {
      setApplyError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!applyForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applyForm.email.trim())) {
      setApplyError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (!applyForm.phone.trim()) {
      setApplyError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (!applyForm.resume) {
      setApplyError('Vui lòng tải tệp CV lên.');
      return;
    }

    const ext = applyForm.resume.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setApplyError('Định dạng tệp không hợp lệ. Chỉ chấp nhận tệp PDF hoặc Word (.pdf, .doc, .docx).');
      return;
    }

    if (applyForm.resume.size > 10 * 1024 * 1024) {
      setApplyError('Dung lượng tệp CV không được vượt quá 10 MB.');
      return;
    }

    setApplyLoading(true);
    try {
      const payload = new FormData();
      payload.append('job_posting_id', applyForm.job_posting_id);
      payload.append('full_name', applyForm.full_name.trim());
      payload.append('email', applyForm.email.trim().toLowerCase());
      payload.append('phone', applyForm.phone.trim());
      payload.append('cover_letter', applyForm.cover_letter.trim());
      payload.append('resume', applyForm.resume);

      const res = await axios.post(`${API}/public/jobs/apply`, payload);
      setApplySuccessData(res.data.data);
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại.');
    } finally {
      setApplyLoading(false);
    }
  };

  const copyCode = (code) => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{ background: '#0f172a', color: '#fff', padding: '16px clamp(16px, 5vw, 64px)', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏢</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cổng Thông Tin Ứng Viên</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Tuyển dụng & Theo dõi Hồ sơ</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to="/jobs" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              ← Danh sách việc làm
            </Link>
            <Link to="/login" style={{ color: '#f8fafc', textDecoration: 'none', fontSize: 13, padding: '6px 14px', border: '1px solid #475569', borderRadius: 6, fontWeight: 600 }}>
              Đăng nhập nhân sự
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: 1000, width: '100%', margin: '30px auto', padding: '0 20px', flex: 1 }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '2px solid #e2e8f0', paddingBottom: 2 }}>
          <button
            type="button"
            onClick={() => { setActiveTab('track'); setSearchParams({}); }}
            style={{
              padding: '12px 20px',
              fontSize: 15,
              fontWeight: 700,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'track' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'track' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <FiSearch size={18} /> Tra cứu trạng thái hồ sơ
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('apply'); setSearchParams({ tab: 'apply' }); }}
            style={{
              padding: '12px 20px',
              fontSize: 15,
              fontWeight: 700,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'apply' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'apply' ? '3px solid #2563eb' : '3px solid transparent',
              marginBottom: -4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <FiFileText size={18} /> Nộp hồ sơ trực tuyến (Không cần tài khoản)
          </button>
        </div>

        {/* TAB 1: TRACK APPLICATION STATUS */}
        {activeTab === 'track' && (
          <section style={{ display: 'grid', gap: 24 }}>
            {/* Search Box */}
            <div style={{ background: '#ffffff', borderRadius: 12, padding: '24px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
              <div style={{ marginBottom: 18 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                  Tra cứu tiến độ hồ sơ ứng tuyển
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
                  Nhập chính xác <strong>Mã hồ sơ</strong> (đã được cấp khi nộp đơn) và <strong>Email</strong> bạn đã sử dụng để xem trạng thái xử lý hiện tại mà không cần tài khoản.
                </p>
              </div>

              {trackError && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginBottom: 18 }}>
                  <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{trackError}</span>
                </div>
              )}

              <form onSubmit={handleTrackSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr)) auto', gap: 14, alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Mã hồ sơ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={trackForm.code}
                    onChange={e => setTrackForm({ ...trackForm, code: e.target.value })}
                    placeholder="Ví dụ: HS2610-A9B7C"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Email ứng tuyển <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={trackForm.email}
                    onChange={e => setTrackForm({ ...trackForm, email: e.target.value })}
                    placeholder="email@example.com"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 14
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={trackLoading}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#fff',
                    border: 0,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 44,
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  <FiSearch size={16} /> {trackLoading ? 'Đang tra cứu...' : 'Tra cứu kết quả'}
                </button>
              </form>
            </div>

            {/* Tracking Result Card */}
            {trackResult && (
              <div style={{ background: '#ffffff', borderRadius: 12, padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                {/* Result Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      {trackResult.department_name || 'Phòng ban tuyển dụng'}
                    </span>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '4px 0 8px' }}>
                      {trackResult.job_title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#475569' }}>
                      <span>Mã hồ sơ: <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{trackResult.application_code}</strong></span>
                      <span>·</span>
                      <span>Ngày nộp: <strong>{new Date(trackResult.applied_at).toLocaleDateString('vi-VN')}</strong></span>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        backgroundColor: trackResult.status_badge_color || '#2563eb'
                      }}
                    >
                      <FiClock size={15} /> {trackResult.status_title}
                    </span>
                  </div>
                </div>

                {/* Progress Steps Indicator */}
                {trackResult.status_code !== 'REJECTED' ? (
                  <div style={{ padding: '30px 10px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      {/* Connecting Line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 18,
                          left: '5%',
                          right: '5%',
                          height: 3,
                          backgroundColor: '#e2e8f0',
                          zIndex: 1
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 18,
                          left: '5%',
                          width: `${Math.max(0, Math.min(100, ((trackResult.step_index - 1) / 4) * 90))}%`,
                          height: 3,
                          backgroundColor: '#2563eb',
                          zIndex: 2,
                          transition: 'width 0.4s ease'
                        }}
                      />

                      {trackResult.stages?.map(stage => {
                        const isDone = trackResult.step_index > stage.step;
                        const isCurrent = trackResult.step_index === stage.step;
                        return (
                          <div key={stage.step} style={{ zIndex: 3, textAlign: 'center', width: 90 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                margin: '0 auto 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 800,
                                color: isDone || isCurrent ? '#ffffff' : '#64748b',
                                backgroundColor: isDone ? '#16a34a' : isCurrent ? '#2563eb' : '#f1f5f9',
                                border: isCurrent ? '3px solid #bfdbfe' : '2px solid transparent',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none'
                              }}
                            >
                              {isDone ? <FiCheck size={18} /> : stage.step}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#1e40af' : '#475569' }}>
                              {stage.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ margin: '24px 0 10px', padding: 18, background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: 14, marginBottom: 4 }}>
                      Thông báo từ Hội đồng tuyển dụng:
                    </div>
                    <div style={{ color: '#b91c1c', fontSize: 13, lineHeight: 1.6 }}>
                      {trackResult.status_description}
                    </div>
                  </div>
                )}

                {/* Explanation note for positive/in-progress stages */}
                {trackResult.status_code !== 'REJECTED' && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Chi tiết trạng thái hiện tại:
                    </div>
                    <p style={{ margin: 0, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                      {trackResult.status_description}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 22, textAlign: 'right' }}>
                  <Link to="/jobs" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                    Khám phá thêm các cơ hội việc làm khác →
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: APPLY ONLINE WITHOUT ACCOUNT */}
        {activeTab === 'apply' && (
          <section style={{ background: '#ffffff', borderRadius: 12, padding: '28px 32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            {applySuccessData ? (
              <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                <FiCheckCircle size={56} color="#16a34a" style={{ display: 'inline-block' }} />
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#166534', margin: '14px 0 8px' }}>
                  Nộp hồ sơ trực tuyến thành công!
                </h2>
                <p style={{ maxWidth: 560, margin: '0 auto 20px', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                  Hồ sơ của bạn đã được tiếp nhận và lưu đúng vị trí tuyển dụng <strong>{applySuccessData.job_title}</strong>.
                </p>

                <div style={{ maxWidth: 460, margin: '0 auto 24px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '20px', textAlign: 'left' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mã tra cứu hồ sơ duy nhất của bạn:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#1e40af', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                      {applySuccessData.application_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCode(applySuccessData.application_code)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 13,
                        background: copied ? '#16a34a' : '#2563eb',
                        color: '#fff',
                        border: 0,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Đã sao chép' : 'Sao chép mã'}
                    </button>
                  </div>
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: '#2563eb', lineHeight: 1.5 }}>
                    💡 <em>Vui lòng lưu lại mã tra cứu này và email <strong>{applySuccessData.email}</strong> để kiểm tra tiến trình xét duyệt bất cứ lúc nào mà không cần tạo tài khoản.</em>
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('track');
                      setTrackForm({ code: applySuccessData.application_code, email: applySuccessData.email });
                      handleTrackSubmit(null, applySuccessData.application_code, applySuccessData.email);
                    }}
                    style={{
                      padding: '11px 22px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 0,
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    🔍 Tra cứu tiến trình hồ sơ ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApplySuccessData(null);
                      setApplyForm({
                        job_posting_id: jobs[0]?.id || '',
                        full_name: '',
                        email: '',
                        phone: '',
                        cover_letter: '',
                        resume: null
                      });
                    }}
                    style={{
                      padding: '11px 20px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Nộp thêm hồ sơ khác
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                    Biểu mẫu ứng tuyển trực tuyến
                  </h1>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                    Điền đầy đủ thông tin bên dưới và tải lên CV của bạn. Hệ thống sẽ tự động tạo mã tra cứu duy nhất ngay khi gửi.
                  </p>
                </div>

                {applyError && (
                  <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13, marginBottom: 18 }}>
                    <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{applyError}</span>
                  </div>
                )}

                <form onSubmit={handleApplySubmit} style={{ display: 'grid', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Vị trí ứng tuyển <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {jobsLoading ? (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Đang tải danh sách việc làm...</div>
                    ) : (
                      <select
                        required
                        value={applyForm.job_posting_id}
                        onChange={e => setApplyForm({ ...applyForm, job_posting_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: 8,
                          border: '1px solid #cbd5e1',
                          fontSize: 14,
                          background: '#fff'
                        }}
                      >
                        <option value="">-- Chọn vị trí đang tuyển dụng --</option>
                        {jobs.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.title} {j.department_name ? `(${j.department_name})` : ''} - {j.location_name || 'Linh hoạt'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Họ và tên <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={150}
                        value={applyForm.full_name}
                        onChange={e => setApplyForm({ ...applyForm, full_name: e.target.value })}
                        placeholder="Nguyễn Văn A"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Email liên hệ <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        maxLength={150}
                        value={applyForm.email}
                        onChange={e => setApplyForm({ ...applyForm, email: e.target.value })}
                        placeholder="email@example.com"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Số điện thoại <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={50}
                        value={applyForm.phone}
                        onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })}
                        placeholder="09xx xxx xxx"
                        style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                        Tệp CV đính kèm <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div
                        style={{
                          border: '2px dashed #cbd5e1',
                          borderRadius: 8,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: '#f8fafc'
                        }}
                      >
                        <FiUpload size={20} color="#2563eb" />
                        <input
                          type="file"
                          required
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={e => setApplyForm({ ...applyForm, resume: e.target.files?.[0] || null })}
                          style={{ width: '100%', fontSize: 12 }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Hỗ trợ PDF, DOC, DOCX. Dung lượng tối đa 10 MB.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Thư giới thiệu / Ghi chú (Không bắt buộc)
                    </label>
                    <textarea
                      rows={3}
                      value={applyForm.cover_letter}
                      onChange={e => setApplyForm({ ...applyForm, cover_letter: e.target.value })}
                      placeholder="Mô tả tóm tắt kỹ năng, kinh nghiệm hoặc lời nhắn gửi đến nhà tuyển dụng..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ paddingTop: 8 }}>
                    <button
                      type="submit"
                      disabled={applyLoading}
                      style={{
                        padding: '13px 28px',
                        borderRadius: 8,
                        background: '#2563eb',
                        color: '#fff',
                        border: 0,
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)'
                      }}
                    >
                      {applyLoading ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ trực tuyến'}
                    </button>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 14 }}>
                      🔒 Không yêu cầu tạo tài khoản mật khẩu
                    </span>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '18px 24px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
        © 2026 TechCorp Recruitment Portal. Mọi thông tin ứng viên được bảo mật tuyệt đối.
      </footer>
    </div>
  );
};

export default TrackApplication;
