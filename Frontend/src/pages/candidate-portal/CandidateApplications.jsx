import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiBriefcase } from 'react-icons/fi';

const API = 'http://localhost:5000/api/candidate-portal';
const statuses = { SUBMITTED: ['Đang xem xét', 'badge-info'], SCREENING: ['Đang sàng lọc', 'badge-info'], INTERVIEWING: ['Phỏng vấn', 'badge-warning'], OFFERED: ['Thư mời', 'badge-success'], HIRED: ['Đã nhận việc', 'badge-success'], REJECTED: ['Từ chối', 'badge-error'], WITHDRAWN: ['Đã rút hồ sơ', 'badge-warning'] };

const CandidateApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    axios.get(`${API}/applications`, { headers: { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` } })
      .then(response => setApplications(response.data.data || []))
      .catch(requestError => setError(requestError.response?.data?.message || 'Không thể tải lịch sử ứng tuyển.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="g-page-container">
      <header className="g-page-header"><div><h1 className="g-page-title">Việc làm đã ứng tuyển</h1><p className="g-page-subtitle">Theo dõi trạng thái các hồ sơ của bạn</p></div><Link to="/jobs" className="g-btn-primary"><FiBriefcase /> Tìm việc làm</Link></header>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      <section className="g-card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? <div style={{ padding: 24 }}>Đang tải hồ sơ...</div> : applications.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Bạn chưa ứng tuyển vị trí nào. <Link to="/jobs">Xem việc làm đang tuyển</Link></div> : <table className="data-table" style={{ minWidth: 760 }}>
          <thead><tr><th>#</th><th>Vị trí</th><th>Phòng ban</th><th>Ngày ứng tuyển</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{applications.map((application, index) => { const [label, badge] = statuses[application.status] || [application.status, 'badge-info']; return <tr key={application.application_id}><td>{index + 1}</td><td><strong>{application.title}</strong><div style={{ color: '#64748b', fontSize: 12 }}>{application.location_name || 'Linh hoạt'}</div></td><td>{application.department_name || '-'}</td><td>{new Date(application.applied_at).toLocaleDateString('vi-VN')}</td><td><span className={`badge ${badge}`}>{label}</span></td><td><Link to={`/jobs/${application.job_id}`} className="btn-action-view">Xem tin</Link></td></tr>; })}</tbody>
        </table>}
      </section>
    </div>
  );
};

export default CandidateApplications;