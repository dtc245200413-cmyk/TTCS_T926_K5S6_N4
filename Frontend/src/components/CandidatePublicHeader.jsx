import React from 'react';
import { Link } from 'react-router-dom';

const CandidatePublicHeader = ({ candidate = null }) => (
  <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, minHeight: 58, padding: '0 clamp(16px, 4vw, 48px)', color: '#fff', background: '#111827' }}>
    <Link to="/jobs" style={{ color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 17, whiteSpace: 'nowrap' }}>TechCorp Careers</Link>
    <nav style={{ display: 'flex', alignItems: 'center', gap: 18, color: '#e2e8f0', fontSize: 13 }}>
      <Link to="/jobs" style={{ color: 'inherit', textDecoration: 'none' }}>Việc làm</Link>
      <a href="/jobs#about" style={{ color: 'inherit', textDecoration: 'none' }}>Giới thiệu</a>
      <a href="mailto:careers@techcorp.vn" style={{ color: 'inherit', textDecoration: 'none' }}>Liên hệ</a>
    </nav>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
      {candidate ? <Link to="/candidate" style={{ color: '#fff', textDecoration: 'none', fontSize: 13 }}>{candidate.full_name}</Link> : <Link to="/candidate/login" style={{ color: '#e2e8f0', textDecoration: 'none', fontSize: 13 }}>Đăng nhập</Link>}
      {!candidate && <Link to="/candidate/register" className="g-btn-primary" style={{ padding: '7px 12px', borderRadius: 6 }}>Đăng ký</Link>}
    </div>
  </header>
);

export default CandidatePublicHeader;