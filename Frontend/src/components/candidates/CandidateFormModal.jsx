import React, { useEffect, useState } from 'react';
import candidateApi from '../../api/candidateApi';
import { FiUpload, FiFileText, FiX } from 'react-icons/fi';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  source_code: '',
  recruitment_request_id: '',
  resume_url: ''
};

const DEFAULT_SOURCES = [
  { code: 'LINKEDIN', name: 'LinkedIn' },
  { code: 'TOPCV', name: 'TopCV' },
  { code: 'VIETNAMWORKS', name: 'VietnamWorks' },
  { code: 'REFERRAL', name: 'Giới thiệu nội bộ' },
  { code: 'FACEBOOK', name: 'Facebook' },
  { code: 'OTHER', name: 'Nguồn khác' },
];

const DEFAULT_POSITIONS = [
  { id: 1, name: 'Frontend Developer (Phòng Công nghệ thông tin)' },
  { id: 2, name: 'Backend Developer (Phòng Công nghệ thông tin)' },
  { id: 3, name: 'Fullstack Developer (Phòng Công nghệ thông tin)' },
  { id: 4, name: 'Chuyên viên Nhân sự (Phòng Nhân sự)' },
  { id: 5, name: 'Tester / QA QC (Phòng Đảm bảo chất lượng)' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9][0-9\s.\-()]{7,19}$/;

const errorStyle = { color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' };

export function validateCandidateForm(form) {
  const errors = {};
  if (!form.full_name?.trim()) errors.full_name = 'Vui lòng nhập họ và tên.';
  if (!form.email?.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Email không đúng định dạng.';
  if (!form.phone?.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!PHONE_REGEX.test(form.phone.trim())) errors.phone = 'Số điện thoại không hợp lệ.';
  if (!form.recruitment_request_id) errors.recruitment_request_id = 'Vui lòng chọn vị trí tuyển dụng.';
  if (!form.source_code) errors.source_code = 'Vui lòng chọn nguồn ứng viên.';
  return errors;
}

const Field = ({ label, error, required = true, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label className="g-form-label">
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
    {error && <div role="alert" style={errorStyle}>{error}</div>}
  </div>
);

/**
 * Modal thêm hồ sơ ứng viên thủ công.
 * Hỗ trợ chọn nguồn, vị trí tuyển dụng, đính kèm file CV (.pdf, .doc, .docx) và link CV.
 */
const CandidateFormModal = ({ open, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [resumeFile, setResumeFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [requests, setRequests] = useState(DEFAULT_POSITIONS);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setResumeFile(null);
    setFileError('');
    setErrors({});
    setFormError('');
    setDuplicates([]);

    // 1. Tải danh mục nguồn ứng viên (với fallback mặc định luôn sẵn sàng)
    candidateApi.getMasterData()
      .then(res => {
        const raw = res.data?.data || [];
        const filtered = raw.filter(x => x.category_group === 'CANDIDATE_SOURCE' && (x.is_active === 1 || x.is_active === true));
        if (filtered.length > 0) {
          setSources(filtered);
        } else {
          setSources(DEFAULT_SOURCES);
        }
      })
      .catch(() => {
        setSources(DEFAULT_SOURCES);
      });

    // 2. Tải danh sách vị trí tuyển dụng (ưu tiên API /candidates/positions)
    const loadPositions = async () => {
      try {
        const res = await candidateApi.getPositions();
        const list = res.data?.data || [];
        if (list.length > 0) {
          setRequests(list);
          return;
        }
      } catch {
        // Dự phòng khi gọi getPositions không thành công
      }

      try {
        const myRes = await candidateApi.getMyRequests();
        const myList = (myRes.data?.data || []).filter(r => r.status === 'APPROVED');
        if (myList.length > 0) {
          setRequests(myList);
          return;
        }
      } catch {
        // Dự phòng trường hợp lỗi
      }

      setRequests(DEFAULT_POSITIONS);
    };

    loadPositions();
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    if (name === 'email' || name === 'phone') setDuplicates([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setFileError('CV phải có định dạng .pdf, .doc hoặc .docx');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Dung lượng tệp CV không được vượt quá 10 MB');
      return;
    }

    setFileError('');
    setResumeFile(file);
  };

  const handleRemoveFile = () => {
    setResumeFile(null);
    setFileError('');
  };

  const save = async (primaryCandidate = null, allowDuplicate = false) => {
    setSaving(true);
    setFormError('');
    try {
      let payload;
      if (resumeFile) {
        payload = new FormData();
        payload.append('full_name', form.full_name.trim());
        payload.append('email', form.email.trim());
        payload.append('phone', form.phone.trim());
        payload.append('source_code', form.source_code);
        payload.append('recruitment_request_id', form.recruitment_request_id);
        payload.append('allow_duplicate', allowDuplicate || Boolean(primaryCandidate));
        payload.append('resume', resumeFile);
        if (form.resume_url?.trim()) {
          payload.append('resume_url', form.resume_url.trim());
        }
      } else {
        payload = {
          ...form,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          resume_url: form.resume_url?.trim() || undefined,
          allow_duplicate: allowDuplicate || Boolean(primaryCandidate)
        };
      }

      const res = await candidateApi.create(payload);
      if (primaryCandidate) {
        await candidateApi.merge({ primary_id: primaryCandidate.id, secondary_id: res.data.data.id });
      }
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.duplicates) {
        setDuplicates(data.duplicates);
        setFormError('Phát hiện hồ sơ trùng. Hãy so sánh trước khi tiếp tục.');
      } else if (err.response?.status === 400 && data?.errors) {
        setErrors(data.errors);
        setFormError(data.message);
      } else if (err.response?.status === 403) {
        setFormError('Bạn không có quyền thêm hồ sơ ứng viên.');
      } else {
        setFormError(data?.message || 'Có lỗi xảy ra khi tạo ứng viên.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateCandidateForm(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    save();
  };

  const inputStyle = (name) => (errors[name] ? { borderColor: '#ef4444' } : undefined);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3>Thêm hồ sơ ứng viên thủ công</h3>
        <p className="g-page-subtitle" style={{ marginBottom: 16 }}>Nhập hồ sơ ứng viên từ các nguồn bên ngoài (LinkedIn, TopCV, giới thiệu...).</p>

        {formError && (
          <div className="alert alert-error" role="alert">{formError}</div>
        )}

        {duplicates.length > 0 && (
          <section style={{ display: 'grid', gap: 10, padding: 14, marginBottom: 16, background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8 }}>
            <strong style={{ color: '#92400e' }}>Hồ sơ có thông tin trùng</strong>
            {duplicates.map(c => (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>#{c.id} – {c.full_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{c.email} · {c.phone || 'Chưa có SĐT'} · {c.position_name || 'Chưa gắn vị trí'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="g-btn-primary" disabled={saving} onClick={() => save(c)}>Giữ hồ sơ hiện có và gộp</button>
                  <button type="button" className="g-btn-secondary" disabled={saving} onClick={() => save(null, true)}>Lưu riêng, không gộp</button>
                </div>
              </div>
            ))}
          </section>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="g-form-grid">
            <Field label="Họ và tên" error={errors.full_name}>
              <input name="full_name" className="g-form-input" style={inputStyle('full_name')} value={form.full_name} onChange={handleChange} placeholder="VD: Nguyễn Văn A" />
            </Field>
            <Field label="Email" error={errors.email}>
              <input name="email" type="email" className="g-form-input" style={inputStyle('email')} value={form.email} onChange={handleChange} placeholder="VD: nva@gmail.com" />
            </Field>
            <Field label="Số điện thoại" error={errors.phone}>
              <input name="phone" className="g-form-input" style={inputStyle('phone')} value={form.phone} onChange={handleChange} placeholder="VD: 0987654321" />
            </Field>
            <Field label="Nguồn ứng viên" error={errors.source_code}>
              <select name="source_code" className="g-form-input" style={inputStyle('source_code')} value={form.source_code} onChange={handleChange}>
                <option value="">-- Chọn nguồn ứng viên --</option>
                {sources.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Vị trí tuyển dụng" error={errors.recruitment_request_id}>
              <select name="recruitment_request_id" className="g-form-input" style={inputStyle('recruitment_request_id')} value={form.recruitment_request_id} onChange={handleChange}>
                <option value="">-- Chọn vị trí tuyển dụng --</option>
                {requests.map(r => {
                  const label = r.name || (r.position_name ? (r.department_name ? `#${r.id} - ${r.position_name} (${r.department_name})` : r.position_name) : `#${r.id}`);
                  return (
                    <option key={r.id} value={r.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </Field>
          </div>

          {/* Đính kèm CV (.pdf, .doc, .docx) */}
          <div style={{ marginTop: 16 }}>
            <label className="g-form-label">Tệp đính kèm CV (.pdf, .doc, .docx)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                backgroundColor: '#f8fafc'
              }}>
                <input
                  type="file"
                  id="manual-candidate-cv-input"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="manual-candidate-cv-input"
                  className="g-btn-secondary"
                  style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  <FiUpload /> Chọn tệp CV
                </label>
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', color: resumeFile ? '#0f172a' : '#64748b' }}>
                  {resumeFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FiFileText style={{ color: '#2563eb' }} />
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {resumeFile.name}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                        ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 4px',
                          marginLeft: 4
                        }}
                        title="Xóa tệp đã chọn"
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <span>Chưa chọn tệp (Hỗ trợ PDF, DOC, DOCX tối đa 10MB)</span>
                  )}
                </div>
              </div>
              {fileError && <div role="alert" style={errorStyle}>{fileError}</div>}
            </div>
          </div>

          {/* Hoặc liên kết CV */}
          <div style={{ marginTop: 14 }}>
            <label className="g-form-label">Hoặc Đường dẫn liên kết CV (Link online, Drive, LinkedIn...)</label>
            <input
              name="resume_url"
              className="g-form-input"
              value={form.resume_url}
              onChange={handleChange}
              placeholder="https://drive.google.com/... hoặc link CV ứng viên"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="g-btn-secondary" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="g-btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateFormModal;
