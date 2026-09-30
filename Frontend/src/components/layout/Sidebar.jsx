import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const Sidebar = () => {
  const { hasPermission } = useContext(AuthContext);

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
      </nav>
      
      <div className="sidebar-footer" style={{ padding: '20px', marginTop: 'auto', fontSize: '0.8rem', color: '#6b7280', borderTop: '1px solid #374151' }}>
        &copy; 2026 Nội Bộ
      </div>
    </aside>
  );
};

export default Sidebar;
