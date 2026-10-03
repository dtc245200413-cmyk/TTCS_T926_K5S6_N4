import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const Header = () => {
  const { user } = useContext(AuthContext);

  return (
    <header className="main-header" style={{ padding: '0 40px' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative', cursor: 'pointer', color: '#64748b' }}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          <div style={{ position: 'absolute', top: '-2px', right: '-4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>
        </div>

        <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }}></div>

        {/* User Profile Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
          <div className="user-info" style={{ textAlign: 'right' }}>
            <div className="user-name" style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div className="user-role" style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>{user?.job_title || 'Nhân sự'}</div>
          </div>
          
          {/* Avatar Component */}
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)' }}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
