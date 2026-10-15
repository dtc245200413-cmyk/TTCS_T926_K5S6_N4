import React, { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CandidateAuthContext } from '../context/CandidateAuthContext';
import { FiBell, FiBriefcase, FiCalendar, FiFileText, FiHome, FiLogOut, FiMail, FiUser } from 'react-icons/fi';

const CandidatePortalLayout = () => {
  const { candidate, logout } = useContext(CandidateAuthContext);
  const navigate = useNavigate();
  const navStyle = ({ isActive }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 10px',
    borderRadius: 6,
    color: isActive ? '#1d4ed8' : '#475569',
    background: isActive ? '#eff6ff' : 'transparent',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: isActive ? 700 : 500,
    whiteSpace: 'nowrap'
  });

  const handleLogout = () => {
    logout();
    navigate('/jobs');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#172033' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '0 clamp(16px, 4vw, 48px)', minHeight: 60, background: '#111827', color: '#fff' }}>
        <NavLink to="/candidate" style={{ color: '#fff', fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>TechCorp <span style={{ color: '#93c5fd', fontWeight: 500 }}>Careers</span></NavLink>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
          <NavLink to="/jobs" style={({ isActive }) => ({ ...navStyle({ isActive: false }), color: '#d1d5db' })}><FiBriefcase /> Việc làm</NavLink>
          <NavLink to="/candidate" style={navStyle} end><FiHome /> Tổng quan</NavLink>
          <NavLink to="/candidate/applications" style={navStyle}><FiFileText /> Hồ sơ đã ứng tuyển</NavLink>
          <NavLink to="/candidate/interviews" style={navStyle}><FiCalendar /> Lịch phỏng vấn</NavLink>
          <NavLink to="/candidate/offers" style={navStyle}><FiMail /> Thư mời</NavLink>
          <NavLink to="/candidate/notifications" style={navStyle}><FiBell /> Thông báo</NavLink>
          <NavLink to="/candidate/account" style={navStyle}><FiUser /> Tài khoản</NavLink>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>{candidate?.full_name}</span>
          <button type="button" onClick={handleLogout} aria-label="Đăng xuất ứng viên" title="Đăng xuất" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, border: '1px solid #475569', borderRadius: 6, color: '#fff', background: 'transparent', cursor: 'pointer' }}><FiLogOut /></button>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 1180, margin: '0 auto', padding: '24px clamp(16px, 3vw, 32px)' }}><Outlet /></main>
    </div>
  );
};

export default CandidatePortalLayout;