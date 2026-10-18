import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div className="header-left">
        {/* Toggle sidebar button can go here */}
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user?.full_name}</span>
          <span className="user-role">{user?.job_title || 'Nhân viên'}</span>
        </div>
        <Link to="/change-password" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
          Đổi mật khẩu
        </Link>
        <button className="logout-btn" onClick={handleLogout}>Đăng xuất</button>
      </div>
    </header>
  );
};

export default Header;
