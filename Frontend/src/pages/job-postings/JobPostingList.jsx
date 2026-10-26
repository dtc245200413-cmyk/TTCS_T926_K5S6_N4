import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiEdit2,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:5000/api';
const PAGE_SIZE = 6;

const statusLabels = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  REJECTED: 'Yêu cầu chỉnh sửa',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đã xuất bản',
  CLOSED: 'Đã đóng'
};

const statusColors = {
  DRAFT: { background: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  PENDING_REVIEW: { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  PENDING_APPROVAL: { background: '#fef3c7', color: '#d97706', border: '#fde68a' },
  REJECTED: { background: '#fee2e2', color: '#ef4444', border: '#fecaca' },
  APPROVED: { background: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  PUBLISHED: { background: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  CLOSED: { background: '#f1f5f9', color: '#64748b', border: '#e2e8f0' }
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

const JobPostingList = () => {
  const { user } = useContext(AuthContext);
  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));
  const isRecruiter = user?.roles?.some(role => role.role_code === 'RECRUITER');

  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Trưởng phòng mặc định vào tab Chờ duyệt (như Image 4), Recruiter vào tab Tất cả (Image 1)
  const [activeTab, setActiveTab] = useState(canReview && !isRecruiter ? 'PENDING_REVIEW' : 'ALL');
  const [page, setPage] = useState(1);

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

  useEffect(() => { loadPostings(); }, []);

  // Danh sách tab hiển thị: Nếu là HR Manager (Image 4) thì ẩn tab Bản nháp
  const tabs = useMemo(() => {
    if (canReview && !isRecruiter) {
      return [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
        { key: 'REJECTED', label: 'Yêu cầu chỉnh sửa' },
        { key: 'APPROVED', label: 'Đã duyệt' },
        { key: 'PUBLISHED', label: 'Đã xuất bản' },
        { key: 'CLOSED', label: 'Đã đóng' }
      ];
    }
    return [
      { key: 'ALL', label: 'Tất cả' },
      { key: 'DRAFT', label: 'Bản nháp' },
      { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
      { key: 'REJECTED', label: 'Yêu cầu chỉnh sửa' },
      { key: 'APPROVED', label: 'Đã duyệt' },
      { key: 'PUBLISHED', label: 'Đã xuất bản' },
      { key: 'CLOSED', label: 'Đã đóng' }
    ];
  }, [canReview, isRecruiter]);

  const counts = useMemo(() => postings.reduce((result, posting) => {
    result.ALL += 1;
    const key = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, { ALL: 0, DRAFT: 0, PENDING_REVIEW: 0, REJECTED: 0, APPROVED: 0, PUBLISHED: 0, CLOSED: 0 }), [postings]);

  const filteredPostings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return postings.filter(posting => {
      const currentStatus = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
      const matchesTab = activeTab === 'ALL' || currentStatus === activeTab;
      const matchesDropdown = statusFilter === 'ALL' || currentStatus === statusFilter;
      const searchable = [posting.title, posting.position_name, posting.department_name, `JOB-${String(posting.id).padStart(4, '0')}`].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return matchesTab && matchesDropdown && (!keyword || searchable.includes(keyword));
    });
  }, [postings, activeTab, statusFilter, search]);

  useEffect(() => setPage(1), [activeTab, statusFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredPostings.length / PAGE_SIZE));
  const visiblePostings = filteredPostings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Recruiter: gửi duyệt
  const sendForReview = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gửi duyệt tin "${title}"?`)) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.post(`${API}/job-postings/${id}/submit`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setSuccessMsg(`Đã gửi duyệt tin tuyển dụng thành công.`);
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
      setSuccessMsg(`Đã phê duyệt tin "${title}".`);
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể phê duyệt tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trưởng phòng: Xác nhận trả lại (Modal 6)
  const submitReject = async () => {
    if (!rejectModal.note.trim()) {
      alert('Vui lòng nhập lý do để nhân viên tuyển dụng chỉnh sửa.');
      return;
    }
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await axios.patch(`${API}/job-postings/${rejectModal.postingId}/review`, { approved: false, note: rejectModal.note }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setSuccessMsg(`Đã trả lại tin tuyển dụng để nhân viên chỉnh sửa.`);
      setRejectModal({ open: false, postingId: null, postingTitle: '', note: '' });
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể trả lại tin.');
    } finally {
      setActionLoading(false);
    }
  };

  // Trưởng phòng: Xuất bản (Modal 7)
  const publishPosting = async (id, title) => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
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
      {/* Header (Phân biệt subtitle và button theo Image 1 & Image 4) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Tin tuyển dụng</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {canReview && !isRecruiter
              ? 'Duyệt tin tuyển dụng, yêu cầu chỉnh sửa và xuất bản'
              : 'Soạn thảo, gửi duyệt và theo dõi trạng thái tin tuyển dụng'}
          </p>
        </div>

        {/* Nút "+ Soạn tin tuyển dụng" chỉ hiển thị khi có vai trò Recruiter (Image 1) */}
        {(!canReview || isRecruiter) && (
          <Link
            to="/job-postings/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
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
      </header>

      {/* Filter toolbar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 200px auto', gap: 12, alignItems: 'center', padding: '14px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} size={16} />
          <input
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
            background: '#fff',
            color: '#334155',
            outline: 'none'
          }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          {(!canReview || isRecruiter) && <option value="DRAFT">Bản nháp</option>}
          <option value="PENDING_REVIEW">Chờ duyệt</option>
          <option value="REJECTED">Yêu cầu chỉnh sửa</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="PUBLISHED">Đã xuất bản</option>
          <option value="CLOSED">Đã đóng</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStatusFilter('ALL');
            setActiveTab(canReview && !isRecruiter ? 'PENDING_REVIEW' : 'ALL');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 16px',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#334155',
            cursor: 'pointer'
          }}
        >
          <FiRefreshCw size={14} /> Làm mới
        </button>
      </section>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {successMsg && <div className="alert alert-success" role="status" style={{ marginBottom: 12 }}>{successMsg}</div>}

      {/* Main Table Card with Tabs */}
      <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #e2e8f0', padding: '0 8px', background: '#fafafa' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setStatusFilter(tab.key);
                }}
                style={{
                  padding: '13px 16px',
                  border: 0,
                  borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label} ({counts[tab.key] || 0})
              </button>
            );
          })}
        </nav>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Đang tải danh sách tin tuyển dụng...</div>
        ) : filteredPostings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
            {postings.length ? 'Không có tin tuyển dụng phù hợp với bộ lọc.' : 'Chưa có tin tuyển dụng nào.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 920 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px', width: 36, textAlign: 'center' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>Tiêu đề tin</th>
                  <th style={{ padding: '12px 14px' }}>Vị trí tuyển dụng</th>
                  <th style={{ padding: '12px 14px' }}>Phòng ban</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Ngày tạo</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Ngày cập nhật</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: 190 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePostings.map((posting, index) => {
                  const statusKey = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
                  const statusBadge = statusColors[statusKey] || statusColors.DRAFT;

                  return (
                    <tr key={posting.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
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
                            color: statusBadge.color
                          }}
                        >
                          {statusLabels[statusKey] || statusKey}
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                        {formatDate(posting.created_at)}
                      </td>

                      {/* Ngày cập nhật */}
                      <td style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                        {formatDate(posting.updated_at || posting.created_at)}
                      </td>

                      {/* Thao tác (Chính xác theo Image 1 và Image 4) */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* ======================= */}
                          {/* DÀNH CHO TRƯỞNG PHÒNG NS (IMAGE 4) */}
                          {/* ======================= */}
                          {canReview && (
                            <>
                              {/* 1. Chờ duyệt */}
                              {['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(posting.status) && (
                                <>
                                  <Link
                                    to={`/job-postings/${posting.id}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '5px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: 6,
                                      textDecoration: 'none'
                                    }}
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
                                    style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#ef4444', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
                                  >
                                    Trả lại
                                  </button>
                                </>
                              )}

                              {/* 2. Yêu cầu chỉnh sửa */}
                              {posting.status === 'REJECTED' && (
                                <>
                                  <Link
                                    to={`/job-postings/${posting.id}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '5px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: 6,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <FiEye size={13} /> Xem
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => approvePosting(posting.id, posting.title)}
                                    style={{ padding: '5px 10px', fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer' }}
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => setRejectModal({ open: true, postingId: posting.id, postingTitle: posting.title, note: '' })}
                                    style={{ padding: '5px 9px', fontSize: 12, fontWeight: 600, color: '#ef4444', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer' }}
                                  >
                                    Trả lại
                                  </button>
                                </>
                              )}

                              {/* 3. Đã duyệt -> Xuất bản */}
                              {posting.status === 'APPROVED' && (
                                <>
                                  <Link
                                    to={`/job-postings/${posting.id}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '5px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: 6,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <FiEye size={13} /> Xem
                                  </Link>
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => publishPosting(posting.id, posting.title)}
                                    style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#fff', background: '#2563eb', border: 0, borderRadius: 6, cursor: 'pointer' }}
                                  >
                                    Xuất bản
                                  </button>
                                </>
                              )}

                              {/* 4. Đã xuất bản */}
                              {posting.status === 'PUBLISHED' && (
                                <>
                                  <Link
                                    to={`/job-postings/${posting.id}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '5px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: 6,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <FiEye size={13} /> Xem
                                  </Link>
                                  <a
                                    href={`/jobs/${posting.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: '5px 10px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: '#16a34a',
                                      background: '#dcfce7',
                                      border: '1px solid #bbf7d0',
                                      borderRadius: 6,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Xem công khai
                                  </a>
                                </>
                              )}

                              {/* 5. Đã đóng */}
                              {posting.status === 'CLOSED' && (
                                <Link
                                  to={`/job-postings/${posting.id}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '5px 12px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: 6,
                                    textDecoration: 'none'
                                  }}
                                >
                                  <FiEye size={13} /> Xem
                                </Link>
                              )}
                            </>
                          )}

                          {/* ======================= */}
                          {/* DÀNH CHO NHÂN VIÊN TUYỂN DỤNG (IMAGE 1) */}
                          {/* ======================= */}
                          {!canReview && (
                            <>
                              {posting.status === 'DRAFT' && (
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

                              {['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(posting.status) && (
                                <Link
                                  to={`/job-postings/${posting.id}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                                >
                                  <FiEye size={13} /> Xem
                                </Link>
                              )}

                              {posting.status === 'REJECTED' && (
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

                              {posting.status === 'APPROVED' && (
                                <Link
                                  to={`/job-postings/${posting.id}`}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, textDecoration: 'none' }}
                                >
                                  <FiEye size={13} /> Xem
                                </Link>
                              )}

                              {posting.status === 'PUBLISHED' && (
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
                                    style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 6, textDecoration: 'none' }}
                                  >
                                    Xem công khai
                                  </a>
                                </>
                              )}
                            </>
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