import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBold, FiItalic, FiList, FiSave } from 'react-icons/fi';

const API = 'http://localhost:5000/api';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#1e293b', fontSize: 13 };
const labelStyle = { display: 'grid', gap: 6, color: '#334155', fontSize: 12, fontWeight: 700 };

const formatSalary = (min, max) => {
  if (!min && !max) return 'Thỏa thuận';
  return `${Number(min || 0).toLocaleString('vi-VN')} - ${Number(max || 0).toLocaleString('vi-VN')} VNĐ`;
};

const JobPostingDraft = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [requests, setRequests] = useState([]);
  const [request, setRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [form, setForm] = useState({ title: '', description: '', requirements: '', benefits: '', deadline: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (editing) {
          const response = await axios.get(`${API}/job-postings/${id}/preview`, { headers: headers() });
          const posting = response.data.data;
          setRequest(posting);
          setSelectedRequestId(String(posting.recruitment_request_id));
          setForm({
            title: posting.title || '',
            description: posting.description || '',
            requirements: posting.requirements || '',
            benefits: posting.benefits || '',
            deadline: posting.deadline ? String(posting.deadline).slice(0, 10) : ''
          });
        } else {
          const response = await axios.get(`${API}/job-postings/eligible-requests`, { headers: headers() });
          setRequests(response.data.data || []);
        }
      } catch (loadError) {
        setError(loadError.response?.data?.message || 'Không thể tải thông tin yêu cầu tuyển dụng.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editing, id]);

  const selectRequest = (value) => {
    setSelectedRequestId(value);
    const selected = requests.find(item => String(item.id) === value);
    setRequest(selected || null);
    if (selected) {
      setForm(current => ({
        ...current,
        title: selected.position_name || '',
        description: selected.job_description || '',
        requirements: selected.candidate_requirements || '',
        benefits: '',
        deadline: selected.needed_by_date ? String(selected.needed_by_date).slice(0, 10) : ''
      }));
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await axios.put(`${API}/job-postings/${id}`, form, { headers: headers() });
      } else {
        await axios.post(`${API}/job-postings`, { ...form, recruitment_request_id: Number(selectedRequestId) }, { headers: headers() });
      }
      navigate('/job-postings');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Không thể lưu bản nháp.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Đang tải dữ liệu...</div>;

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div><h1 className="g-page-title">{editing ? 'Chỉnh sửa bản nháp' : 'Tạo bản nháp tin tuyển dụng'}</h1><p className="g-page-subtitle">{editing ? 'Cập nhật nội dung trước khi gửi duyệt' : 'Tạo tin từ yêu cầu tuyển dụng đã được phê duyệt'}</p></div>
        <Link className="g-btn-secondary" to="/job-postings"><FiArrowLeft /> Quay lại</Link>
      </header>

      {error && <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {!editing && (
        <section className="g-card" style={{ padding: 12, marginBottom: 12 }}>
          {requests.length > 0 ? (
            <label style={{ ...labelStyle, maxWidth: 680 }} htmlFor="approved-request">Yêu cầu tuyển dụng đã duyệt <span style={{ color: '#ef4444' }}>*</span>
              <select id="approved-request" className="g-form-input" required value={selectedRequestId} onChange={event => selectRequest(event.target.value)}>
                <option value="">Chọn yêu cầu tuyển dụng</option>
                {requests.map(item => <option key={item.id} value={item.id}>REQ-{String(item.id).padStart(4, '0')} · {item.position_name} · {item.department_name}</option>)}
              </select>
            </label>
          ) : (
            <div role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '10px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
              <div>
                <strong style={{ color: '#1e3a8a', fontSize: 13 }}>Chưa có yêu cầu tuyển dụng đủ điều kiện tạo tin</strong>
                <p style={{ margin: '3px 0 0', color: '#475569', fontSize: 12 }}>Chỉ yêu cầu đã duyệt và chưa có tin đang chờ duyệt, đã duyệt hoặc xuất bản mới xuất hiện tại đây.</p>
              </div>
              <Link className="g-btn-secondary" to="/recruitment-requests" style={{ flexShrink: 0 }}>Xem yêu cầu</Link>
            </div>
          )}
        </section>
      )}

      {request && (
        <section className="g-card" style={{ padding: 12, marginBottom: 12 }}>
          <h2 className="g-card-title" style={{ margin: '0 0 8px', paddingBottom: 7, fontSize: 14 }}>Thông tin yêu cầu</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12 }}>
            <div><span style={{ color: '#64748b' }}>Mã yêu cầu:</span><strong style={{ marginLeft: 8 }}>REQ-{String(request.recruitment_request_id || request.id).padStart(4, '0')}</strong></div>
            <div><span style={{ color: '#64748b' }}>Số lượng:</span><strong style={{ marginLeft: 8 }}>{request.headcount || '-'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Vị trí:</span><strong style={{ marginLeft: 8 }}>{request.position_name || '-'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Mức lương:</span><strong style={{ marginLeft: 8 }}>{formatSalary(request.proposed_salary_min, request.proposed_salary_max)}</strong></div>
            <div><span style={{ color: '#64748b' }}>Phòng ban:</span><strong style={{ marginLeft: 8 }}>{request.department_name || '-'}</strong></div>
            <div><span style={{ color: '#64748b' }}>Ngày cần người:</span><strong style={{ marginLeft: 8 }}>{request.needed_by_date ? new Date(request.needed_by_date).toLocaleDateString('vi-VN') : '-'}</strong></div>
            {request.status && <div><span style={{ color: '#64748b' }}>Trạng thái:</span><span className="badge badge-success" style={{ marginLeft: 8 }}>Đã duyệt</span></div>}
            {request.created_by_name && <div><span style={{ color: '#64748b' }}>Người tạo:</span><strong style={{ marginLeft: 8 }}>{request.created_by_name}</strong></div>}
          </div>
        </section>
      )}

      <form onSubmit={saveDraft} className="g-card" style={{ padding: 14, marginBottom: 0 }}>
        <h2 className="g-card-title" style={{ margin: '0 0 10px', paddingBottom: 8, fontSize: 14 }}>Nội dung tin tuyển dụng</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: '9px 14px', alignItems: 'start' }}>
          <label htmlFor="posting-title" style={{ ...labelStyle, paddingTop: 9 }}>Tiêu đề tin <span style={{ color: '#ef4444' }}>*</span></label>
          <input id="posting-title" required className="g-form-input" value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Lập trình viên Backend (Java)" />

          <label htmlFor="posting-description" style={{ ...labelStyle, paddingTop: 9 }}>Mô tả công việc <span style={{ color: '#ef4444' }}>*</span></label>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
            <div aria-hidden="true" style={{ display: 'flex', gap: 10, padding: '7px 10px', color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}><FiBold /><FiItalic /><FiList /></div>
            <textarea id="posting-description" required rows={4} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Nhập nội dung mô tả công việc..." style={{ ...inputStyle, border: 0, borderRadius: 0, resize: 'vertical', lineHeight: 1.55 }} />
          </div>

          <label htmlFor="posting-requirements" style={{ ...labelStyle, paddingTop: 9 }}>Yêu cầu ứng viên <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea id="posting-requirements" required rows={3} className="g-form-input" value={form.requirements} onChange={event => setForm(current => ({ ...current, requirements: event.target.value }))} placeholder="Kinh nghiệm, kỹ năng, trình độ..." style={{ resize: 'vertical', lineHeight: 1.55 }} />

          <label htmlFor="posting-benefits" style={{ ...labelStyle, paddingTop: 9 }}>Quyền lợi</label>
          <textarea id="posting-benefits" rows={3} className="g-form-input" value={form.benefits} onChange={event => setForm(current => ({ ...current, benefits: event.target.value }))} placeholder="Mức lương, thưởng, bảo hiểm, môi trường làm việc..." style={{ resize: 'vertical', lineHeight: 1.55 }} />

          <label htmlFor="posting-deadline" style={{ ...labelStyle, paddingTop: 9 }}>Hạn nhận hồ sơ <span style={{ color: '#ef4444' }}>*</span></label>
          <input id="posting-deadline" required type="date" className="g-form-input" value={form.deadline} onChange={event => setForm(current => ({ ...current, deadline: event.target.value }))} style={{ maxWidth: 260 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
          <Link to="/job-postings" className="g-btn-secondary">Hủy</Link>
          <button type="submit" className="g-btn-primary" disabled={saving || (!editing && !selectedRequestId)}><FiSave /> {saving ? 'Đang lưu...' : 'Lưu bản nháp'}</button>
        </div>
      </form>
    </div>
  );
};

export default JobPostingDraft;