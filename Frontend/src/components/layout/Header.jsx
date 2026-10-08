import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const Header = () => {
  const { user } = useContext(AuthContext);

  const fileInputRef = React.useRef(null);
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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
        <div style={{ position: 'relative', cursor: 'pointer', color: '#64748b' }}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span>
          <div style={{ position: 'absolute', top: '-2px', right: '-4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>
        </div>

        <div style={{ width: '1px', height: '30px', background: '#e2e8f0' }}></div>

        {/* User Profile Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
            title="Nhấn để đổi ảnh đại diện"
          >
            {user?.avatar_url ? (
              <img src={`http://localhost:3000${user.avatar_url}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'
            )}
          </div>
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
