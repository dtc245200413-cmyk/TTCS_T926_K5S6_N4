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
  { key: 'PUBLISHED', label: 'Đang xuất bản' },
  { key: 'HIDDEN', label: 'Đang ẩn' },
  { key: 'CLOSED', label: 'Đã gỡ' },
  { key: 'EXPIRED', label: 'Đã hết hạn' },
  { key: 'DRAFT', label: 'Bản nháp' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Bị từ chối' }
];

const statusLabels = {
  DRAFT: 'Bản nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PUBLISHED: 'Đang xuất bản',
  HIDDEN: 'Đang ẩn',
  REJECTED: 'Bị từ chối',
  CLOSED: 'Đã gỡ'
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-';

const isPostingExpired = (posting) => {
  if (!posting.deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(posting.deadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
};

const JobPostingList = () => {
  const { user } = useContext(AuthContext);

  // Phân quyền: Chỉ recruiter (hoặc Admin) có quyền JOB_POSTING_CLOSE mới được ẩn / gỡ tin
  const isRecruiterOrAdmin = user?.roles?.some(role => ['ADMIN', 'RECRUITER'].includes(role.role_code));
  const hasPostingPermission = user?.permissions?.includes('JOB_POSTING_CLOSE');
  const canManagePostings = isRecruiterOrAdmin && hasPostingPermission;

  const canReview = user?.roles?.some(role => ['ADMIN', 'HR_MANAGER'].includes(role.role_code));

  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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

  // Dynamic counts for tabs
  const counts = useMemo(() => postings.reduce((result, posting) => {
    result.ALL += 1;
    result[posting.status] = (result[posting.status] || 0) + 1;
    if (isPostingExpired(posting)) {
      result.EXPIRED = (result.EXPIRED || 0) + 1;
    }
    return result;
  }, { ALL: 0, EXPIRED: 0 }), [postings]);

  // Filter list
  const filteredPostings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return postings.filter(posting => {
      let matchesTab = true;
      if (activeTab === 'EXPIRED') {
        matchesTab = isPostingExpired(posting);
      } else if (activeTab !== 'ALL') {
        matchesTab = posting.status === activeTab;
      }

      const matchesDepartment = !departmentId || String(posting.department_id) === departmentId;
      const searchable = [posting.title, posting.position_name, posting.department_name, `JOB-${posting.id}`]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');

      return matchesTab && matchesDepartment && (!keyword || searchable.includes(keyword));
    });
  }, [postings, activeTab, departmentId, search]);

  useEffect(() => setPage(1), [activeTab, departmentId, search]);
  const pageCount = Math.max(1, Math.ceil(filteredPostings.length / PAGE_SIZE));
  const visiblePostings = filteredPostings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

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
    const isExpired = isPostingExpired(posting);
    const confirmText = isExpired
      ? `Gỡ tin hết hiệu lực "${posting.title}" khỏi trang công khai?`
      : `Gỡ tin tuyển dụng "${posting.title}" khỏi trang công khai? Trạng thái sẽ chuyển thành Đã gỡ.`;

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

  const sendForReview = async (id) => {
    try {
      await axios.post(`${API}/job-postings/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification('Đã gửi tin lên cấp quản lý chờ duyệt.');
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi duyệt tin.');
    }
  };

  const review = async (id, approved) => {
    const note = approved ? '' : window.prompt('Nhập lý do từ chối tin:');
    if (!approved && note === null) return;
    try {
      await axios.patch(`${API}/job-postings/${id}/review`, { approved, note }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showNotification(approved ? 'Đã duyệt tin thành công.' : 'Đã từ chối tin tuyển dụng.');
      await loadPostings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xử lý tin tuyển dụng.');
    }
  };

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div>
          <h1 className="g-page-title">Quản lý Tin tuyển dụng</h1>
          <p className="g-page-subtitle">
            Soạn thảo, phê duyệt, xuất bản và quản lý trạng thái hiển thị trên cổng công khai
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a className="g-btn-secondary" href="/jobs" target="_blank" rel="noreferrer" id="btn-view-public-portal">
            <FiGlobe /> Xem Cổng công khai
          </a>
          <Link className="g-btn-primary" to="/job-postings/create" id="btn-create-job-draft">
            <FiPlus /> Tạo bản nháp mới
          </Link>
        </div>
      </header>

      {/* Success Notification */}
      {successMsg && (
        <div className="alert alert-success" role="status" style={{ marginBottom: 14 }}>
          <FiCheck style={{ marginRight: 6 }} /> {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 14 }}>
          <FiAlertTriangle style={{ marginRight: 6 }} /> {error}
        </div>
      )}

      {/* Search & Filter Bar */}
      <section className="g-card" style={{ padding: 14, marginBottom: 14 }}>
        <form onSubmit={e => e.preventDefault()} style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(180px, 240px) auto', gap: 12, alignItems: 'center' }}>
          <label style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
            <input 
              id="admin-search-posting"
              className="g-form-input" 
              aria-label="Tìm tin tuyển dụng" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Tìm theo tiêu đề, mã tin, chức danh, phòng ban..." 
              style={{ paddingLeft: 36 }} 
            />
          </label>
          <select 
            id="admin-filter-dept"
            className="g-form-input" 
            aria-label="Lọc phòng ban" 
            value={departmentId} 
            onChange={e => setDepartmentId(e.target.value)}
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <button 
            id="btn-admin-reset-filter"
            className="g-btn-secondary" 
            type="button" 
            onClick={() => { setSearch(''); setDepartmentId(''); setActiveTab('ALL'); }}
          >
            <FiRefreshCw /> Làm mới
          </button>
        </form>
      </section>

      {/* Status Tabs Navigation */}
      <section className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
        <nav aria-label="Lọc trạng thái tin tuyển dụng" style={{ display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid #e2e8f0', padding: '0 12px' }}>
          {tabs.map(tab => (
            <button 
              key={tab.key} 
              id={`tab-${tab.key.toLowerCase()}`}
              type="button" 
              onClick={() => setActiveTab(tab.key)} 
              style={{ 
                flex: '0 0 auto', 
                padding: '12px 14px', 
                border: 0, 
                borderBottom: activeTab === tab.key ? '2px solid var(--primary-color, #2563eb)' : '2px solid transparent', 
                background: 'transparent', 
                color: activeTab === tab.key ? 'var(--primary-color, #2563eb)' : '#64748b', 
                fontWeight: activeTab === tab.key ? 700 : 500, 
                cursor: 'pointer' 
              }}
            >
              {tab.label} ({counts[tab.key] || 0})
            </button>
          ))}
        </nav>

        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách tin tuyển dụng...
          </div>
        ) : filteredPostings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            {postings.length ? 'Không có tin tuyển dụng nào phù hợp với bộ lọc hiện tại.' : 'Chưa có tin tuyển dụng nào.'}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 1040 }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Tiêu đề tin & Mã tin</th>
                  <th>Phòng ban & Vị trí</th>
                  <th>Hạn nộp hồ sơ</th>
                  <th>Trạng thái</th>
                  <th>Ngày xuất bản</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visiblePostings.map((posting, index) => {
                  const expired = isPostingExpired(posting);
                  const isHidden = posting.status === 'HIDDEN';
                  const isPublished = posting.status === 'PUBLISHED';
                  const isClosed = posting.status === 'CLOSED';

                  return (
                    <tr key={posting.id} id={`row-posting-${posting.id}`}>
                      <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                      <td>
                        <strong style={{ fontSize: 14 }}>{posting.title}</strong>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                          JOB-{String(posting.id).padStart(4, '0')} · REQ-{String(posting.recruitment_request_id).padStart(4, '0')}
                        </div>
                      </td>
                      <td>
                        <div>{posting.department_name || '-'}</div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>{posting.position_name || '-'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FiClock color={expired ? '#ef4444' : '#64748b'} />
                          <span style={{ color: expired ? '#dc2626' : 'inherit', fontWeight: expired ? 700 : 400 }}>
                            {formatDate(posting.deadline)}
                          </span>
                        </div>
                        {expired && isPublished && (
                          <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 700 }}>
                            ⚠️ Đã quá hạn
                          </div>
                        )}
                      </td>
                      <td>
                        {/* Status Badge */}
                        {isPublished && !expired && (
                          <span className="badge badge-success">Đang xuất bản</span>
                        )}
                        {isPublished && expired && (
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            Hết hiệu lực
                          </span>
                        )}
                        {isHidden && (
                          <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                            <FiEyeOff style={{ marginRight: 3, verticalAlign: 'middle' }} /> Đang ẩn
                          </span>
                        )}
                        {isClosed && (
                          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            Đã gỡ
                          </span>
                        )}
                        {posting.status === 'PENDING_REVIEW' && (
                          <span className="badge badge-warning">Chờ duyệt</span>
                        )}
                        {posting.status === 'APPROVED' && (
                          <span className="badge badge-info">Đã duyệt</span>
                        )}
                        {posting.status === 'DRAFT' && (
                          <span className="badge badge-info" style={{ background: '#f1f5f9', color: '#475569' }}>
                            Bản nháp
                          </span>
                        )}
                        {posting.status === 'REJECTED' && (
                          <span className="badge badge-danger">Bị từ chối</span>
                        )}
                      </td>
                      <td>{formatDate(posting.published_at)}</td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                          {/* Xem chi tiết */}
                          <Link 
                            title="Xem chi tiết" 
                            id={`view-btn-${posting.id}`}
                            to={`/job-postings/${posting.id}`} 
                            className="btn-action-view"
                          >
                            <FiEye /> Xem
                          </Link>

                          {/* Sửa và Gửi duyệt nếu là bản nháp / bị từ chối */}
                          {['DRAFT', 'REJECTED'].includes(posting.status) && (
                            <>
                              <Link 
                                title="Sửa bản nháp" 
                                to={`/job-postings/${posting.id}/edit`} 
                                className="btn-action-edit"
                              >
                                <FiEdit2 /> Sửa
                              </Link>
                              <button 
                                className="btn-action-view" 
                                type="button" 
                                onClick={() => sendForReview(posting.id)}
                              >
                                <FiSend /> Gửi duyệt
                              </button>
                            </>
                          )}

                          {/* Duyệt / Từ chối dành cho HR Manager hoặc Admin */}
                          {canReview && posting.status === 'PENDING_REVIEW' && (
                            <>
                              <button 
                                className="btn-action-edit" 
                                type="button" 
                                onClick={() => review(posting.id, true)}
                              >
                                <FiCheck /> Duyệt
                              </button>
                              <button 
                                className="btn-action-delete" 
                                type="button" 
                                onClick={() => review(posting.id, false)}
                              >
                                <FiX /> Từ chối
                              </button>
                            </>
                          )}

                          {/* Xem trên cổng công khai nếu đang xuất bản */}
                          {isPublished && !expired && (
                            <a 
                              href={`/jobs/${posting.id}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn-action-view"
                              title="Mở trên cổng tuyển dụng công khai"
                            >
                              <FiGlobe /> Trang công khai
                            </a>
                          )}

                          {/* CHỨC NĂNG DÀNH CHO RECRUITER ĐƯỢC PHÂN QUYỀN: ẨN / GỠ TIN */}
                          {canManagePostings && (
                            <>
                              {/* Ẩn tin nếu đang xuất bản */}
                              {isPublished && (
                                <button
                                  type="button"
                                  id={`hide-btn-${posting.id}`}
                                  className="btn-action-view"
                                  style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe' }}
                                  title="Ẩn tin khỏi trang công khai (ứng viên không thấy)"
                                  disabled={actionLoadingId === posting.id}
                                  onClick={() => hidePosting(posting)}
                                >
                                  <FiEyeOff /> Ẩn tin
                                </button>
                              )}

                              {/* Bỏ ẩn nếu đang ẩn */}
                              {isHidden && (
                                <button
                                  type="button"
                                  id={`unhide-btn-${posting.id}`}
                                  className="btn-action-edit"
                                  title="Hiển thị lại tin trên trang công khai"
                                  disabled={actionLoadingId === posting.id}
                                  onClick={() => unhidePosting(posting)}
                                >
                                  <FiEye /> Hiện lại
                                </button>
                              )}

                              {/* Gỡ tin nếu đang xuất bản hoặc đang ẩn */}
                              {(isPublished || isHidden) && (
                                <button
                                  type="button"
                                  id={`close-btn-${posting.id}`}
                                  className="btn-action-delete"
                                  title={expired ? "Gỡ tin đã hết hiệu lực khỏi trang công khai" : "Gỡ tin khỏi trang công khai"}
                                  disabled={actionLoadingId === posting.id}
                                  onClick={() => closePosting(posting)}
                                >
                                  <FiXCircle /> Gỡ tin
                                </button>
                              )}
                            </>
                          )}

                          {/* Xem trước */}
                          <Link 
                            title="Xem trước" 
                            to={`/job-postings/${posting.id}/preview`} 
                            className="btn-action-view"
                          >
                            <FiMoreHorizontal />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredPostings.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: 14, borderTop: '1px solid #e2e8f0' }}>
            <button 
              className="g-btn-secondary" 
              aria-label="Trang trước" 
              disabled={page <= 1} 
              onClick={() => setPage(curr => curr - 1)}
            >
              <FiChevronLeft />
            </button>
            <span style={{ color: '#475569', fontSize: 13 }}>
              Trang {page} / {pageCount}
            </span>
            <button 
              className="g-btn-secondary" 
              aria-label="Trang sau" 
              disabled={page >= pageCount} 
              onClick={() => setPage(curr => curr + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default JobPostingList;
