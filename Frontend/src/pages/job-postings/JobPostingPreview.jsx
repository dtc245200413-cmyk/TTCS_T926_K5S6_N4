import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBriefcase,
  FiCheck,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiX
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:5000/api';

const JobPostingPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));

  const [posting, setPosting] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    return Promise.all([
      axios.get(`${API}/job-postings/${id}/preview`, { headers }),
      axios.get(`${API}/company-profile`, { headers }).catch(() => null)
    ]).then(([postingResponse, companyResponse]) => {
      setPosting(postingResponse.data.data);
      setCompany(companyResponse?.data?.data || null);
    }).catch(requestError => {
      setError(requestError.response?.data?.message || 'Không thể tải bản xem trước.');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // HR Manager approve
  const handleApprove = async () => {
    if (!window.confirm('Xác nhận phê duyệt tin tuyển dụng này?')) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved: true, note: '' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccessMsg('Đã phê duyệt tin tuyển dụng!');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể phê duyệt tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // HR Manager reject / request revision
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do / ý kiến yêu cầu chỉnh sửa.');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved: false, note: rejectReason }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccessMsg('Đã trả tin về cho Nhân viên tuyển dụng chỉnh sửa.');
      setRejectModalOpen(false);
      setRejectReason('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể trả tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // HR Manager publish
  const handlePublish = async () => {
    if (!window.confirm('Xác nhận xuất bản tin tuyển dụng này lên cổng công khai?')) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${API}/job-postings/${id}/publish`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSuccessMsg('Đã xuất bản tin tuyển dụng thành công!');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xuất bản tin.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Đang tải bản xem trước...</div>;
  if (!posting) return <div role="alert" className="alert alert-error">{error || 'Không tìm thấy tin tuyển dụng.'}</div>;

  const imageUrl = company?.banner_url ? `http://localhost:5000${company.banner_url}` : '';
  const logoUrl = company?.logo_url ? `http://localhost:5000${company.logo_url}` : '';

  return (
    <div className="g-page-container" style={{ maxWidth: 1040, margin: '0 auto' }}>
      <header className="g-page-header">
        <div>
          <h1 className="g-page-title">Xem trước tin tuyển dụng</h1>
          <p className="g-page-subtitle">Giao diện xem trước của tin khi hiển thị tới ứng viên</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="g-btn-secondary" to={`/job-postings/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FiArrowLeft /> Quay lại chi tiết
          </Link>
          {posting.status === 'PUBLISHED' && (
            <a className="g-btn-secondary" href={`/jobs/${posting.id}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FiExternalLink /> Mở trang công khai
            </a>
          )}
        </div>
      </header>

      {error && <div role="alert" className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {successMsg && <div role="status" className="alert alert-success" style={{ marginBottom: 12 }}>{successMsg}</div>}

      {/* Review bar for Trưởng phòng Nhân sự */}
      {canReview && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '12px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 13, color: '#334155' }}>
              Trạng thái hiện tại: <strong>{posting.status === 'PENDING_REVIEW' ? 'Chờ duyệt' : posting.status === 'APPROVED' ? 'Đã duyệt' : posting.status === 'PUBLISHED' ? 'Đã xuất bản' : posting.status}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {posting.status === 'PENDING_REVIEW' && (
              <>
                <button
                  type="button"
                  className="btn-action-delete"
                  disabled={actionLoading}
                  onClick={() => setRejectModalOpen(true)}
                  style={{ padding: '7px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <FiX /> Trả chỉnh sửa
                </button>
                <button
                  type="button"
                  className="g-btn-secondary"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  style={{ padding: '7px 14px', fontSize: 13, color: '#1d4ed8', border: '1px solid #bfdbfe', background: '#eff6ff', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <FiCheck /> Duyệt tin
                </button>
                <button
                  type="button"
                  className="g-btn-primary"
                  disabled={actionLoading}
                  onClick={handlePublish}
                  style={{ padding: '7px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <FiGlobe /> Duyệt & Xuất bản ngay
                </button>
              </>
            )}

            {posting.status === 'APPROVED' && (
              <button
                type="button"
                className="g-btn-primary"
                disabled={actionLoading}
                onClick={handlePublish}
                style={{ padding: '7px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#15803d' }}
              >
                <FiGlobe /> Xuất bản lên cổng công khai
              </button>
            )}
          </div>
        </div>
      )}

      {posting.status === 'REJECTED' && posting.review_note && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '5px solid #ef4444', borderRadius: 8, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 800, fontSize: 13 }}>
            <FiAlertCircle /> Ý kiến yêu cầu chỉnh sửa từ Trưởng phòng:
          </div>
          <div style={{ color: '#7f1d1d', fontSize: 13, marginTop: 4 }}>{posting.review_note}</div>
        </div>
      )}

      {/* Preview Card */}
      <article className="g-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        {imageUrl && <img src={imageUrl} alt="Ảnh bìa công ty" style={{ display: 'block', width: '100%', height: 180, objectFit: 'cover' }} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoUrl && <img src={logoUrl} alt="Logo công ty" style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />}
            <div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{posting.department_name || company?.name || 'TechCorp'}</div>
              <h2 style={{ margin: '3px 0 0', color: '#0f172a', fontSize: 22, fontWeight: 800 }}>{posting.title}</h2>
            </div>
          </div>
          <span className="badge badge-info" style={{ padding: '6px 12px', fontSize: 12 }}>Bản xem trước</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 13 }}>
          <span><FiBriefcase /> {posting.work_type_name || posting.job_type || 'Toàn thời gian'}</span>
          <span><FiMapPin /> {posting.location_name || posting.work_location || 'Linh hoạt'}</span>
          <strong style={{ color: '#2563eb' }}>{posting.salary_display || 'Thỏa thuận'}</strong>
          <span>Đăng ngày: {posting.published_at ? new Date(posting.published_at).toLocaleDateString('vi-VN') : 'Sau khi xuất bản'}</span>
          <span>Hạn nộp: <strong style={{ color: '#dc2626' }}>{posting.deadline ? new Date(posting.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}</strong></span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 20, padding: 20 }}>
          <div style={{ display: 'grid', gap: 18, lineHeight: 1.65 }}>
            <section>
              <h3 style={{ margin: '0 0 7px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Mô tả công việc</h3>
              <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.description}</div>
            </section>
            {posting.requirements && (
              <section>
                <h3 style={{ margin: '0 0 7px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Yêu cầu ứng viên</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.requirements}</div>
              </section>
            )}
            {posting.benefits && (
              <section>
                <h3 style={{ margin: '0 0 7px', fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Quyền lợi & đãi ngộ</h3>
                <div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.benefits}</div>
              </section>
            )}
          </div>

          <aside style={{ alignSelf: 'start', padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Ứng tuyển việc làm</strong>
            <button
              type="button"
              disabled
              style={{ width: '100%', padding: '10px 14px', border: 0, borderRadius: 6, color: '#fff', background: '#4f46e5', fontWeight: 700, opacity: .75, cursor: 'not-allowed' }}
            >
              Nộp hồ sơ ứng tuyển
            </button>
            <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 11, lineHeight: 1.4 }}>
              Nút nộp hồ sơ sẽ hoạt động khi tin được xuất bản lên cổng tuyển dụng.
            </p>
          </aside>
        </div>
      </article>

      {/* Modal Trả chỉnh sửa */}
      {rejectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 22, width: 480, maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: 8, borderRadius: 8, display: 'flex' }}><FiAlertCircle size={20} /></span>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Trả chỉnh sửa tin tuyển dụng</h3>
            </div>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155' }}>
              Lý do từ chối / Nội dung cần sửa <span style={{ color: '#ef4444' }}>*</span>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập chi tiết các nội dung Nhân viên tuyển dụng cần bổ sung hoặc chỉnh sửa..."
                rows={4}
                className="g-form-input"
                style={{ resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="g-btn-secondary"
                disabled={actionLoading}
                onClick={() => { setRejectModalOpen(false); setRejectReason(''); }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-action-delete"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleReject}
                style={{ padding: '8px 16px', fontWeight: 700 }}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận trả lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobPostingPreview;