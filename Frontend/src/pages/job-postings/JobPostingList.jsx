import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiEye, FiGlobe, FiPlus, FiRefreshCw, FiSearch, FiSend, FiEdit2, FiCheck, FiX, FiMoreHorizontal } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const API = 'http://localhost:5000/api';
const PAGE_SIZE = 6;

const tabs = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Bản nháp' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PUBLISHED', label: 'Đã xuất bản' },
  { key: 'REJECTED', label: 'Bị từ chối' }
];

const statusLabels = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối',
  CLOSED: 'Đã đóng'
};

const statusColors = {
  DRAFT: { background: '#f1f5f9', color: '#475569' },
  PENDING_REVIEW: { background: '#fef3c7', color: '#d97706' },
  PENDING_APPROVAL: { background: '#fef3c7', color: '#d97706' },
  APPROVED: { background: '#eff6ff', color: '#1d4ed8' },
  PUBLISHED: { background: '#dcfce7', color: '#15803d' },
  REJECTED: { background: '#fee2e2', color: '#b91c1c' },
  CLOSED: { background: '#f1f5f9', color: '#64748b' }
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

const JobPostingList = () => {
  const { user } = useContext(AuthContext);
  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);

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

  const departments = useMemo(() => {
    const unique = new Map();
    postings.forEach(posting => {
      if (posting.department_id) unique.set(String(posting.department_id), posting.department_name);
    });
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [postings]);

  const counts = useMemo(() => postings.reduce((result, posting) => {
    result.ALL += 1;
    const key = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, { ALL: 0 }), [postings]);

  const filteredPostings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return postings.filter(posting => {
      const currentStatus = posting.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : posting.status;
      const matchesTab = activeTab === 'ALL' || currentStatus === activeTab;
      const matchesDepartment = !departmentId || String(posting.department_id) === departmentId;
      const searchable = [posting.title, posting.position_name, posting.department_name].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return matchesTab && matchesDepartment && (!keyword || searchable.includes(keyword));
    });
  }, [postings, activeTab, departmentId, search]);

  useEffect(() => setPage(1), [activeTab, departmentId, search]);
  const pageCount = Math.max(1, Math.ceil(filteredPostings.length / PAGE_SIZE));
  const visiblePostings = filteredPostings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const sendForReview = async (id) => {
    try {
      await axios.post(`${API}/job-postings/${id}/submit`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi duyệt tin.');
    }
  };

  const review = async (id, approved) => {
    const note = approved ? '' : window.prompt('Nhập lý do từ chối tin:');
    if (!approved && note === null) return;
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved, note }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xử lý tin tuyển dụng.');
    }
  };

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div>
          <h1 className="g-page-title">Tin tuyển dụng</h1>
          <p className="g-page-subtitle">Soạn tin, duyệt và xuất bản lên trang công khai</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="g-btn-secondary" href="/jobs" target="_blank" rel="noreferrer"><FiGlobe /> Trang công khai</a>
          <Link className="g-btn-primary" to="/job-postings/create"><FiPlus /> Tạo bản nháp</Link>
        </div>
      </header>

      <section className="g-card" style={{ padding: 12, marginBottom: 12 }}>
        <form onSubmit={event => event.preventDefault()} style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(170px, 220px) auto', gap: 10, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 11, top: 11, color: '#94a3b8' }} />
            <input className="g-form-input" aria-label="Tìm tin tuyển dụng" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tiêu đề, vị trí, phòng ban..." style={{ paddingLeft: 34 }} />
          </label>
          <select className="g-form-input" aria-label="Lọc phòng ban" value={departmentId} onChange={event => setDepartmentId(event.target.value)}>
            <option value="">Tất cả phòng ban</option>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <button className="g-btn-secondary" type="button" onClick={() => { setSearch(''); setDepartmentId(''); setActiveTab('ALL'); }}><FiRefreshCw /> Làm mới</button>
        </form>
      </section>

      {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

      <section className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
        <nav aria-label="Lọc trạng thái tin" style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #e2e8f0', padding: '0 12px' }}>
          {tabs.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ flex: '0 0 auto', padding: '12px 14px', border: 0, borderBottom: activeTab === tab.key ? '2px solid var(--primary-color, #2563eb)' : '2px solid transparent', background: 'transparent', color: activeTab === tab.key ? 'var(--primary-color, #2563eb)' : '#64748b', fontWeight: activeTab === tab.key ? 700 : 500, cursor: 'pointer' }}>
              {tab.label} ({counts[tab.key] || 0})
            </button>
          ))}
        </nav>

        {loading ? <div style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>Đang tải danh sách...</div> : filteredPostings.length === 0 ? (
          <div style={{ padding: 42, textAlign: 'center', color: '#64748b' }}>{postings.length ? 'Không có tin phù hợp với bộ lọc.' : 'Chưa có tin tuyển dụng.'}</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 980 }}>
              <thead><tr><th>#</th><th>Tiêu đề tin</th><th>Vị trí tuyển dụng</th><th>Phòng ban</th><th>Trạng thái</th><th>Ngày tạo</th><th>Ngày xuất bản</th><th style={{ width: 230, minWidth: 210 }}>Thao tác</th></tr></thead>
              <tbody>
                {visiblePostings.map((posting, index) => (
                  <tr key={posting.id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td><strong>{posting.title}</strong><div style={{ color: '#64748b', fontSize: 12 }}>JOB-{String(posting.id).padStart(4, '0')}</div></td>
                    <td>{posting.position_name || '-'}</td>
                    <td>{posting.department_name || '-'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: statusColors[posting.status]?.background || '#f1f5f9',
                          color: statusColors[posting.status]?.color || '#475569'
                        }}
                      >
                        {statusLabels[posting.status] || posting.status}
                      </span>
                    </td>
                    <td>{formatDate(posting.created_at)}</td>
                    <td>{formatDate(posting.published_at)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                        <Link
                          title="Xem chi tiết"
                          aria-label={`Xem ${posting.title}`}
                          to={`/job-postings/${posting.id}`}
                          className="btn-action-view"
                          style={{ padding: '6px 12px' }}
                        >
                          <FiEye style={{ marginRight: 4 }} /> Xem
                        </Link>
                        {['DRAFT', 'REJECTED'].includes(posting.status) && (
                          <>
                            <Link
                              title="Sửa bản nháp"
                              to={`/job-postings/${posting.id}/edit`}
                              className="btn-action-edit"
                              style={{ padding: '6px 12px' }}
                            >
                              <FiEdit2 style={{ marginRight: 4 }} /> Sửa
                            </Link>
                            <button
                              className="btn-action-view"
                              type="button"
                              onClick={() => sendForReview(posting.id)}
                              style={{ padding: '6px 12px', background: '#e0e7ff', color: '#4338ca' }}
                            >
                              <FiSend style={{ marginRight: 4 }} /> Gửi duyệt
                            </button>
                          </>
                        )}
                        {canReview && ['PENDING_REVIEW', 'PENDING_APPROVAL'].includes(posting.status) && (
                          <>
                            <button
                              className="btn-action-edit"
                              type="button"
                              onClick={() => review(posting.id, true)}
                              style={{ padding: '6px 12px' }}
                            >
                              <FiCheck style={{ marginRight: 4 }} /> Duyệt
                            </button>
                            <button
                              className="btn-action-delete"
                              type="button"
                              onClick={() => review(posting.id, false)}
                              style={{ padding: '6px 12px' }}
                            >
                              <FiX style={{ marginRight: 4 }} /> Từ chối
                            </button>
                          </>
                        )}
                        {posting.status === 'PUBLISHED' && (
                          <a
                            href={`/jobs?job=${posting.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-action-view"
                            style={{ padding: '6px 12px', background: '#ecfdf5', color: '#047857' }}
                          >
                            <FiGlobe style={{ marginRight: 4 }} /> Xem công khai
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredPostings.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
            <button className="g-btn-secondary" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(current => current - 1)}><FiChevronLeft /></button>
            <span style={{ color: '#475569', fontSize: 13 }}>Trang {page} / {pageCount}</span>
            <button className="g-btn-secondary" aria-label="Trang sau" disabled={page >= pageCount} onClick={() => setPage(current => current + 1)}><FiChevronRight /></button>
          </div>
        )}
      </section>
    </div>
  );
};

export default JobPostingList;