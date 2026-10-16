import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FiBriefcase, 
  FiMapPin, 
  FiSearch, 
  FiCalendar, 
  FiArrowRight, 
  FiX, 
  FiUsers, 
  FiDollarSign, 
  FiClock, 
  FiSliders,
  FiCheckCircle
} from 'react-icons/fi';
import '../../styles/public-jobs.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PublicJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ departments: [], locations: [], workTypes: [] });
  const [filters, setFilters] = useState({ search: '', departmentId: '', location: '', workType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuickDept, setSelectedQuickDept] = useState('');

  // Fetch jobs with given filters
  const loadJobs = async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(currentFilters).filter(([, value]) => value !== '' && value !== null && value !== undefined)
      );
      const response = await axios.get(`${API}/public/jobs`, { params });
      setJobs(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách việc làm vào lúc này.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch filter options once
  const loadFilterOptions = async () => {
    try {
      const response = await axios.get(`${API}/public/jobs/filter-options`);
      if (response.data.data) {
        setFilterOptions(response.data.data);
      }
    } catch {
      // Fallback: derive from jobs
    }
  };

  useEffect(() => {
    loadJobs(filters);
    loadFilterOptions();
  }, []);

  const changeFilter = (name, value) => {
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    if (name === 'departmentId') {
      setSelectedQuickDept(value);
    }
    loadJobs(updated);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadJobs(filters);
  };

  const handleResetFilters = () => {
    const resetState = { search: '', departmentId: '', location: '', workType: '' };
    setFilters(resetState);
    setSelectedQuickDept('');
    loadJobs(resetState);
  };

  const handleQuickDeptClick = (deptId) => {
    const nextVal = selectedQuickDept === String(deptId) ? '' : String(deptId);
    setSelectedQuickDept(nextVal);
    changeFilter('departmentId', nextVal);
  };

  const hasActiveFilters = Boolean(filters.search || filters.departmentId || filters.location || filters.workType);

  // Helper to calculate days remaining
  const getDeadlineInfo = (deadlineStr) => {
    if (!deadlineStr) return { text: 'Không giới hạn hạn nộp', isUrgent: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    const formattedDate = new Date(deadlineStr).toLocaleDateString('vi-VN');

    if (diffDays === 0) {
      return { text: 'Hôm nay là hạn chót', isUrgent: true, date: formattedDate };
    } else if (diffDays > 0 && diffDays <= 3) {
      return { text: `Sắp hết hạn (còn ${diffDays} ngày)`, isUrgent: true, date: formattedDate };
    } else if (diffDays > 3) {
      return { text: `Hạn nộp: ${formattedDate} (còn ${diffDays} ngày)`, isUrgent: false, date: formattedDate };
    } else {
      return { text: `Đã hết hạn (${formattedDate})`, isUrgent: true, date: formattedDate };
    }
  };

  // Derive dropdown options (from API or local)
  const departmentsList = useMemo(() => {
    if (filterOptions.departments && filterOptions.departments.length > 0) {
      return filterOptions.departments;
    }
    const map = new Map();
    jobs.forEach(job => {
      if (job.department_id) map.set(job.department_id, job.department_name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [filterOptions.departments, jobs]);

  const locationsList = useMemo(() => {
    if (filterOptions.locations && filterOptions.locations.length > 0) {
      return filterOptions.locations.map(item => item.name);
    }
    return [...new Set(jobs.map(j => j.location_name).filter(Boolean))];
  }, [filterOptions.locations, jobs]);

  const workTypesList = useMemo(() => {
    if (filterOptions.workTypes && filterOptions.workTypes.length > 0) {
      return filterOptions.workTypes.map(item => item.name);
    }
    return [...new Set(jobs.map(j => j.work_type_name).filter(Boolean))];
  }, [filterOptions.workTypes, jobs]);

  return (
    <div className="pj-portal">
      {/* Top Navbar */}
      <header className="pj-navbar" role="banner">
        <div className="pj-nav-container">
          <Link to="/jobs" className="pj-logo-group" aria-label="Trang chủ tuyển dụng TechCorp">
            <div className="pj-logo-badge">T</div>
            <div className="pj-logo-text">
              <span className="pj-logo-title">TechCorp Careers</span>
              <span className="pj-logo-sub">Cổng tuyển dụng mở</span>
            </div>
          </Link>
          <nav className="pj-nav-links" aria-label="Điều hướng chính" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/jobs" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              Cơ hội nghề nghiệp
            </Link>
            <Link to="/jobs/track" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              🔍 Tra cứu hồ sơ
            </Link>
            <Link to="/jobs/track?tab=apply" style={{ color: '#86efac', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
              📝 Nộp hồ sơ online
            </Link>
            <Link to="/login" className="pj-nav-btn-login">
              Dành cho Nội bộ / Đăng nhập
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pj-hero">
        <div className="pj-hero-inner">
          <div className="pj-pill-tag">
            <FiCheckCircle /> Tuyển dụng công khai · Không cần tài khoản
          </div>
          <h1 className="pj-hero-title">Khám phá cơ hội nghề nghiệp tương lai</h1>
          <p className="pj-hero-desc">
            Xem danh sách các vị trí đang mở tuyển, tìm kiếm công việc phù hợp với năng lực 
            và nộp hồ sơ trực tuyến chỉ trong vài phút.
          </p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="pj-search-card" aria-label="Bộ lọc tìm kiếm">
        <div className="pj-search-box">
          <form className="pj-search-form" onSubmit={handleSearchSubmit}>
            {/* Keyword Search */}
            <div className="pj-input-wrap">
              <FiSearch className="pj-input-icon" />
              <input
                id="search-input"
                className="pj-search-input"
                aria-label="Từ khóa tìm kiếm"
                type="text"
                placeholder="Vị trí tuyển dụng, kỹ năng, chuyên môn..."
                value={filters.search}
                onChange={(e) => setFilters(current => ({ ...current, search: e.target.value }))}
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                id="filter-department"
                className="pj-select-input"
                aria-label="Lọc theo phòng ban"
                value={filters.departmentId}
                onChange={(e) => changeFilter('departmentId', e.target.value)}
              >
                <option value="">Tất cả phòng ban</option>
                {departmentsList.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <select
                id="filter-location"
                className="pj-select-input"
                aria-label="Lọc theo địa điểm"
                value={filters.location}
                onChange={(e) => changeFilter('location', e.target.value)}
              >
                <option value="">Tất cả địa điểm</option>
                {locationsList.map((loc, idx) => (
                  <option key={idx} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Work Type Filter */}
            <div>
              <select
                id="filter-work-type"
                className="pj-select-input"
                aria-label="Lọc theo hình thức làm việc"
                value={filters.workType}
                onChange={(e) => changeFilter('workType', e.target.value)}
              >
                <option value="">Tất cả hình thức</option>
                {workTypesList.map((wt, idx) => (
                  <option key={idx} value={wt}>{wt}</option>
                ))}
              </select>
            </div>

            {/* Search and Reset Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" id="btn-search-jobs" className="pj-btn-submit">
                <FiSearch /> Tìm kiếm
              </button>
              {hasActiveFilters && (
                <button 
                  type="button" 
                  id="btn-reset-filters"
                  className="pj-btn-reset" 
                  onClick={handleResetFilters}
                  title="Xóa tất cả bộ lọc"
                >
                  <FiX /> Xóa lọc
                </button>
              )}
            </div>
          </form>

          {/* Quick Department Filter Pills */}
          {departmentsList.length > 0 && (
            <div className="pj-quick-filters" aria-label="Lọc nhanh phòng ban">
              <span className="pj-filter-label"><FiSliders style={{ verticalAlign: 'middle', marginRight: 4 }} /> Phòng ban:</span>
              <button
                type="button"
                className={`pj-filter-chip ${!selectedQuickDept ? 'active' : ''}`}
                onClick={() => handleQuickDeptClick('')}
              >
                Tất cả
              </button>
              {departmentsList.map(dept => (
                <button
                  key={dept.id}
                  type="button"
                  className={`pj-filter-chip ${selectedQuickDept === String(dept.id) ? 'active' : ''}`}
                  onClick={() => handleQuickDeptClick(dept.id)}
                >
                  {dept.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Job List Content */}
      <main className="pj-main-content">
        {/* Results Header */}
        <div className="pj-results-bar">
          <div className="pj-results-count" id="jobs-count-text">
            {loading ? 'Đang tìm kiếm vị trí...' : `${jobs.length} vị trí đang mở tuyển dụng`}
          </div>
          {hasActiveFilters && (
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Đang áp dụng bộ lọc tùy chỉnh
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" style={{ padding: 16, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div style={{ display: 'grid', gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                Đang tải thông tin việc làm...
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && jobs.length === 0 && (
          <div className="pj-empty-state">
            <div className="pj-empty-icon"><FiBriefcase /></div>
            <h2 className="pj-empty-title">Không tìm thấy vị trí tuyển dụng phù hợp</h2>
            <p className="pj-empty-desc">
              {hasActiveFilters
                ? 'Không có việc làm nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Hãy thử thay đổi từ khóa hoặc xóa bớt bộ lọc.'
                : 'Hiện tại các vị trí đã hết hạn hoặc tạm đóng. Vui lòng quay lại sau!'}
            </p>
            {hasActiveFilters && (
              <button type="button" className="pj-btn-submit" onClick={handleResetFilters}>
                <FiX /> Xóa bộ lọc và xem tất cả
              </button>
            )}
          </div>
        )}

        {/* Jobs List */}
        {!loading && jobs.length > 0 && (
          <div className="pj-job-grid" id="jobs-list">
            {jobs.map(job => {
              const deadline = getDeadlineInfo(job.deadline);
              return (
                <article key={job.id} className="pj-job-card" id={`job-card-${job.id}`}>
                  <div className="pj-card-header">
                    <span className="pj-dept-badge">
                      {job.department_name || 'TechCorp'}
                    </span>
                    <span className={`pj-deadline-badge ${deadline.isUrgent ? 'pj-deadline-urgent' : 'pj-deadline-normal'}`}>
                      <FiClock /> {deadline.text}
                    </span>
                  </div>

                  <h2 className="pj-job-title">
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                  </h2>

                  {job.description && (
                    <p className="pj-job-excerpt">
                      {job.description}
                    </p>
                  )}

                  <div className="pj-job-meta-row">
                    <div className="pj-meta-pills">
                      <span className="pj-meta-item">
                        <FiMapPin style={{ color: '#6366f1' }} /> {job.location_name || 'Linh hoạt'}
                      </span>
                      <span className="pj-meta-item">
                        <FiBriefcase style={{ color: '#6366f1' }} /> {job.work_type_name || 'Toàn thời gian'}
                      </span>
                      {job.headcount && (
                        <span className="pj-meta-item">
                          <FiUsers style={{ color: '#6366f1' }} /> Tuyển {job.headcount} nhân sự
                        </span>
                      )}
                      <span className="pj-salary-pill">
                        <FiDollarSign style={{ verticalAlign: 'middle', marginRight: 2 }} />
                        {job.salary_display || 'Thỏa thuận'}
                      </span>
                    </div>

                    <Link 
                      to={`/jobs/${job.id}`} 
                      className="pj-btn-apply" 
                      id={`apply-btn-${job.id}`}
                      aria-label={`Xem chi tiết và ứng tuyển vị trí ${job.title}`}
                    >
                      Chi tiết & Ứng tuyển <FiArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', background: '#0f172a', color: '#94a3b8', padding: '36px 20px', borderTop: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>TechCorp Careers Portal</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Hệ thống Quản lý Tuyển dụng Nội bộ & Tuyển dụng Công khai</div>
          </div>
          <div style={{ fontSize: 13 }}>
            © {new Date().getFullYear()} TechCorp Inc. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicJobs;
