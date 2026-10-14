import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiCalendar, FiCheck, FiEye, FiGlobe, FiMapPin, FiSend, FiX } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:3000/api';

const statusLabels = { DRAFT: 'Bản nháp', PENDING_REVIEW: 'Chờ duyệt', APPROVED: 'Đã duyệt', PUBLISHED: 'Đã xuất bản', REJECTED: 'Bị từ chối', CLOSED: 'Đã đóng' };
const statusStyle = {
  DRAFT: { color: '#475569', background: '#f1f5f9' },
  PENDING_REVIEW: { color: '#c2410c', background: '#ffedd5' },
  APPROVED: { color: '#1d4ed8', background: '#dbeafe' },
  PUBLISHED: { color: '#15803d', background: '#dcfce7' },
  REJECTED: { color: '#b91c1c', background: '#fee2e2' },
  CLOSED: { color: '#475569', background: '#f1f5f9' }
};
const formatDate = value => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
const formatDateTime = value => value ? new Date(value).toLocaleString('vi-VN') : '';

const JobPostingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));
  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const loadPosting = async () => {
    try {
      const response = await axios.get(`${API}/job-postings/${id}/preview`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setPosting(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải chi tiết tin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosting(); }, [id]);

  const review = async (approved) => {
    if (!approved && !reviewNote.trim()) {
      setError('Vui lòng nhập lý do nếu từ chối tin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved, note: reviewNote }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setReviewNote('');
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái duyệt.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`${API}/job-postings/${id}/publish`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xuất bản tin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Đang tải tin tuyển dụng...</div>;
  if (!posting) return <div className="alert alert-error">{error || 'Không tìm thấy tin tuyển dụng.'}</div>;

  const timeline = [
    { title: 'Tạo bản nháp', name: posting.created_by_name, date: posting.created_at },
    posting.submitted_at && { title: 'Gửi duyệt', name: posting.submitted_by_name, date: posting.submitted_at },
    posting.reviewed_at && { title: posting.status === 'REJECTED' ? 'Từ chối tin' : 'Duyệt tin', name: posting.reviewed_by_name, date: posting.reviewed_at },
    posting.published_at && { title: 'Xuất bản công khai', name: posting.published_by_name, date: posting.published_at }
  ].filter(Boolean);

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div><h1 className="g-page-title">Chi tiết tin tuyển dụng</h1><p className="g-page-subtitle">Xem thông tin và xử lý duyệt tin tuyển dụng</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link className="g-btn-secondary" to="/job-postings"><FiArrowLeft /> Quay lại</Link>
          <span className="badge" style={{ ...(statusStyle[posting.status] || statusStyle.DRAFT), padding: '7px 10px', borderRadius: 6, fontWeight: 700 }}>{statusLabels[posting.status] || posting.status}</span>
        </div>
      </header>

      {error && <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(260px, .9fr)', gap: 12 }}>
        <article className="g-card" style={{ padding: 16, margin: 0 }}>
          <h2 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: 21 }}>{posting.title}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>
            <span><FiBriefcase /> {posting.department_name || '-'}</span>
            <span><FiMapPin /> {posting.location_name || posting.work_location || '-'}</span>
            <span>{posting.salary_display || 'Thỏa thuận'}</span>
            <span><FiCalendar /> Hạn nộp: {formatDate(posting.deadline)}</span>
          </div>
          <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
            <section><h3 style={{ margin: '0 0 5px', fontSize: 14 }}>Mô tả công việc</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.55 }}>{posting.description || '-'}</div></section>
            {posting.requirements && <section><h3 style={{ margin: '0 0 5px', fontSize: 14 }}>Yêu cầu ứng viên</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.55 }}>{posting.requirements}</div></section>}
            {posting.benefits && <section><h3 style={{ margin: '0 0 5px', fontSize: 14 }}>Quyền lợi</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.55 }}>{posting.benefits}</div></section>}
          </div>
        </article>

        <aside style={{ display: 'grid', alignContent: 'start', gap: 12 }}>
          <section className="g-card" style={{ padding: 14, margin: 0 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 14 }}>Thông tin chung</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '7px 8px', margin: 0, fontSize: 12 }}>
              <dt style={{ color: '#64748b' }}>Mã tin</dt><dd style={{ margin: 0 }}>JOB-{String(posting.id).padStart(4, '0')}</dd>
              <dt style={{ color: '#64748b' }}>Từ yêu cầu</dt><dd style={{ margin: 0 }}>REQ-{String(posting.recruitment_request_id).padStart(4, '0')}</dd>
              <dt style={{ color: '#64748b' }}>Vị trí tuyển dụng</dt><dd style={{ margin: 0 }}>{posting.position_name || '-'}</dd>
              <dt style={{ color: '#64748b' }}>Phòng ban</dt><dd style={{ margin: 0 }}>{posting.department_name || '-'}</dd>
              <dt style={{ color: '#64748b' }}>Số lượng</dt><dd style={{ margin: 0 }}>{posting.headcount || '-'}</dd>
              <dt style={{ color: '#64748b' }}>Mức lương</dt><dd style={{ margin: 0 }}>{posting.salary_display || 'Thỏa thuận'}</dd>
              <dt style={{ color: '#64748b' }}>Trạng thái</dt><dd style={{ margin: 0 }}><span className="badge" style={statusStyle[posting.status]}>{statusLabels[posting.status]}</span></dd>
              <dt style={{ color: '#64748b' }}>Người tạo</dt><dd style={{ margin: 0 }}>{posting.created_by_name || '-'}</dd>
            </dl>
          </section>
          <section className="g-card" style={{ padding: 14, margin: 0 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 14 }}>Lịch sử duyệt</h2>
            <div style={{ display: 'grid', gap: 0 }}>
              {timeline.map((item, index) => <div key={`${item.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 8, minHeight: 42 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: index === timeline.length - 1 ? '#4f46e5' : '#a5b4fc', marginTop: 3 }} />{index < timeline.length - 1 && <span style={{ width: 2, flex: 1, background: '#e2e8f0' }} />}</div>
                <div style={{ paddingBottom: 9, fontSize: 12 }}><strong>{item.title}</strong><div style={{ color: '#64748b' }}>{item.name || 'Hệ thống'} · {formatDateTime(item.date)}</div></div>
              </div>)}
            </div>
          </section>
        </aside>
      </section>

      {posting.status === 'PENDING_REVIEW' && canReview && (
        <section className="g-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'end', padding: 12, margin: '12px 0 0' }}>
          <label style={{ display: 'grid', gap: 5, color: '#334155', fontSize: 12, fontWeight: 700 }}>Ý kiến phê duyệt (nếu từ chối)
            <textarea rows={2} value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Nhập lý do từ chối hoặc yêu cầu chỉnh sửa..." className="g-form-input" style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', gap: 7 }}>
            <button className="g-btn-secondary" type="button" onClick={() => navigate('/job-postings')}>Hủy</button>
            <button className="btn-action-delete" type="button" disabled={saving || !reviewNote.trim()} onClick={() => review(false)}><FiX /> Từ chối</button>
            <button className="g-btn-primary" type="button" disabled={saving} onClick={() => review(true)}><FiCheck /> Duyệt</button>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <Link className="g-btn-secondary" to={`/job-postings/${id}/preview`}><FiEye /> Xem trước</Link>
        {posting.status === 'APPROVED' && canReview && <button className="g-btn-primary" disabled={saving} onClick={publish}><FiGlobe /> Xuất bản</button>}
        {['DRAFT', 'REJECTED'].includes(posting.status) && <Link className="g-btn-primary" to={`/job-postings/${id}/edit`}><FiSend /> Gửi chỉnh sửa</Link>}
      </div>
    </div>
  );
};

export default JobPostingDetail;