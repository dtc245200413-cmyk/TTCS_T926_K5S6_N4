import { API_BASE_URL } from '../../config/api';
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiMapPin,
  FiSend,
  FiTag,
  FiX,
  FiXCircle
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = API_BASE_URL;

const statusLabels = { 
  DRAFT: 'Bản nháp', 
  PENDING_REVIEW: 'Chờ duyệt', 
  APPROVED: 'Đã duyệt', 
  PUBLISHED: 'Đang xuất bản', 
  HIDDEN: 'Đang ẩn', 
  REJECTED: 'Yêu cầu chỉnh sửa', 
  CLOSED: 'Đã gỡ' 
};

const statusColors = {
  DRAFT: { background: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  PENDING_REVIEW: { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  PENDING_APPROVAL: { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  REJECTED: { background: '#fee2e2', color: '#ef4444', border: '#fecaca' },
  APPROVED: { background: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  PUBLISHED: { background: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  HIDDEN: { background: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  CLOSED: { background: '#f1f5f9', color: '#64748b', border: '#e2e8f0' }
};
const formatDate = value => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

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
  // Tab: 'CONTENT' (Nội dung) | 'PREVIEW' (Xem trước hiển thị)
  const [activeTab, setActiveTab] = useState('CONTENT');

  // Modal 6: Nhập lý do trả chỉnh sửa
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Modal 7: Xuất bản thành công
  const [publishSuccessModal, setPublishSuccessModal] = useState(false);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

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

  // HR Manager action: Approve
  const handleApprove = async () => {
    if (!window.confirm('Xác nhận phê duyệt tin tuyển dụng này?')) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved: true, note: '' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Tin tuyển dụng đã được phê duyệt thành công!');
      await loadPosting();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể phê duyệt tin.');
    } finally {
      setSaving(false);
    }
  };

  // HR Manager action: Submit reject / request revision
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do để nhân viên tuyển dụng chỉnh sửa.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved: false, note: rejectReason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Đã trả lại tin tuyển dụng để nhân viên chỉnh sửa.');
      setRejectModalOpen(false);
      setRejectReason('');
      await loadPosting();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể trả lại tin.');
    } finally {
      setSaving(false);
    }
  };

  // HR Manager action: Publish
  const handlePublish = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${API}/job-postings/${id}/publish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPublishSuccessModal(true);
      await loadPosting();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xuất bản tin.');
    } finally {
      setSaving(false);
    }
  };

  // Recruiter action: Ẩn tin
  const handleHide = async () => {
    if (!window.confirm(`Ẩn tin "${posting?.title}" khỏi trang tuyển dụng công khai?\nỨng viên sẽ không tìm thấy hoặc xem được tin này cho đến khi bạn mở lại.`)) {
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
    if (!window.confirm(`Hiển thị lại tin "${posting?.title}" lên trang tuyển dụng công khai?`)) {
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
    const expired = isExpired(posting?.deadline);
    const confirmMsg = expired 
      ? `Gỡ tin đã hết hiệu lực "${posting?.title}" khỏi trang công khai?`
      : `Gỡ vĩnh viễn tin "${posting?.title}" khỏi trang tuyển dụng công khai?`;

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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải tin tuyển dụng...</div>;
  if (!posting) return <div className="alert alert-error">{error || 'Không tìm thấy tin tuyển dụng.'}</div>;

  const statusBadge = statusColors[posting.status] || statusColors.DRAFT;

  return (
    <div className="g-page-container" style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        <FiTag size={14} />
        <Link to="/job-postings" style={{ color: '#64748b', textDecoration: 'none' }}>Tin tuyển dụng</Link>
        <span>&gt;</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Chi tiết tin tuyển dụng</span>
      </div>

      {/* Header with Title and Badge (Chính xác theo Image 5) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Chi tiết tin tuyển dụng
        </h1>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            background: statusBadge.background,
            color: statusBadge.color,
            border: `1px solid ${statusBadge.border}`
          }}
        >
          {statusLabels[posting.status] || posting.status}
        </span>
      </div>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {successMsg && <div className="alert alert-success" role="status" style={{ marginBottom: 16 }}>{successMsg}</div>}

      {/* Rejection / revision feedback notice if exists */}
      {posting.status === 'REJECTED' && posting.review_note && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontWeight: 700, fontSize: 13 }}>
            <FiAlertCircle /> Lý do yêu cầu chỉnh sửa:
          </div>
          <div style={{ color: '#7f1d1d', fontSize: 13, marginTop: 4 }}>
            {posting.review_note}
          </div>
        </div>
      )}

      {/* Section 1: THÔNG TIN CHUNG (Bảng 2 cột viền nhẹ chuẩn theo Image 5) */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
          Thông tin chung
        </h2>
        <div style={{ border: '1px solid #f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ width: '220px', padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Tiêu đề tin</td>
                <td style={{ padding: '10px 16px', color: '#0f172a', fontWeight: 600 }}>{posting.title}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Vị trí tuyển dụng</td>
                <td style={{ padding: '10px 16px', color: '#0f172a' }}>{posting.position_name || '-'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Phòng ban</td>
                <td style={{ padding: '10px 16px', color: '#0f172a' }}>{posting.department_name || '-'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Số lượng tuyển</td>
                <td style={{ padding: '10px 16px', color: '#0f172a', fontWeight: 700 }}>{posting.headcount || 1}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Ngày tạo</td>
                <td style={{ padding: '10px 16px', color: '#0f172a' }}>{formatDate(posting.created_at)}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 16px', color: '#64748b', fontWeight: 500, background: '#f8fafc' }}>Người soạn</td>
                <td style={{ padding: '10px 16px', color: '#0f172a' }}>
                  {posting.created_by_name ? `${posting.created_by_name} (Nhân viên tuyển dụng)` : 'Nhân viên tuyển dụng'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: NỘI DUNG TIN TUYỂN DỤNG (Tabs: Nội dung / Xem trước hiển thị) */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
          Nội dung tin tuyển dụng
        </h2>

        {/* Tab Header (Nội dung | Xem trước hiển thị) */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #e2e8f0', marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setActiveTab('CONTENT')}
            style={{
              padding: '8px 4px 12px',
              border: 0,
              borderBottom: activeTab === 'CONTENT' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'CONTENT' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'CONTENT' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Nội dung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PREVIEW')}
            style={{
              padding: '8px 4px 12px',
              border: 0,
              borderBottom: activeTab === 'PREVIEW' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'PREVIEW' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'PREVIEW' ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Xem trước hiển thị
          </button>
        </div>

        {/* Tab 1: Nội dung chi tiết */}
        {activeTab === 'CONTENT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                Mô tả công việc
              </h3>
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                {posting.description || '-'}
              </div>
            </div>

            {posting.requirements && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                  Yêu cầu ứng viên
                </h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                  {posting.requirements}
                </div>
              </div>
            )}

            {posting.benefits && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
                  Quyền lợi & đãi ngộ
                </h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13, lineHeight: 1.65, padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                  {posting.benefits}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#475569', paddingTop: 6 }}>
              <span>Mức lương: <strong style={{ color: '#2563eb' }}>{posting.salary_display || 'Thỏa thuận'}</strong></span>
              <span>Hạn nộp hồ sơ: <strong style={{ color: '#ef4444' }}>{formatDate(posting.deadline)}</strong></span>
            </div>
          </div>
        )}

        {/* Tab 2: Xem trước hiển thị công khai */}
        {activeTab === 'PREVIEW' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>TechCorp · Tuyển dụng</span>
                <h3 style={{ margin: '4px 0 0', fontSize: 20, color: '#0f172a', fontWeight: 800 }}>{posting.title}</h3>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  {posting.department_name} · {posting.work_type_name || 'Toàn thời gian'} · {posting.location_name || 'Hà Nội'}
                </div>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: 6, background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700 }}>Ứng tuyển ngay</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              <strong>Mô tả công việc:</strong>
              <p style={{ margin: '6px 0 14px' }}>{posting.description}</p>
              <strong>Yêu cầu ứng viên:</strong>
              <p style={{ margin: '6px 0 0' }}>{posting.requirements}</p>
            </div>
          </div>
        )}
      </section>

      {/* Bottom Action Bar (Chính xác theo Image 5) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/job-postings')}
          style={{
            padding: '9px 24px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            background: '#fff',
            border: '1px solid #cbd5e1',
            cursor: 'pointer'
          }}
        >
          Hủy
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Trưởng phòng: Chờ duyệt hoặc Yêu cầu chỉnh sửa */}
          {canReview && ['PENDING_REVIEW', 'PENDING_APPROVAL', 'REJECTED'].includes(posting.status) && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRejectModalOpen(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#ef4444',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  cursor: 'pointer'
                }}
              >
                Trả lại (yêu cầu chỉnh sửa)
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleApprove}
                style={{
                  padding: '9px 28px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#16a34a',
                  border: 0,
                  cursor: 'pointer'
                }}
              >
                Duyệt
              </button>
            </>
          )}

          {/* Trưởng phòng: Đã duyệt -> Xuất bản */}
          {canReview && posting.status === 'APPROVED' && (
            <button
              type="button"
              disabled={saving}
              onClick={handlePublish}
              style={{
                padding: '9px 24px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                background: '#16a34a',
                border: 0,
                cursor: 'pointer'
              }}
            >
              Xuất bản tin tuyển dụng
            </button>
          )}

          {/* Đã xuất bản -> Mở cổng công khai */}
          {posting.status === 'PUBLISHED' && (
            <a
              href={`/jobs/${posting.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#16a34a',
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                textDecoration: 'none'
              }}
            >
              <FiGlobe /> Xem trên trang công khai
            </a>
          )}

          {posting.status === 'PUBLISHED' && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={handleHide}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#7c3aed',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  cursor: 'pointer'
                }}
              >
                <FiEyeOff /> Ẩn tin
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  cursor: 'pointer'
                }}
              >
                <FiXCircle /> Gỡ tin
              </button>
            </>
          )}

          {posting.status === 'HIDDEN' && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={handleUnhide}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  cursor: 'pointer'
                }}
              >
                <FiEye /> Hiện lại tin
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 18px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  cursor: 'pointer'
                }}
              >
                <FiXCircle /> Gỡ tin
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 6: NHẬP LÝ DO TRẢ CHỈNH SỬA (Chính xác theo Image 6) */}
      {/* ========================================================================= */}
      {rejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '24px 28px', width: 480, maxWidth: '92vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            {/* Header with Title and close X */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Trả lại tin tuyển dụng
              </h3>
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 16, padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Input Label */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Lý do chỉnh sửa <span style={{ color: '#ef4444' }}>*</span>
            </label>

            {/* Textarea */}
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <textarea
                value={rejectReason}
                maxLength={500}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập lý do để nhân viên tuyển dụng chỉnh sửa..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {rejectReason.length}/500
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !rejectReason.trim()}
                onClick={handleConfirmReject}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#dc2626',
                  border: 0,
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  opacity: rejectReason.trim() ? 1 : 0.6
                }}
              >
                ✕ Xác nhận trả lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: XUẤT BẢN TIN TUYỂN DỤNG THÀNH CÔNG (Chính xác theo Image 7) */}
      {/* ========================================================================= */}
      {publishSuccessModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', width: 440, maxWidth: '92vw', textAlign: 'center', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            {/* Close button */}
            <button
              type="button"
              onClick={() => setPublishSuccessModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>

            {/* Green Check Icon */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#16a34a',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 16
            }}>
              ✓
            </div>

            {/* Title */}
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Xuất bản thành công!
            </h3>

            {/* Description */}
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Tin tuyển dụng đã được xuất bản và hiển thị công khai trên cổng thông tin tuyển dụng.
            </p>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a
                href={`/jobs/${posting.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#2563eb',
                  background: '#fff',
                  border: '1px solid #2563eb',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Xem tin tuyển dụng
              </a>
              <button
                type="button"
                onClick={() => setPublishSuccessModal(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#2563eb',
                  border: 0,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingDetail;
