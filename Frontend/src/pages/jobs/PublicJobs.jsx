import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiMapPin, FiSearch } from 'react-icons/fi';

const API = 'http://localhost:5000/api/public/jobs';

const PublicJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [filters, setFilters] = useState({ search: '', departmentId: '', location: '', workType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJobs = async (nextFilters = filters, initial = false) => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await axios.get(API, { params });
      const data = response.data.data || [];
      setJobs(data);
      if (initial) setAllJobs(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách việc làm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs({ search: '', departmentId: '', location: '', workType: '' }, true);
  }, []);

  const changeFilter = (name, value) => setFilters(current => ({ ...current, [name]: value }));
  const departments = [...new Map(allJobs.map(job => [job.department_id, { id: job.department_id, name: job.department_name }])).values()].filter(item => item.id);
  const locations = [...new Set(allJobs.map(job => job.location_name).filter(Boolean))];
  const workTypes = [...new Set(allJobs.map(job => job.work_type_name).filter(Boolean))];

  return (
    <main style={{ minHeight: '100vh', background: '#f5f7fb', color: '#172033' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '24px clamp(20px, 6vw, 88px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TechCorp · Cổng Tuyển Dụng</div>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, color: '#fff' }}>Cơ hội nghề nghiệp</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/jobs/track" style={{ color: '#93c5fd', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(147, 197, 253, 0.3)', borderRadius: 6, padding: '8px 14px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔍</span> Tra cứu hồ sơ
            </Link>
            <Link to="/jobs/track?tab=apply" style={{ color: '#86efac', textDecoration: 'none', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(134, 239, 172, 0.3)', borderRadius: 6, padding: '8px 14px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📝</span> Nộp hồ sơ online
            </Link>
            <a href="/login" style={{ color: '#fff', textDecoration: 'none', border: '1px solid #475569', borderRadius: 6, padding: '8px 14px', fontWeight: 600, fontSize: 13 }}>Đăng nhập nội bộ</a>
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px' }}>
        <form onSubmit={event => { event.preventDefault(); loadJobs(filters); }} style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(140px, 1fr)) auto', gap: 10, padding: 16, background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8 }}>
          <label style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', top: 12, left: 12, color: '#64748b' }} />
            <input aria-label="Từ khóa" value={filters.search} onChange={event => changeFilter('search', event.target.value)} placeholder="Chức danh, kỹ năng..." style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', border: '1px solid #cbd5e1', borderRadius: 6 }} />
          </label>
          <select aria-label="Phòng ban" value={filters.departmentId} onChange={event => changeFilter('departmentId', event.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}>
            <option value="">Tất cả phòng ban</option>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select aria-label="Địa điểm" value={filters.location} onChange={event => changeFilter('location', event.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}>
            <option value="">Tất cả địa điểm</option>
            {locations.map(location => <option key={location} value={location}>{location}</option>)}
          </select>
          <select aria-label="Hình thức" value={filters.workType} onChange={event => changeFilter('workType', event.target.value)} style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff' }}>
            <option value="">Tất cả hình thức</option>
            {workTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 0, borderRadius: 6, color: '#fff', background: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}><FiSearch /> Tìm</button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '24px 0 12px', color: '#475569' }}>
          <strong>{loading ? 'Đang tìm việc...' : `${jobs.length} vị trí đang tuyển`}</strong>
          <a href="/login" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>Đăng nhập để ứng tuyển</a>
        </div>

        {error && <div role="alert" style={{ padding: 14, color: '#991b1b', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}
        {!loading && !error && jobs.length === 0 && <div style={{ padding: 44, textAlign: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#64748b' }}>Hiện chưa có tin tuyển dụng phù hợp.</div>}

        <div style={{ display: 'grid', gap: 12 }}>
          {jobs.map(job => (
            <article key={job.id} style={{ background: '#fff', border: '1px solid #dbe2ea', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{job.department_name || 'TechCorp'} · {job.position_name || job.title}</div>
                  <h2 style={{ margin: '6px 0 12px', fontSize: 21 }}>{job.title}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: '#475569', fontSize: 14 }}>
                    <span><FiMapPin style={{ verticalAlign: 'middle' }} /> {job.location_name || 'Linh hoạt'}</span>
                    <span><FiBriefcase style={{ verticalAlign: 'middle' }} /> {job.work_type_name || 'Toàn thời gian'}</span>
                    <span>{job.salary_display || 'Thỏa thuận'}</span>
                  </div>
                </div>
                <Link to={`/jobs/${job.id}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: '#4f46e5', color: '#fff', textDecoration: 'none', fontWeight: 700 }}>Chi tiết & ứng tuyển</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default PublicJobs;