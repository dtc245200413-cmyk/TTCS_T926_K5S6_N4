import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import AvatarUpload from '../components/AvatarUpload';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.changePassword(currentPassword, newPassword);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'Password changed successfully. Please log in again.' });
        // Optional: wait a moment and then logout to force re-login
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setStatus({ type: 'error', message: err.response.data.message });
      } else {
        setStatus({ type: 'error', message: 'Failed to change password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="g-page-header">
        <h1 className="g-page-title">Thiết lập Bảo mật</h1>
        <p className="g-page-subtitle">Quản lý mật khẩu và bảo vệ tài khoản của bạn</p>
      </div>
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left Column - Form */}
        <div style={{ flex: '1 1 500px', background: '#ffffff', borderRadius: '24px', padding: '40px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: 'linear-gradient(90deg, #4f46e5, #0ea5e9)' }}></div>
          
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '24px', color: '#1e293b' }}>Đổi mật khẩu</h2>
          <AvatarUpload />
          
          {status.message && (
            <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>{status.type === 'error' ? '⚠️' : '✅'}</span>
              {status.message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="currentPassword" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Mật khẩu hiện tại</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.2rem' }}>🔒</span>
                <input
                  type="password"
                  id="currentPassword"
                  className="form-control"
                  placeholder="Nhập mật khẩu cũ của bạn"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '48px', height: '52px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '1rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="newPassword" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Mật khẩu mới</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#4f46e5', fontSize: '1.2rem' }}>🔑</span>
                <input
                  type="password"
                  id="newPassword"
                  className="form-control"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '48px', height: '52px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '1rem', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label htmlFor="confirmPassword" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Xác nhận mật khẩu mới</label>
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '1.2rem' }}>🛡️</span>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-control"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '48px', height: '52px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '1rem', width: '100%' }}
                />
              </div>
            </div>
            
            <button type="submit" className="g-btn-primary" disabled={loading} >
              {loading ? <span className="loader" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span> : '💾 Cập nhật Mật khẩu'}
            </button>
          </form>
        </div>

        {/* Right Column - Security Tips */}
        <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#0f172a', borderRadius: '24px', padding: '30px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 15px 30px rgba(15, 23, 42, 0.2)' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05, transform: 'rotate(-15deg)' }}>🛡️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px', display: 'flex' }}>💡</span> Lời khuyên Bảo mật
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                <p className="g-page-subtitle">Sử dụng mật khẩu dài ít nhất <strong>8 ký tự</strong>.</p>
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                <p className="g-page-subtitle">Kết hợp <strong>chữ hoa, chữ thường, số</strong> và ký tự đặc biệt (@, #, $).</p>
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                <p className="g-page-subtitle">Không sử dụng thông tin cá nhân dễ đoán như ngày sinh, số điện thoại.</p>
              </li>
              <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#10b981', fontSize: '1.2rem' }}>✓</span>
                <p className="g-page-subtitle">Tránh dùng lại mật khẩu đã sử dụng cho các tài khoản khác.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
