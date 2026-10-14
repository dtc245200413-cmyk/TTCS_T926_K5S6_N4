import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiBell, FiBriefcase, FiCalendar, FiMail, FiArrowRight } from 'react-icons/fi';

const API = 'http://localhost:3000/api/candidate-portal';
const statusText = { SUBMITTED: 'Đang xem xét', SCREENING: 'Đang sàng lọc', INTERVIEWING: 'Phỏng vấn', OFFERED: 'Thư mời', HIRED: 'Đã nhận việc', REJECTED: 'Từ chối', WITHDRAWN: 'Đã rút hồ sơ' };
const statusColor = { SUBMITTED: '#2563eb', SCREENING: '#2563eb', INTERVIEWING: '#d97706', OFFERED: '#16a34a', HIRED: '#16a34a', REJECTED: '#dc2626', WITHDRAWN: '#64748b' };

const CandidateDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    axios.get(`${API}/dashboard`, { headers: { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` } })
      .then(response => setData(response.data.data))
      .catch(requestError => setError(requestError.response?.data?.message || 'Không thể tải tổng quan ứng viên.'))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { title: 'Việc làm đã ứng tuyển', count: data?.counts.applications || 0, icon: <FiBriefcase />, color: '#2563eb' },
    { title: 'Đang tuyển dụng', count: data?.counts.active_applications || 0, icon: <FiArrowRight />, color: '#d97706' },
    { title: 'Lịch phỏng vấn', count: data?.counts.interviews || 0, icon: <FiCalendar />, color: '#7c3aed' },
    { title: 'Thư mời nhận việc', count: data?.counts.offers || 0, icon: <FiMail />, color: '#059669' }
  ];

  return (
    <div className="g-page-container">
      <header className="g-page-header"><div><h1 className="g-page-title">Tổng quan</h1><p className="g-page-subtitle">Quản lý hồ sơ ứng tuyển và theo dõi tiến trình của bạn</p></div><Link to="/jobs" className="g-btn-primary"><FiBriefcase /> Tìm việc làm</Link></header>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {loading ? <div className="g-card">Đang tải tổng quan...</div> : <>
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '20px 24px', marginBottom: 16, border: '1px solid #dbeafe', borderRadius: 8, background: '#eff6ff' }}>
          <div><h2 style={{ margin: 0, fontSize: 20 }}>Xin chào, {data?.candidate?.full_name || 'Ứng viên'}!</h2><p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>Theo dõi hồ sơ và các bước tiếp theo trong hành trình nghề nghiệp của bạn.</p></div>
          <FiBriefcase size={36} color="#2563eb" />
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
          {stats.map(stat => <article key={stat.title} className="g-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, margin: 0 }}><span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 6, color: stat.color, background: `${stat.color}18`, fontSize: 18 }}>{stat.icon}</span><div><div style={{ color: '#64748b', fontSize: 12 }}>{stat.title}</div><strong style={{ display: 'block', marginTop: 2, fontSize: 23 }}>{loading ? '–' : stat.count}</strong></div></article>)}
        </section>
        <section className="g-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 15 }}>Việc làm đã ứng tuyển gần đây</h2><Link to="/candidate/applications" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Xem tất cả</Link></div>
          {(data?.recent_applications || []).length === 0 ? <div style={{ padding: 24, color: '#64748b', fontSize: 13 }}>Bạn chưa ứng tuyển vị trí nào. <Link to="/jobs">Khám phá việc làm</Link></div> : (data.recent_applications || []).map(application => <div key={application.application_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid #f1f5f9' }}><div><strong style={{ fontSize: 14 }}>{application.title}</strong><div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{application.department_name || 'TechCorp'} · {application.location_name || 'Linh hoạt'}</div></div><div style={{ textAlign: 'right' }}><span style={{ color: statusColor[application.status] || '#64748b', fontSize: 12, fontWeight: 700 }}>{statusText[application.status] || application.status}</span><div style={{ marginTop: 3, color: '#94a3b8', fontSize: 11 }}>{new Date(application.applied_at).toLocaleDateString('vi-VN')}</div></div></div>)}
        </section>
        {(data?.notifications || []).length > 0 && <section className="g-card" style={{ padding: 16 }}><h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', fontSize: 15 }}><FiBell /> Thông báo mới</h2>{data.notifications.slice(0, 3).map(notification => <div key={notification.id} style={{ padding: '8px 0', color: '#475569', fontSize: 13, borderTop: '1px solid #f1f5f9' }}>{notification.title}<div style={{ color: '#94a3b8', fontSize: 11 }}>{new Date(notification.created_at).toLocaleString('vi-VN')}</div></div>)}</section>}
      </>}
    </div>
  );
};

export default CandidateDashboard;