import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiCheckCircle, FiMapPin, FiUpload } from 'react-icons/fi';

const API = 'http://localhost:5000/api';

const PublicJobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', resume: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/public/jobs/${id}`),
      axios.get(`${API}/company-profile`).catch(() => null)
    ]).then(([jobResponse, companyResponse]) => {
      setJob(jobResponse.data.data);
      setCompany(companyResponse?.data?.data || null);
    }).catch(requestError => {
      setError(requestError.response?.data?.message || 'Tin tuyển dụng không tồn tại hoặc đã hết hạn.');
    }).finally(() => setLoading(false));
  }, [id]);

  const submitApplication = async (event) => {
    event.preventDefault();
    if (!form.resume) {
      setError('Vui lòng đính kèm CV của bạn.');
      return;
    }
    if (form.resume.size > 5 * 1024 * 1024) {
      setError('CV không được vượt quá 5 MB.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('full_name', form.full_name);
      payload.append('email', form.email);
      payload.append('phone', form.phone);
      payload.append('resume', form.resume);
      await axios.post(`${API}/public/jobs/${id}/apply`, payload);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi hồ sơ lúc này. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Đang tải tin tuyển dụng...</main>;
  if (!job) return <main style={{ minHeight: '100vh', padding: 32, background: '#f8fafc' }}><Link to="/jobs" className="g-btn-secondary"><FiArrowLeft /> Danh sách việc làm</Link><div role="alert" className="alert alert-error" style={{ marginTop: 18 }}>{error}</div></main>;

  const bannerUrl = company?.banner_url ? `http://localhost:5000${company.banner_url}` : '';
  const logoUrl = company?.logo_url ? `http://localhost:5000${company.logo_url}` : '';

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#172033' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '13px clamp(18px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/jobs" style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 800 }}>{company?.name || 'TechCorp'} <span style={{ color: '#a5b4fc', fontWeight: 500 }}>Tuyển dụng</span></Link>
          <Link to="/jobs" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13 }}>Tất cả việc làm</Link>
        </div>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 20px 44px' }}>
        <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14, color: '#475569', textDecoration: 'none', fontSize: 13 }}><FiArrowLeft /> Danh sách việc làm</Link>
        <article style={{ overflow: 'hidden', background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8 }}>
          {bannerUrl && <img src={bannerUrl} alt="Ảnh bìa công ty" style={{ display: 'block', width: '100%', height: 190, objectFit: 'cover' }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logoUrl && <img src={logoUrl} alt="Logo công ty" style={{ width: 46, height: 46, padding: 4, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6 }} />}
              <div><div style={{ color: '#64748b', fontSize: 12 }}>{job.department_name || company?.name || 'TechCorp'}</div><h1 style={{ margin: '3px 0 0', color: '#111827', fontSize: 24 }}>{job.title}</h1></div>
            </div>
            <a href="#apply" className="g-btn-primary" style={{ flexShrink: 0 }}>Ứng tuyển ngay</a>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '12px 22px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 13 }}>
            <span><FiBriefcase /> {job.work_type_name || 'Toàn thời gian'}</span>
            <span><FiMapPin /> {job.location_name || 'Linh hoạt'}</span>
            <strong style={{ color: '#2563eb' }}>{job.salary_display || 'Thỏa thuận'}</strong>
            <span>Hạn nộp: {job.deadline ? new Date(job.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, padding: 22 }}>
            <div style={{ display: 'grid', alignContent: 'start', gap: 18, lineHeight: 1.65 }}>
              <section><h2 style={{ margin: '0 0 7px', fontSize: 16 }}>Mô tả công việc</h2><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 14 }}>{job.description}</div></section>
              {job.requirements && <section><h2 style={{ margin: '0 0 7px', fontSize: 16 }}>Yêu cầu ứng viên</h2><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 14 }}>{job.requirements}</div></section>}
              {job.benefits && <section><h2 style={{ margin: '0 0 7px', fontSize: 16 }}>Quyền lợi</h2><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 14 }}>{job.benefits}</div></section>}
            </div>

            <section id="apply" style={{ alignSelf: 'start', padding: 16, background: '#f8fafc', border: '1px solid #dbe2ea', borderRadius: 8 }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '16px 4px' }}>
                  <FiCheckCircle size={34} color="#16a34a" />
                  <h2 style={{ margin: '10px 0 5px', fontSize: 17 }}>Đã nhận hồ sơ</h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Cảm ơn bạn đã ứng tuyển vị trí {job.title}. Bộ phận tuyển dụng sẽ liên hệ nếu hồ sơ phù hợp.</p>
                  <Link to="/jobs" className="g-btn-secondary" style={{ marginTop: 14 }}>Xem việc làm khác</Link>
                </div>
              ) : (
                <form onSubmit={submitApplication} style={{ display: 'grid', gap: 10 }}>
                  <div><h2 style={{ margin: 0, fontSize: 17 }}>Ứng tuyển vị trí này</h2><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>Không cần tạo tài khoản</p></div>
                  {error && <div role="alert" style={{ padding: 9, borderRadius: 5, color: '#991b1b', background: '#fef2f2', fontSize: 12 }}>{error}</div>}
                  <label style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 700 }}>Họ và tên <span style={{ color: '#ef4444' }}>*</span><input required maxLength={150} className="g-form-input" value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} placeholder="Nguyễn Văn A" /></label>
                  <label style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 700 }}>Email <span style={{ color: '#ef4444' }}>*</span><input required type="email" maxLength={150} className="g-form-input" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="email@example.com" /></label>
                  <label style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 700 }}>Số điện thoại<input type="tel" maxLength={50} className="g-form-input" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="09xx xxx xxx" /></label>
                  <label style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 700 }}>CV (PDF/Word, tối đa 5 MB) <span style={{ color: '#ef4444' }}>*</span><span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 9, border: '1px dashed #94a3b8', borderRadius: 6, background: '#fff', fontWeight: 500 }}><FiUpload /><input required type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => setForm(current => ({ ...current, resume: event.target.files?.[0] || null }))} style={{ minWidth: 0, width: '100%', fontSize: 11 }} /></span></label>
                  <button type="submit" className="g-btn-primary" disabled={submitting} style={{ width: '100%', marginTop: 2 }}>{submitting ? 'Đang gửi hồ sơ...' : 'Gửi hồ sơ ứng tuyển'}</button>
                  <p style={{ margin: 0, color: '#64748b', fontSize: 10, lineHeight: 1.45 }}>Bằng việc gửi hồ sơ, bạn đồng ý để công ty sử dụng thông tin nhằm xử lý ứng tuyển.</p>
                </form>
              )}
            </section>
          </div>
        </article>
      </section>
    </main>
  );
};

export default PublicJobDetail;