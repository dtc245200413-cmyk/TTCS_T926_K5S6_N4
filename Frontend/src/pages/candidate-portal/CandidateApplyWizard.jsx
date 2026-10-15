import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CandidateAuthContext } from '../../context/CandidateAuthContext';
import { FiCheck, FiCheckCircle, FiUpload } from 'react-icons/fi';

const API = 'http://localhost:5000/api';
const steps = ['Thông tin hồ sơ', 'Tải CV', 'Hoàn tất'];

const CandidateApplyWizard = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { candidate } = useContext(CandidateAuthContext);
  const [job, setJob] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ full_name: candidate?.full_name || '', email: candidate?.email || '', phone: candidate?.phone || '', cover_letter: '', resume: null });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API}/public/jobs/${jobId}`)
      .then(response => setJob(response.data.data))
      .catch(requestError => setError(requestError.response?.data?.message || 'Tin tuyển dụng không còn khả dụng.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const submit = async () => {
    if (!form.resume) return setError('Vui lòng tải CV lên trước khi gửi.');
    if (form.resume.size > 5 * 1024 * 1024) return setError('CV không được vượt quá 5 MB.');
    setSubmitting(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('resume', form.resume);
      payload.append('cover_letter', form.cover_letter);
      await axios.post(`${API}/candidate-portal/applications/${jobId}`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` } });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi hồ sơ.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="g-card">Đang tải vị trí ứng tuyển...</div>;
  if (!job) return <div className="g-card"><div role="alert" className="alert alert-error">{error}</div><Link to="/jobs" className="g-btn-secondary">Quay lại việc làm</Link></div>;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: 18 }}><h1 className="g-page-title" style={{ fontSize: 23 }}>Ứng tuyển vị trí</h1><p className="g-page-subtitle" style={{ fontWeight: 700, color: '#334155' }}>{job.title}</p></header>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 18 }}>
        {steps.map((label, index) => { const stepNumber = index + 1; const complete = step > stepNumber; const active = step === stepNumber; return <React.Fragment key={label}><div style={{ display: 'flex', alignItems: 'center', gap: 7, color: active ? '#2563eb' : complete ? '#16a34a' : '#94a3b8', fontSize: 12, fontWeight: active ? 700 : 500 }}><span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 50, color: '#fff', background: active ? '#2563eb' : complete ? '#16a34a' : '#cbd5e1' }}>{complete ? <FiCheck /> : stepNumber}</span>{label}</div>{index < steps.length - 1 && <span style={{ width: 34, height: 1, background: step > stepNumber ? '#16a34a' : '#cbd5e1' }} />}</React.Fragment>; })}
      </div>

      {error && <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {step === 1 && <section className="g-card" style={{ padding: 20, margin: 0 }}>
        <h2 style={{ margin: '0 0 15px', fontSize: 17 }}>Thông tin hồ sơ</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          <label className="g-form-label">Họ và tên<input className="g-form-input" value={form.full_name} onChange={event => setForm(current => ({ ...current, full_name: event.target.value }))} /></label>
          <label className="g-form-label">Email<input className="g-form-input" value={form.email} readOnly style={{ background: '#f1f5f9', color: '#64748b' }} /></label>
          <label className="g-form-label">Số điện thoại<input className="g-form-input" type="tel" value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} /></label>
          <label className="g-form-label" style={{ gridColumn: '1 / -1' }}>Giới thiệu bản thân<textarea className="g-form-input" rows={3} value={form.cover_letter} onChange={event => setForm(current => ({ ...current, cover_letter: event.target.value }))} placeholder="Chia sẻ ngắn về kinh nghiệm và mong muốn của bạn..." style={{ resize: 'vertical' }} /></label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}><Link to={`/jobs/${jobId}`} className="g-btn-secondary">Hủy</Link><button className="g-btn-primary" disabled={!form.full_name.trim()} onClick={() => { setError(''); setStep(2); }}>Tiếp theo</button></div>
      </section>}

      {step === 2 && <section className="g-card" style={{ padding: 20, margin: 0 }}>
        <h2 style={{ margin: '0 0 5px', fontSize: 17 }}>Tải CV của bạn</h2><p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13 }}>Hỗ trợ PDF hoặc Word, dung lượng tối đa 5 MB</p>
        <label style={{ display: 'grid', placeItems: 'center', minHeight: 160, padding: 20, border: '1px dashed #94a3b8', borderRadius: 8, background: '#f8fafc', color: '#475569', cursor: 'pointer' }}><FiUpload size={27} color="#2563eb" /><strong style={{ marginTop: 8 }}>{form.resume?.name || 'Chọn CV từ thiết bị'}</strong><span style={{ marginTop: 4, fontSize: 12 }}>PDF, DOC hoặc DOCX</span><input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { setForm(current => ({ ...current, resume: event.target.files?.[0] || null })); setError(''); }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} /></label>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}><button className="g-btn-secondary" onClick={() => setStep(1)}>Quay lại</button><button className="g-btn-primary" disabled={!form.resume} onClick={() => setStep(3)}>Tiếp theo</button></div>
      </section>}

      {step === 3 && submitted && <section className="g-card" style={{ padding: 28, margin: 0, textAlign: 'center' }}>
        <FiCheckCircle size={42} color="#16a34a" />
        <h2 style={{ margin: '10px 0 5px', fontSize: 20 }}>Ứng tuyển thành công</h2>
        <p style={{ margin: '0 auto 16px', maxWidth: 480, color: '#64748b', fontSize: 13 }}>Hồ sơ của bạn cho vị trí {job.title} đã được tiếp nhận. Bạn có thể theo dõi tiến trình trong tài khoản ứng viên.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}><Link to="/candidate/applications" className="g-btn-primary">Xem hồ sơ đã ứng tuyển</Link><Link to="/jobs" className="g-btn-secondary">Tìm việc khác</Link></div>
      </section>}

      {step === 3 && !submitted && <section className="g-card" style={{ padding: 20, margin: 0 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 17 }}>{submitting ? 'Đang gửi hồ sơ...' : 'Kiểm tra trước khi gửi'}</h2>
        {step === 3 && !submitting && !error && <div style={{ display: 'grid', gap: 8, padding: 14, background: '#f8fafc', borderRadius: 6, color: '#334155', fontSize: 13 }}><div><strong>Vị trí:</strong> {job.title}</div><div><strong>Họ tên:</strong> {form.full_name}</div><div><strong>Email:</strong> {form.email}</div><div><strong>CV:</strong> {form.resume?.name || 'Chưa chọn'}</div>{form.cover_letter && <div><strong>Giới thiệu:</strong> {form.cover_letter}</div>}</div>}
        {submitting && <div style={{ padding: 20, color: '#64748b' }}>Đang tải CV và gửi hồ sơ ứng tuyển...</div>}
        {!submitting && !error && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}><button className="g-btn-secondary" onClick={() => setStep(2)}>Quay lại</button><button className="g-btn-primary" onClick={submit}>Gửi hồ sơ</button></div>}
        {error && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}><button className="g-btn-secondary" onClick={() => setStep(2)}>Quay lại</button><button className="g-btn-primary" onClick={submit}>Thử gửi lại</button></div>}
      </section>}
    </div>
  );
};

export default CandidateApplyWizard;