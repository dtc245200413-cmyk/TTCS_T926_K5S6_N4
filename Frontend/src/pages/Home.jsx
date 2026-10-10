import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiBell } from 'react-icons/fi';

const ProfileField = ({ label, value }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>
      {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật</span>}
    </div>
  </div>
);

const UtilityCard = ({ icon, title, description, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      border: '1px solid #e2e8f0', 
      borderRadius: '0', 
      padding: '20px', 
      cursor: 'pointer',
      background: '#fff',
      transition: 'all 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#cbd5e1';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
    }}
  >
    <div style={{ color: '#64748b', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.05rem', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{description}</div>
  </div>
);

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const getPrimaryRole = () => {
    if (!user?.roles || user.roles.length === 0) return 'Nhân viên';
    return user.roles[0].role_name || user.roles[0].role_code;
  };

  const getDepartment = () => {
    return user?.department?.department_name || 'Chưa cập nhật phòng ban';
  };

  const roleName = user?.job_title || getPrimaryRole();

  return (
    <div className="g-page-container">
      
      {/* Main Card */}
      <div className="g-card">
        <div style={{ marginBottom: '32px' }}>
          <h1 className="g-page-title">
            Tổng quan
          </h1>
          <p className="g-page-subtitle">
            Thông tin cá nhân và công việc của bạn
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem', flexShrink: 0
          }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:3000${user.avatar_url}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <FiUser />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 6px 0', color: '#0f172a', fontWeight: '700' }}>
              Xin chào, {user?.full_name}! 👋
            </h2>
            <div style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '8px' }}>
              {roleName} - {getDepartment()}
            </div>
            <div>
              <span style={{ 
                background: user?.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', 
                color: user?.status === 'ACTIVE' ? '#16a34a' : '#ef4444', 
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' 
              }}>
                {user?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', margin: '0 -32px 32px -32px' }}></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <ProfileField label="Mã nhân viên" value={user?.employee_code} />
          <ProfileField label="Họ và tên" value={user?.full_name} />
          <ProfileField label="Chức danh" value={roleName} />
          <ProfileField label="Phòng ban" value={getDepartment()} />
          <ProfileField label="Email" value={user?.company_email} />
          <ProfileField label="Điện thoại" value={user?.phone_number} />
        </div>
      </div>

      {/* Utilities Section */}
      <div>
        <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: '700', margin: '0 0 16px 0' }}>
          Thông báo & tiện ích
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <UtilityCard 
            icon={<FiBell size={24} />}
            title="Thông báo"
            description="Xem thông báo mới và đánh dấu đã đọc"
            onClick={() => navigate('/notifications')}
          />
          <UtilityCard 
            icon={<FiUser size={24} />}
            title="Hồ sơ cá nhân"
            description="Cập nhật thông tin và ảnh đại diện"
            onClick={() => navigate('/profile/edit')}
          />
        </div>
      </div>

    </div>
  );
};

export default Home;
