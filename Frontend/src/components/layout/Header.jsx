import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { Link, useNavigate } from 'react-router-dom';
import '../../styles/global.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axiosClient.get('/notifications');
      if (response.data?.success) {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axiosClient.put(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosClient.put(`/notifications/all/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleAvatarClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    logout();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Chỉ hỗ trợ file JPG hoặc PNG.');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa 2MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/users/me/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const result = await response.json();
      if (response.ok) {
        // Refresh the page to load new avatar
        window.location.reload();
      } else {
        alert(result.message || 'Lỗi khi tải ảnh lên.');
      }
    } catch (error) {
      alert('Lỗi kết nối máy chủ.');
    }
  };

  return (
    <header className="main-header" style={{ padding: '0 40px' }}>
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        
        {/* Notification Bell */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ cursor: 'pointer', color: '#64748b', position: 'relative' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            {unreadCount > 0 && (
              <div style={{ 
                position: 'absolute', top: '-4px', right: '-8px', 
                background: '#ef4444', color: 'white', fontSize: '0.65rem', 
                fontWeight: 'bold', borderRadius: '10px', padding: '2px 6px', 
                border: '2px solid white' 
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
          
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '40px', right: '-10px', width: '320px',
              background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Thông báo</span>
                {unreadCount > 0 && (
                  <span onClick={markAllAsRead} style={{ fontSize: '0.8rem', color: '#4f46e5', cursor: 'pointer', fontWeight: '600' }}>
                    Đánh dấu đã đọc tất cả
                  </span>
                )}
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.notification_id} 
                      onClick={() => {
                        if (!notif.is_read) markAsRead(notif.notification_id);
                      }}
                      style={{ 
                        padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        background: notif.is_read ? 'white' : '#f0f9ff',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '0.9rem', fontWeight: notif.is_read ? '500' : '700', color: '#0f172a', marginBottom: '4px' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(notif.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }}></div>

        {/* User Profile Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }} ref={userMenuRef}>
          <div className="user-info" style={{ textAlign: 'right' }}>
            <div className="user-name" style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{user?.full_name}</div>
            <div className="user-role" style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '500' }}>{user?.job_title || 'Nhân sự'}</div>
          </div>
          
          {/* Avatar Component */}
          <div 
            onClick={handleAvatarClick}
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%', 
              background: user?.avatar_url ? 'none' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
              cursor: 'pointer', overflow: 'hidden'
            }}
            title="Nhấn để xem tùy chọn"
          >
            {user?.avatar_url ? (
              <img src={`http://localhost:3000${user.avatar_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
          
          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div style={{
              position: 'absolute', top: '50px', right: '0', width: '220px',
              background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden', padding: '8px 0'
            }}>
              <Link 
                to="/profile/edit" 
                onClick={() => setShowUserMenu(false)}
                style={{ display: 'block', padding: '12px 20px', color: '#334155', textDecoration: 'none', fontSize: '0.95rem', transition: 'background 0.2s' }}
                onMouseEnter={e => e.target.style.background = '#f8fafc'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                👤 Xem / Sửa hồ sơ
              </Link>
              <Link 
                to="/change-password" 
                onClick={() => setShowUserMenu(false)}
                style={{ display: 'block', padding: '12px 20px', color: '#334155', textDecoration: 'none', fontSize: '0.95rem', transition: 'background 0.2s' }}
                onMouseEnter={e => e.target.style.background = '#f8fafc'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                🔑 Đổi mật khẩu
              </Link>
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }}></div>
              <div 
                onClick={handleLogoutClick}
                style={{ display: 'block', padding: '12px 20px', color: '#ef4444', cursor: 'pointer', fontSize: '0.95rem', transition: 'background 0.2s' }}
                onMouseEnter={e => e.target.style.background = '#fef2f2'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                🚪 Đăng xuất
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/jpeg, image/png" 
            style={{ display: 'none' }} 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
