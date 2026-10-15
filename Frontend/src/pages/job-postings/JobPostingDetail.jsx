import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiBriefcase, 
  FiCalendar, 
  FiCheck, 
  FiEye, 
  FiEyeOff, 
  FiGlobe, 
  FiMapPin, 
  FiSend, 
  FiX, 
  FiXCircle,
  FiClock,
  FiAlertTriangle
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const statusLabels = { 
  DRAFT: 'Bản nháp', 
  PENDING_REVIEW: 'Chờ duyệt', 
  APPROVED: 'Đã duyệt', 
  PUBLISHED: 'Đang xuất bản', 
  HIDDEN: 'Đang ẩn', 
  REJECTED: 'Bị từ chối', 
  CLOSED: 'Đã gỡ' 
};

const statusStyle = {
  DRAFT: { color: '#475569', background: '#f1f5f9' },
  PENDING_REVIEW: { color: '#c2410c', background: '#ffedd5' },
  APPROVED: { color: '#1d4ed8', background: '#dbeafe' },
  PUBLISHED: { color: '#15803d', background: '#dcfce7' },
  HIDDEN: { color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe' },
  REJECTED: { color: '#b91c1c', background: '#fee2e2' },
  CLOSED: { color: '#64748b', background: '#f1f5f9' }
};

const formatDate = value => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
const formatDateTime = value => value ? new Date(value).toLocaleString('vi-VN') : '';

const isExpired = (deadlineStr) => {
  if (!deadlineStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
};

const JobPostingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const isRecruiterOrAdmin = user?.roles?.some(role => ['ADMIN', 'RECRUITER'].includes(role.role_code));
  const hasPostingPermission = user?.permissions?.includes('JOB_POSTING_CLOSE');
  const canManagePostings = isRecruiterOrAdmin && hasPostingPermission;

  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));

  const [posting, setPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const loadPosting = async () => {
    try {
      const response = await axios.get(`${API}/job-postings/${id}/preview`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      setPosting(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải chi tiết tin tuyển dụng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosting(); }, [id]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const review = async (approved) => {
    if (!approved && !reviewNote.trim()) {
      setError('Vui lòng nhập lý do nếu từ chối tin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved, note: reviewNote }, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      setReviewNote('');
      showNotification(approved ? 'Tin tuyển dụng đã được phê duyệt.' : 'Tin tuyển dụng đã bị từ chối.');
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
      await axios.post(`${API}/job-postings/${id}/publish`, {}, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
      });
      showNotification('Xuất bản tin tuyển dụng lên trang công khai thành công.');
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xuất bản tin.');
    } finally {
      setSaving(false);
    }
  };

  // Recruiter action: Ẩn tin
  const handleHide = async () => {
    if (!window.confirm(`Ẩn tin "${posting.title}" khỏi trang tuyển dụng công khai?\nỨng viên sẽ không tìm thấy hoặc xem được tin này cho đến khi bạn mở lại.`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${id}/hide`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Đã ẩn tin tuyển dụng khỏi trang công khai thành công.');
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể ẩn tin tuyển dụng.');
    } finally {
      setSaving(false);
    }
  };

  // Recruiter action: Hiện lại tin
  const handleUnhide = async () => {
    if (!window.confirm(`Hiển thị lại tin "${posting.title}" lên trang tuyển dụng công khai?`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${id}/unhide`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Đã hiển thị lại tin tuyển dụng trên trang công khai.');
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể hiển thị lại tin tuyển dụng.');
    } finally {
      setSaving(false);
    }
  };

  // Recruiter action: Gỡ tin
  const handleClose = async () => {
    const expired = isExpired(posting.deadline);
    const confirmMsg = expired 
      ? `Gỡ tin đã hết hiệu lực "${posting.title}" khỏi trang công khai?`
      : `Gỡ vĩnh viễn tin "${posting.title}" khỏi trang tuyển dụng công khai?`;

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${id}/close`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Đã gỡ tin tuyển dụng khỏi trang công khai thành công.');
      await loadPosting();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gỡ tin tuyển dụng.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Đang tải tin tuyển dụng...</div>;
  if (!posting) return <div className="alert alert-error">{error || 'Không tìm thấy tin tuyển dụng.'}</div>;

  const expired = isExpired(posting.deadline);
  const isPublished = posting.status === 'PUBLISHED';
  const isHidden = posting.status === 'HIDDEN';

  const timeline = [
    { title: 'Tạo bản nháp', name: posting.created_by_name, date: posting.created_at },
    posting.submitted_at && { title: 'Gửi duyệt', name: posting.submitted_by_name, date: posting.submitted_at },
    posting.reviewed_at && { title: posting.status === 'REJECTED' ? 'Từ chối tin' : 'Duyệt tin', name: posting.reviewed_by_name, date: posting.reviewed_at },
    posting.published_at && { title: 'Xuất bản công khai', name: posting.published_by_name, date: posting.published_at },
    posting.hidden_at && { title: 'Ẩn tin khỏi trang công khai', name: posting.hidden_by_name, date: posting.hidden_at },
    posting.closed_at && { title: 'Gỡ tin khỏi trang công khai', name: null, date: posting.closed_at }
  ].filter(Boolean);

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div>
          <h1 className="g-page-title">Chi tiết tin tuyển dụng</h1>
          <p className="g-page-subtitle">Xem thông tin chi tiết và quản lý trạng thái hiển thị</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link className="g-btn-secondary" to="/job-postings">
            <FiArrowLeft /> Quay lại danh sách
          </Link>
          <span className="badge" style={{ ...(statusStyle[posting.status] || statusStyle.DRAFT), padding: '7px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
            {statusLabels[posting.status] || posting.status}
          </span>
          {isPublished && expired && (
            <span className="badge badge-danger" style={{ padding: '7px 10px', fontWeight: 700 }}>
              ⚠️ Đã quá hạn
            </span>
          )}
        </div>
      </header>

      {successMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: 14 }}>
          <FiCheck style={{ marginRight: 6 }} /> {successMsg}
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error" style={{ marginBottom: 14 }}>
          <FiAlertTriangle style={{ marginRight: 6 }} /> {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, .9fr)', gap: 14 }}>
        {/* Left: Main Job Posting Information */}
        <article className="g-card" style={{ padding: 20, margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h2 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 22 }}>{posting.title}</h2>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, paddingBottom: 14, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 13 }}>
            <span><FiBriefcase style={{ verticalAlign: 'middle', marginRight: 4 }} /> {posting.department_name || '-'}</span>
            <span><FiMapPin style={{ verticalAlign: 'middle', marginRight: 4 }} /> {posting.location_name || posting.work_location || '-'}</span>
            <strong style={{ color: '#059669' }}>{posting.salary_display || 'Thỏa thuận'}</strong>
            <span style={{ color: expired ? '#dc2626' : 'inherit', fontWeight: expired ? 700 : 400 }}>
              <FiCalendar style={{ verticalAlign: 'middle', marginRight: 4 }} /> Hạn nộp: {formatDate(posting.deadline)}
            </span>
          </div>

          <div style={{ display: 'grid', gap: 18, paddingTop: 16 }}>
            <section>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Mô tả công việc</h3>
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13.5, lineHeight: 1.65 }}>
                {posting.description || '-'}
              </div>
            </section>

            {posting.requirements && (
              <section>
                <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Yêu cầu ứng viên</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13.5, lineHeight: 1.65 }}>
                  {posting.requirements}
                </div>
              </section>
            )}

            {posting.benefits && (
              <section>
                <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Quyền lợi</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13.5, lineHeight: 1.65 }}>
                  {posting.benefits}
                </div>
              </section>
            )}
          </div>
        </article>

        {/* Right: Meta & Status History */}
        <aside style={{ display: 'grid', alignContent: 'start', gap: 14 }}>
          {/* General Metadata */}
          <section className="g-card" style={{ padding: 16, margin: 0 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Thông tin quản trị</h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 10px', margin: 0, fontSize: 12.5 }}>
              <dt style={{ color: '#64748b' }}>Mã tin</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>JOB-{String(posting.id).padStart(4, '0')}</dd>
              <dt style={{ color: '#64748b' }}>Yêu cầu gốc</dt>
              <dd style={{ margin: 0 }}>REQ-{String(posting.recruitment_request_id).padStart(4, '0')}</dd>
              <dt style={{ color: '#64748b' }}>Vị trí tuyển dụng</dt>
              <dd style={{ margin: 0 }}>{posting.position_name || '-'}</dd>
              <dt style={{ color: '#64748b' }}>Phòng ban</dt>
              <dd style={{ margin: 0 }}>{posting.department_name || '-'}</dd>
              <dt style={{ color: '#64748b' }}>Số lượng tuyển</dt>
              <dd style={{ margin: 0 }}>{posting.headcount || 1} nhân sự</dd>
              <dt style={{ color: '#64748b' }}>Trạng thái</dt>
              <dd style={{ margin: 0 }}>
                <span className="badge" style={statusStyle[posting.status]}>{statusLabels[posting.status]}</span>
              </dd>
              <dt style={{ color: '#64748b' }}>Người tạo</dt>
              <dd style={{ margin: 0 }}>{posting.created_by_name || '-'}</dd>
            </dl>
          </section>

          {/* History Timeline */}
          <section className="g-card" style={{ padding: 16, margin: 0 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Lịch sử phê duyệt & xuất bản</h2>
            <div style={{ display: 'grid', gap: 0 }}>
              {timeline.map((item, index) => (
                <div key={`${item.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 10, minHeight: 46 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: index === timeline.length - 1 ? '#4f46e5' : '#a5b4fc', marginTop: 4 }} />
                    {index < timeline.length - 1 && <span style={{ width: 2, flex: 1, background: '#e2e8f0' }} />}
                  </div>
                  <div style={{ paddingBottom: 10, fontSize: 12 }}>
                    <strong>{item.title}</strong>
                    <div style={{ color: '#64748b' }}>{item.name || 'Hệ thống'} · {formatDateTime(item.date)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {/* HR Manager / Admin Review Section */}
      {posting.status === 'PENDING_REVIEW' && canReview && (
        <section className="g-card" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'end', padding: 16, margin: '14px 0 0' }}>
          <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>
            Ý kiến phê duyệt (bắt buộc nếu từ chối)
            <textarea 
              rows={2} 
              value={reviewNote} 
              onChange={e => setReviewNote(e.target.value)} 
              placeholder="Nhập lý do từ chối hoặc góp ý chỉnh sửa..." 
              className="g-form-input" 
              style={{ resize: 'vertical' }} 
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="g-btn-secondary" type="button" onClick={() => navigate('/job-postings')}>Hủy</button>
            <button className="btn-action-delete" type="button" disabled={saving || !reviewNote.trim()} onClick={() => review(false)}>
              <FiX /> Từ chối
            </button>
            <button className="g-btn-primary" type="button" disabled={saving} onClick={() => review(true)}>
              <FiCheck /> Duyệt
            </button>
          </div>
        </section>
      )}

      {/* Recruiter & Admin Action Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 16, padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
        <Link className="g-btn-secondary" to={`/job-postings/${id}/preview`}>
          <FiEye /> Xem trước giao diện
        </Link>

        {isPublished && !expired && (
          <a href={`/jobs/${id}`} target="_blank" rel="noreferrer" className="g-btn-secondary">
            <FiGlobe /> Xem trên cổng công khai
          </a>
        )}

        {posting.status === 'APPROVED' && canReview && (
          <button className="g-btn-primary" disabled={saving} onClick={publish}>
            <FiGlobe /> Xuất bản công khai
          </button>
        )}

        {['DRAFT', 'REJECTED'].includes(posting.status) && (
          <Link className="g-btn-primary" to={`/job-postings/${id}/edit`}>
            <FiSend /> Chỉnh sửa tin
          </Link>
        )}

        {/* RECRUITER ACTIONS (CHỈ RECRUITER ĐƯỢC PHÂN QUYỀN) */}
        {canManagePostings && (
          <>
            {isPublished && (
              <button 
                id="btn-detail-hide"
                type="button" 
                className="btn-action-view" 
                style={{ padding: '8px 14px', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', fontWeight: 600 }}
                disabled={saving} 
                onClick={handleHide}
              >
                <FiEyeOff style={{ marginRight: 6 }} /> Ẩn tin công khai
              </button>
            )}

            {isHidden && (
              <button 
                id="btn-detail-unhide"
                type="button" 
                className="btn-action-edit" 
                style={{ padding: '8px 14px', fontWeight: 600 }}
                disabled={saving} 
                onClick={handleUnhide}
              >
                <FiEye style={{ marginRight: 6 }} /> Hiện lại tin
              </button>
            )}

            {(isPublished || isHidden) && (
              <button 
                id="btn-detail-close"
                type="button" 
                className="btn-action-delete" 
                style={{ padding: '8px 14px', fontWeight: 600 }}
                disabled={saving} 
                onClick={handleClose}
              >
                <FiXCircle style={{ marginRight: 6 }} /> Gỡ tin tuyển dụng
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobPostingDetail;
