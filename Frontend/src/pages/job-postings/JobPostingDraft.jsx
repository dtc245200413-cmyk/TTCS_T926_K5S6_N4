import { API_BASE_URL } from '../../config/api';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBold,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiDollarSign,
  FiInfo,
  FiItalic,
  FiList,
  FiMapPin,
  FiSave,
  FiSearch,
  FiSend,
  FiTag,
  FiUnderline
} from 'react-icons/fi';

const API = API_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
const formatSalary = (min, max) => {
  if (!min && !max) return 'Thỏa thuận';
  return `${Number(min || 0).toLocaleString('vi-VN')} - ${Number(max || 0).toLocaleString('vi-VN')} VNĐ`;
};

const JobPostingDraft = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  // Wizard step: 1 (Chọn yêu cầu), 2 (Soạn nội dung), 3 (Xem lại & gửi duyệt)
  const [step, setStep] = useState(editing ? 2 : 1);

  const [requests, setRequests] = useState([]);
  const [requestSearch, setRequestSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form data
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    deadline: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (editing) {
          const response = await axios.get(`${API}/job-postings/${id}/preview`, { headers: headers() });
          const posting = response.data.data;
          setSelectedRequest(posting);
          setForm({
            title: posting.title || '',
            description: posting.description || '',
            requirements: posting.requirements || '',
            benefits: posting.benefits || '',
            deadline: posting.deadline ? String(posting.deadline).slice(0, 10) : ''
          });
          setStep(2);
        } else {
          const response = await axios.get(`${API}/job-postings/eligible-requests`, { headers: headers() });
          const eligible = response.data.data || [];
          setRequests(eligible);

          const paramRequestId = searchParams.get('request_id');
          if (paramRequestId) {
            const matched = eligible.find(item => String(item.id) === paramRequestId);
            if (matched) {
              chooseRequest(matched);
              setStep(2);
            }
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin yêu cầu tuyển dụng.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editing, id, searchParams]);

  const chooseRequest = (req) => {
    setSelectedRequest(req);
    setForm(current => ({
      ...current,
      title: req.position_name || current.title,
      description: req.job_description || current.description,
      requirements: req.candidate_requirements || current.requirements,
      benefits: current.benefits || '• Lương thưởng hấp dẫn theo năng lực.\n• Tham gia đầy đủ BHXH, BHYT, BHTN.\n• Môi trường làm việc năng động, chuyên nghiệp.',
      deadline: req.needed_by_date ? String(req.needed_by_date).slice(0, 10) : current.deadline
    }));
  };

  const filteredRequests = requests.filter(req => {
    const kw = requestSearch.trim().toLowerCase();
    if (!kw) return true;
    const s = [req.position_name, req.department_name, `REQ-${String(req.id).padStart(3, '0')}`].filter(Boolean).join(' ').toLowerCase();
    return s.includes(kw);
  });

  const handleNextToStep2 = () => {
    if (!selectedRequest) {
      setError('Vui lòng chọn một yêu cầu tuyển dụng đã được duyệt.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (!form.title.trim()) {
      setError('Vui lòng nhập tiêu đề tin tuyển dụng.');
      return;
    }
    if (!form.description.trim()) {
      setError('Vui lòng nhập mô tả công việc.');
      return;
    }
    if (!form.requirements.trim()) {
      setError('Vui lòng nhập yêu cầu ứng viên.');
      return;
    }
    if (!form.deadline) {
      setError('Vui lòng chọn hạn nhận hồ sơ.');
      return;
    }
    setError('');
    setStep(3);
  };

  const saveAction = async (andSubmit = false) => {
    setSaving(true);
    setError('');
    try {
      let targetId = id;
      if (editing) {
        await axios.put(`${API}/job-postings/${id}`, form, { headers: headers() });
      } else {
        const response = await axios.post(`${API}/job-postings`, {
          ...form,
          recruitment_request_id: Number(selectedRequest?.recruitment_request_id || selectedRequest?.id)
        }, { headers: headers() });
        targetId = response.data.data?.id;
      }

      if (andSubmit && targetId) {
        await axios.post(`${API}/job-postings/${targetId}/submit`, {}, { headers: headers() });
      }

      navigate('/job-postings');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Không thể lưu tin tuyển dụng.');
    } finally {
      setSaving(false);
    }
  };

  // Helper insertion for rich text toolbar
  const insertFormatting = (prefix, suffix = '') => {
    setForm(curr => ({
      ...curr,
      description: curr.description + `\n${prefix} `
    }));
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>;

  return (
    <div className="g-page-container" style={{ padding: '24px 32px', maxWidth: 1060, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        <FiTag size={14} />
        <Link to="/job-postings" style={{ color: '#64748b', textDecoration: 'none' }}>Tin tuyển dụng</Link>
        <span>&gt;</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Soạn tin tuyển dụng</span>
      </div>

      {/* Page Title */}
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 24px' }}>
        {editing ? 'Chỉnh sửa tin tuyển dụng' : 'Soạn tin tuyển dụng'}
      </h1>

      {/* Stepper Progress Bar (Chính xác theo Image 2 & 3) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', maxWidth: 650, margin: '0 auto 32px' }}>
        {/* Step 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, cursor: !editing ? 'pointer' : 'default' }} onClick={() => !editing && setStep(1)}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: step >= 1 ? '#2563eb' : '#e2e8f0',
            color: step >= 1 ? '#fff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13
          }}>
            1
          </div>
          <span style={{ marginTop: 8, fontSize: 13, fontWeight: step === 1 ? 700 : 500, color: step === 1 ? '#2563eb' : '#64748b' }}>
            Chọn yêu cầu
          </span>
        </div>

        {/* Line 1 -> 2 */}
        <div style={{ flex: 1, height: 2, background: step >= 2 ? '#2563eb' : '#e2e8f0', margin: '-22px 12px 0' }} />

        {/* Step 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, cursor: selectedRequest ? 'pointer' : 'default' }} onClick={() => selectedRequest && setStep(2)}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: step >= 2 ? '#2563eb' : '#e2e8f0',
            color: step >= 2 ? '#fff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13
          }}>
            2
          </div>
          <span style={{ marginTop: 8, fontSize: 13, fontWeight: step === 2 ? 700 : 500, color: step === 2 ? '#2563eb' : '#64748b' }}>
            Soạn nội dung
          </span>
        </div>

        {/* Line 2 -> 3 */}
        <div style={{ flex: 1, height: 2, background: step >= 3 ? '#2563eb' : '#e2e8f0', margin: '-22px 12px 0' }} />

        {/* Step 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: step === 3 ? '#2563eb' : '#e2e8f0',
            color: step === 3 ? '#fff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13
          }}>
            3
          </div>
          <span style={{ marginTop: 8, fontSize: 13, fontWeight: step === 3 ? 700 : 500, color: step === 3 ? '#2563eb' : '#64748b' }}>
            Xem lại & gửi duyệt
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Review note notice if returned for edits */}
      {selectedRequest?.review_note && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontWeight: 700, fontSize: 13 }}>
            <FiAlertCircle /> Ý kiến yêu cầu chỉnh sửa từ Trưởng phòng:
          </div>
          <div style={{ color: '#7f1d1d', fontSize: 13, marginTop: 4 }}>
            {selectedRequest.review_note}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: CHỌN YÊU CẦU TUYỂN DỤNG ĐÃ ĐƯỢC DUYỆT (Chính xác theo Image 2) */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
            1. Chọn yêu cầu tuyển dụng đã được duyệt
          </h2>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} size={16} />
            <input
              value={requestSearch}
              onChange={e => setRequestSearch(e.target.value)}
              placeholder="Tìm yêu cầu theo vị trí, phòng ban..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Table */}
          {filteredRequests.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              {requests.length ? 'Không tìm thấy yêu cầu phù hợp.' : 'Chưa có yêu cầu tuyển dụng nào đã duyệt đủ điều kiện tạo tin.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px', width: 36, textAlign: 'center' }}>#</th>
                    <th style={{ padding: '12px 14px' }}>Mã yêu cầu</th>
                    <th style={{ padding: '12px 14px' }}>Vị trí tuyển dụng</th>
                    <th style={{ padding: '12px 14px' }}>Phòng ban</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Số lượng</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Ngày duyệt</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', width: 90 }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => {
                    const isSelected = selectedRequest?.id === req.id || selectedRequest?.recruitment_request_id === req.id;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => chooseRequest(req)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <input
                            type="radio"
                            name="selected_request"
                            checked={isSelected}
                            onChange={() => chooseRequest(req)}
                            style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155', fontSize: 13 }}>
                          REQ-{String(req.id).padStart(3, '0')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                          {req.position_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: 13 }}>
                          {req.department_name}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                          {req.headcount}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                          {formatDate(req.updated_at || req.created_at)}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); chooseRequest(req); }}
                            style={{
                              padding: '5px 14px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              background: '#2563eb',
                              color: '#fff',
                              border: 0,
                              cursor: 'pointer'
                            }}
                          >
                            Chọn
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Bar Step 1 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <Link
              to="/job-postings"
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#fff',
                border: '1px solid #cbd5e1',
                textDecoration: 'none'
              }}
            >
              Hủy
            </Link>
            <button
              type="button"
              disabled={!selectedRequest}
              onClick={handleNextToStep2}
              style={{
                padding: '9px 20px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                background: selectedRequest ? '#2563eb' : '#94a3b8',
                border: 0,
                cursor: selectedRequest ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Tiếp tục <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SOẠN NỘI DUNG TIN TUYỂN DỤNG (Chính xác theo Image 3) */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Info Banner */}
          {selectedRequest && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 13,
              color: '#1e40af'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 2 }}>
                <FiInfo size={16} /> Yêu cầu tuyển dụng: REQ-{String(selectedRequest.recruitment_request_id || selectedRequest.id).padStart(3, '0')}
              </div>
              <div style={{ color: '#334155', fontSize: 13, marginTop: 4 }}>
                Vị trí: <strong>{selectedRequest.position_name || '-'}</strong> &nbsp;|&nbsp;
                Phòng ban: <strong>{selectedRequest.department_name || '-'}</strong> &nbsp;|&nbsp;
                Số lượng: <strong>{selectedRequest.headcount || 1}</strong>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 1. Tiêu đề tin */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Tiêu đề tin tuyển dụng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={e => setForm(c => ({ ...c, title: e.target.value }))}
                placeholder="Ví dụ: Chuyên viên Tiếp thị số (Digital Marketing)"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 2. Mô tả công việc with Toolbar */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Mô tả công việc <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 12, padding: '7px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 14 }}>
                  <button type="button" onClick={() => insertFormatting('•')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} title="Gạch đầu dòng"><FiList size={15} /></button>
                  <button type="button" onClick={() => insertFormatting('-')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} title="Thêm mục"><FiBold size={15} /></button>
                  <button type="button" onClick={() => insertFormatting('*')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} title="Nghiêng"><FiItalic size={15} /></button>
                  <button type="button" onClick={() => insertFormatting('_')} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} title="Gạch chân"><FiUnderline size={15} /></button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={form.description}
                  onChange={e => setForm(c => ({ ...c, description: e.target.value }))}
                  placeholder="• Xây dựng và triển khai chiến dịch...&#10;• Quản lý kênh digital...&#10;• Phối hợp với các phòng ban liên quan..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: 0,
                    outline: 'none',
                    fontSize: 13,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* 3. Yêu cầu ứng viên */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Yêu cầu ứng viên <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                rows={5}
                value={form.requirements}
                onChange={e => setForm(c => ({ ...c, requirements: e.target.value }))}
                placeholder="• Tốt nghiệp chuyên ngành Marketing hoặc liên quan...&#10;• Có ít nhất 1 năm kinh nghiệm...&#10;• Kỹ năng giao tiếp, làm việc nhóm tốt..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 4. Quyền lợi */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Quyền lợi & đãi ngộ
              </label>
              <textarea
                rows={4}
                value={form.benefits}
                onChange={e => setForm(c => ({ ...c, benefits: e.target.value }))}
                placeholder="• Mức lương thưởng hấp dẫn...&#10;• Đóng BHXH, BHYT đầy đủ...&#10;• Thưởng lễ tết, du lịch hằng năm..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  lineHeight: 1.6,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* 5. Hạn nhận hồ sơ */}
            <div style={{ maxWidth: 260 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Hạn nhận hồ sơ <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                required
                type="date"
                value={form.deadline}
                onChange={e => setForm(c => ({ ...c, deadline: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Bottom Bar Step 2 (Chính xác theo Image 3) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAction(false)}
              style={{
                padding: '9px 18px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#fff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FiArrowLeft size={14} /> Quay lại
                </button>
              )}

              <button
                type="button"
                onClick={handleNextToStep3}
                style={{
                  padding: '9px 22px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#2563eb',
                  border: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Tiếp tục <FiArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: XEM LẠI & GỬI DUYỆT (Review and Submit) */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
            3. Xem lại thông tin tin tuyển dụng trước khi gửi duyệt
          </h2>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, background: '#fafafa', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedRequest?.department_name || 'Phòng ban'} · {selectedRequest?.position_name || 'Vị trí'}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>
                  {form.title}
                </h3>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: '#f1f5f9', color: '#475569' }}>
                Bản nháp
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#475569', marginBottom: 16 }}>
              <span><FiBriefcase style={{ verticalAlign: 'middle', marginRight: 4 }} /> {selectedRequest?.work_type_name || 'Toàn thời gian'}</span>
              <span><FiMapPin style={{ verticalAlign: 'middle', marginRight: 4 }} /> {selectedRequest?.location_name || 'Văn phòng'}</span>
              <span style={{ color: '#2563eb', fontWeight: 700 }}><FiDollarSign style={{ verticalAlign: 'middle' }} /> {formatSalary(selectedRequest?.proposed_salary_min, selectedRequest?.proposed_salary_max)}</span>
              <span><FiCalendar style={{ verticalAlign: 'middle', marginRight: 4 }} /> Hạn nhận: <strong style={{ color: '#ef4444' }}>{formatDate(form.deadline)}</strong></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Mô tả công việc:</h4>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#334155', lineHeight: 1.6, background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  {form.description}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Yêu cầu ứng viên:</h4>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#334155', lineHeight: 1.6, background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  {form.requirements}
                </div>
              </div>

              {form.benefits && (
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Quyền lợi & đãi ngộ:</h4>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#334155', lineHeight: 1.6, background: '#fff', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    {form.benefits}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar Step 3 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveAction(false)}
              style={{
                padding: '9px 18px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                background: '#fff',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu bản nháp'}
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FiArrowLeft size={14} /> Quay lại
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => saveAction(true)}
                style={{
                  padding: '9px 24px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#2563eb',
                  border: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                }}
              >
                <FiSend size={14} /> {saving ? 'Đang gửi...' : 'Gửi duyệt tin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingDraft;
