import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const Sidebar = () => {
  const { hasPermission, logout, user } = useContext(AuthContext);
  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 style={{ fontSize: '1.25rem', color: '#60a5fa', marginBottom: '4px' }}>Tuyển Dụng Nội Bộ</h2>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>Hệ Thống Quản Trị</p>
      </div>
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          end
        >
          <span style={{ marginRight: '10px' }}>📊</span> Tổng Quan
        </NavLink>
        
        {hasPermission('USER_VIEW') && (
          <NavLink 
            to="/users" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span style={{ marginRight: '10px' }}>👥</span> Quản Lý Nhân Sự
          </NavLink>
        )}
        
        {isAdmin && (
          <NavLink 
            to="/reports" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span style={{ marginRight: '10px' }}>📈</span> Báo Cáo Thống Kê
          </NavLink>
        )}
        
        <NavLink 
          to="/change-password" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <span style={{ marginRight: '10px' }}>🔑</span> Đổi Mật Khẩu
        </NavLink>
        
        <div 
          className="nav-link" 
          style={{ cursor: 'pointer' }}
          onClick={handleLogout}
        >
          <span style={{ marginRight: '10px' }}>🚪</span> Đăng Xuất
        </div>
      </nav>
      
      <div className="sidebar-footer" style={{ padding: '20px', marginTop: 'auto', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #374151' }}>
        &copy; 2026 Nội Bộ
      </div>
    </aside>
  );
};

export default Sidebar;
