import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiEdit2,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiXCircle,
  FiMoreHorizontal,
  FiClock
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const PAGE_SIZE = 8;

const tabs = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Bản nháp' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'REJECTED', label: 'Yêu cầu chỉnh sửa' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PUBLISHED', label: 'Đang xuất bản' },
  { key: 'HIDDEN', label: 'Đang ẩn' },
  { key: 'CLOSED', label: 'Đã đóng' }
];

const statusLabels = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  REJECTED: 'Yêu cầu chỉnh sửa',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đang xuất bản',
  HIDDEN: 'Đang ẩn',
  CLOSED: 'Đã đóng'
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

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

const isPostingExpired = (posting) => {
  if (!posting?.deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(posting.deadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
};

const JobPostingList = () => {
  const { user } = useContext(AuthContext);

  // Phân quyền: Recruiter hoặc Admin có quyền JOB_POSTING_CLOSE được ẩn/gỡ tin
  const isRecruiterOrAdmin = user?.roles?.some(role => ['ADMIN', 'RECRUITER'].includes(role.role_code));
  const hasPostingPermission = user?.permissions?.includes('JOB_POSTING_CLOSE') || isRecruiterOrAdmin;
  const canManagePostings = isRecruiterOrAdmin && hasPostingPermission;

  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));
  const isRecruiter = user?.roles?.some(role => role.role_code === 'RECRUITER');

  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Trưởng phòng mặc định vào tab Chờ duyệt, Recruiter vào tab Tất cả
  const [activeTab, setActiveTab] = useState(canReview && !isRecruiter ? 'PENDING_REVIEW' : 'ALL');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal 6: Nhập lý do trả chỉnh sửa
  const [rejectModal, setRejectModal] = useState({ open: false, postingId: null, postingTitle: '', note: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Modal 7: Xuất bản thành công
  const [publishModal, setPublishModal] = useState({ open: false, postingId: null });

  const loadPostings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/job-postings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPostings(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách tin tuyển dụng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostings();
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Tab count
  const counts = useMemo(() => postings.reduce((result, posting) => {
    result.ALL += 1;
    const currentStatus = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
    result[currentStatus] = (result[currentStatus] || 0) + 1;
    if (isPostingExpired(posting)) {
      result.EXPIRED = (result.EXPIRED || 0) + 1;
    }
    return result;
  }, { ALL: 0, DRAFT: 0, PENDING_REVIEW: 0, REJECTED: 0, APPROVED: 0, PUBLISHED: 0, HIDDEN: 0, CLOSED: 0, EXPIRED: 0 }), [postings]);

  // Filter list
  const filteredPostings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return postings.filter(posting => {
      const currentStatus = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
      let matchesTab = true;
      if (activeTab === 'EXPIRED') {
        matchesTab = isPostingExpired(posting);
      } else if (activeTab !== 'ALL') {
        matchesTab = currentStatus === activeTab;
      }

      const matchesDropdown = statusFilter === 'ALL' || currentStatus === statusFilter;
      const searchable = [posting.title, posting.position_name, posting.department_name, `JOB-${String(posting.id).padStart(4, '0')}`].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return matchesTab && matchesDropdown && (!keyword || searchable.includes(keyword));
    });
  }, [postings, activeTab, statusFilter, search]);

  useEffect(() => setPage(1), [activeTab, statusFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredPostings.length / PAGE_SIZE));
  const visiblePostings = filteredPostings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Recruiter action: Ẩn tin
  const hidePosting = async (posting) => {
    if (!window.confirm(`Ẩn tin "${posting.title}" khỏi trang tuyển dụng công khai?\nỨng viên sẽ không tìm thấy hoặc xem được tin này cho đến khi bạn mở lại.`)) {
      return;
    }
    setActionLoadingId(posting.id);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${posting.id}/hide`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification(`Đã ẩn tin "${posting.title}" khỏi trang công khai thành công.`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể ẩn tin tuyển dụng.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Recruiter action: Hiện lại tin
  const unhidePosting = async (posting) => {
    if (!window.confirm(`Hiển thị lại tin "${posting.title}" lên trang tuyển dụng công khai?`)) {
      return;
    }
    setActionLoadingId(posting.id);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${posting.id}/unhide`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification(`Đã mở lại tin "${posting.title}" trên trang công khai thành công.`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể hiển thị lại tin tuyển dụng.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Recruiter action: Gỡ tin
  const closePosting = async (posting) => {
    const expired = isPostingExpired(posting);
    const confirmText = expired
      ? `Gỡ tin hết hiệu lực "${posting.title}" khỏi trang công khai?`
      : `Gỡ tin tuyển dụng "${posting.title}" khỏi trang công khai? Trạng thái sẽ chuyển thành Đã đóng.`;

    if (!window.confirm(confirmText)) return;

    setActionLoadingId(posting.id);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${posting.id}/close`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification(`Đã gỡ tin "${posting.title}" khỏi trang công khai thành công.`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gỡ tin tuyển dụng.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Recruiter: gửi duyệt
  const sendForReview = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gửi duyệt tin "${title || ''}"?`)) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${API}/job-postings/${id}/submit`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showNotification(`Đã gửi duyệt tin tuyển dụng thành công.`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi duyệt tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trưởng phòng: Duyệt
  const approvePosting = async (id, title) => {
    if (!window.confirm(`Xác nhận phê duyệt tin tuyển dụng "${title}"?`)) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved: true, note: '' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showNotification(`Đã phê duyệt tin "${title}".`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể duyệt tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trưởng phòng: Trả chỉnh sửa (Modal 6 xác nhận)
  const submitReject = async () => {
    if (!rejectModal.note.trim()) {
      setError('Vui lòng nhập lý do yêu cầu chỉnh sửa.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await axios.patch(`${API}/job-postings/${rejectModal.postingId}/review`, {
        approved: false,
        note: rejectModal.note.trim()
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      showNotification('Đã trả lại tin tuyển dụng kèm yêu cầu chỉnh sửa.');
      setRejectModal({ open: false, postingId: null, postingTitle: '', note: '' });
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi yêu cầu chỉnh sửa.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trưởng phòng: Xuất bản trực tiếp (Modal 7 hiển thị sau đó)
  const publishPosting = async (id) => {
    setActionLoading(true);
    setError('');
    try {
      await axios.post(`${API}/job-postings/${id}/publish`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setPublishModal({ open: true, postingId: id });
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xuất bản tin.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="g-page-container" style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Tin tuyển dụng</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {canReview && !isRecruiter
              ? 'Duyệt tin tuyển dụng, yêu cầu chỉnh sửa và xuất bản'
              : 'Soạn thảo, gửi duyệt và theo dõi trạng thái tin tuyển dụng'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/jobs"
            target="_blank"
            rel="noreferrer"
            id="btn-view-public-portal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <FiGlobe /> Xem Cổng công khai
          </a>

          {(!canReview || isRecruiter) && (
            <Link
              to="/job-postings/create"
              id="btn-create-job-draft"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                backgroundColor: '#2563eb',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                transition: 'background-color 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2563eb'}
            >
              <FiPlus size={16} /> Soạn tin tuyển dụng
            </Link>
          )}
        </div>
      </header>

      {/* Success Notification */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
          <FiCheck /> {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
          <FiAlertTriangle /> {error}
        </div>
      )}

      {/* Filter toolbar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 200px auto', gap: 12, alignItems: 'center', padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} size={16} />
          <input
            id="admin-search-posting"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, vị trí, phòng ban..."
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

        <select
          id="admin-filter-status"
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            if (e.target.value !== 'ALL') setActiveTab(e.target.value);
          }}
          style={{
            padding: '9px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 13,
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {tabs.filter(t => t.key !== 'ALL').map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <button
          id="btn-admin-reset-filter"
          type="button"
          onClick={() => { setSearch(''); setStatusFilter('ALL'); setActiveTab('ALL'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 14px',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            background: '#fff',
            color: '#475569',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <FiRefreshCw size={14} /> Làm mới
        </button>
      </section>

      {/* Main card with Tabs & Table */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {/* Status Tabs Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 8px', overflowX: 'auto' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key.toLowerCase()}`}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key !== 'ALL') setStatusFilter(tab.key);
                  else setStatusFilter('ALL');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '13px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#2563eb' : '#64748b',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isActive ? '#dbeafe' : '#f1f5f9',
                    color: isActive ? '#1d4ed8' : '#64748b'
                  }}
                >
                  {counts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Đang tải danh sách tin...</div>
        ) : filteredPostings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            Không có tin tuyển dụng nào phù hợp.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px', width: 36, textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>Tiêu đề tin</th>
                  <th style={{ padding: '12px 14px' }}>Vị trí tuyển dụng</th>
                  <th style={{ padding: '12px 14px' }}>Phòng ban</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Ngày tạo</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Hạn nộp</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: 230 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePostings.map((posting, index) => {
                  const statusKey = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
                  const statusBadge = statusColors[statusKey] || statusColors.DRAFT;
                  const expired = isPostingExpired(posting);
                  const isHidden = posting.status === 'HIDDEN';
                  const isPublished = posting.status === 'PUBLISHED';

                  return (
                    <tr key={posting.id} id={`row-posting-${posting.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* Tiêu đề tin + Mã */}
                      <td style={{ padding: '14px' }}>
                        <Link
                          to={`/job-postings/${posting.id}`}
                          style={{ color: '#0f172a', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                          onMouseOver={e => e.currentTarget.style.color = '#2563eb'}
                          onMouseOut={e => e.currentTarget.style.color = '#0f172a'}
                        >
                          {posting.title}
                        </Link>
                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2, fontWeight: 500 }}>
                          JOB-{String(posting.id).padStart(4, '0')}
                          {posting.recruitment_request_id ? ` · REQ-${String(posting.recruitment_request_id).padStart(4, '0')}` : ''}
                        </div>
                      </td>

                      {/* Vị trí */}
                      <td style={{ padding: '14px', color: '#334155', fontSize: 13 }}>
                        {posting.position_name || '-'}
                      </td>

                      {/* Phòng ban */}
                      <td style={{ padding: '14px', color: '#475569', fontSize: 13 }}>
                        {posting.department_name || '-'}
                      </td>

                      {/* Trạng thái badge */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 700,
                            background: statusBadge.background,
                            color: statusBadge.color,
                            border: `1px solid ${statusBadge.border}`
                          }}
                        >
                          {statusLabels[statusKey] || statusKey}
                        </span>
                        {expired && isPublished && (
                          <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 600, marginTop: 2 }}>Hết hạn</div>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                        {formatDate(posting.created_at)}
                      </td>

                      {/* Hạn nộp */}
                      <td style={{ padding: '14px', textAlign: 'center', color: expired ? '#dc2626' : '#64748b', fontSize: 12, fontWeight: expired ? 600 : 400 }}>
                        {formatDate(posting.deadline)}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {/* 1. Trưởng phòng duyệt/trả lại khi chờ duyệt */}
                          {canReview && ['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(posting.status) && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiEye size={13} /> Xem
                              </Link>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => approvePosting(posting.id, posting.title)}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a', border: 0, borderRadius: 6, cursor: 'pointer' }}
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setRejectModal({ open: true, postingId: posting.id, postingTitle: posting.title, note: '' })}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#dc2626', border: 0, borderRadius: 6, cursor: 'pointer' }}
                              >
                                Trả lại
                              </button>
                            </>
                          )}

                          {/* 2. Trưởng phòng xuất bản khi đã duyệt */}
                          {canReview && posting.status === 'APPROVED' && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiEye size={13} /> Xem
                              </Link>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => publishPosting(posting.id)}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#2563eb', border: 0, borderRadius: 6, cursor: 'pointer' }}
                              >
                                Xuất bản
                              </button>
                            </>
                          )}

                          {/* 3. Recruiter gửi duyệt khi DRAFT */}
                          {(!canReview || isRecruiter) && posting.status === 'DRAFT' && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}/edit`}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, textDecoration: 'none' }}
                              >
                                Sửa
                              </Link>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => sendForReview(posting.id, posting.title)}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#2563eb', border: 0, borderRadius: 6, cursor: 'pointer' }}
                              >
                                Gửi duyệt
                              </button>
                            </>
                          )}

                          {/* 4. Recruiter sửa khi REJECTED */}
                          {(!canReview || isRecruiter) && posting.status === 'REJECTED' && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiEye size={13} /> Xem
                              </Link>
                              <Link
                                to={`/job-postings/${posting.id}/edit`}
                                style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                Chỉnh sửa
                              </Link>
                            </>
                          )}

                          {/* 5. Xem công khai khi PUBLISHED */}
                          {isPublished && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiEye size={13} /> Xem
                              </Link>
                              <a
                                href={`/jobs/${posting.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiGlobe size={13} /> Công khai
                              </a>
                            </>
                          )}

                          {/* 6. Recruiter / Admin: Ẩn tin nếu đang PUBLISHED */}
                          {canManagePostings && isPublished && (
                            <button
                              type="button"
                              id={`hide-btn-${posting.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 6, cursor: 'pointer' }}
                              disabled={actionLoadingId === posting.id}
                              onClick={() => hidePosting(posting)}
                              title="Tạm ẩn tin khỏi trang công khai"
                            >
                              <FiEyeOff size={13} /> Ẩn tin
                            </button>
                          )}

                          {/* 7. Recruiter / Admin: Mở lại tin nếu đang HIDDEN */}
                          {canManagePostings && isHidden && (
                            <>
                              <Link
                                to={`/job-postings/${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                              >
                                <FiEye size={13} /> Xem
                              </Link>
                              <button
                                type="button"
                                id={`unhide-btn-${posting.id}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
                                disabled={actionLoadingId === posting.id}
                                onClick={() => unhidePosting(posting)}
                                title="Hiển thị lại tin trên trang công khai"
                              >
                                <FiEye size={13} /> Hiện lại
                              </button>
                            </>
                          )}

                          {/* 8. Recruiter / Admin: Gỡ tin nếu PUBLISHED hoặc HIDDEN */}
                          {canManagePostings && (isPublished || isHidden) && (
                            <button
                              type="button"
                              id={`close-btn-${posting.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
                              disabled={actionLoadingId === posting.id}
                              onClick={() => closePosting(posting)}
                              title="Gỡ tin tuyển dụng"
                            >
                              <FiXCircle size={13} /> Gỡ tin
                            </button>
                          )}

                          {/* 9. CLOSED: chỉ xem */}
                          {posting.status === 'CLOSED' && (
                            <Link
                              to={`/job-postings/${posting.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                            >
                              <FiEye size={13} /> Xem
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {!loading && filteredPostings.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '14px 20px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(current => current - 1)}
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                background: '#fff',
                color: page <= 1 ? '#cbd5e1' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <FiChevronLeft size={16} />
            </button>

            {Array.from({ length: pageCount }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: num === page ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 6,
                  background: num === page ? '#eff6ff' : '#fff',
                  color: num === page ? '#2563eb' : '#334155',
                  fontWeight: num === page ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage(current => current + 1)}
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                background: '#fff',
                color: page >= pageCount ? '#cbd5e1' : '#334155',
                cursor: page >= pageCount ? 'not-allowed' : 'pointer'
              }}
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODAL 6: TRẢ LẠI TIN TUYỂN DỤNG (Chính xác theo Image 6) */}
      {/* ========================================================================= */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: '24px 28px', width: 480, maxWidth: '92vw', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Trả lại tin tuyển dụng
              </h3>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, postingId: null, postingTitle: '', note: '' })}
                style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Lý do chỉnh sửa <span style={{ color: '#ef4444' }}>*</span>
            </label>

            <div style={{ position: 'relative', marginBottom: 18 }}>
              <textarea
                value={rejectModal.note}
                maxLength={500}
                onChange={e => setRejectModal(c => ({ ...c, note: e.target.value }))}
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
                {rejectModal.note.length}/500
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, postingId: null, postingTitle: '', note: '' })}
                style={{ padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectModal.note.trim()}
                onClick={submitReject}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#dc2626',
                  border: 0,
                  cursor: rejectModal.note.trim() ? 'pointer' : 'not-allowed',
                  opacity: rejectModal.note.trim() ? 1 : 0.6
                }}
              >
                ✕ Xác nhận trả lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: XUẤT BẢN THÀNH CÔNG (Chính xác theo Image 7) */}
      {/* ========================================================================= */}
      {publishModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '32px 28px', width: 440, maxWidth: '92vw', textAlign: 'center', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <button
              type="button"
              onClick={() => setPublishModal({ open: false, postingId: null })}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 16 }}
            >
              ✕
            </button>

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

            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
              Xuất bản thành công!
            </h3>

            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Tin tuyển dụng đã được xuất bản và hiển thị công khai trên cổng thông tin tuyển dụng.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a
                href={`/jobs/${publishModal.postingId}`}
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
                onClick={() => setPublishModal({ open: false, postingId: null })}
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

export default JobPostingList;
