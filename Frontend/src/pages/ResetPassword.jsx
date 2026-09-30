import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
    if (!token || !newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'All fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.resetPassword(token, newPassword);
      if (response.data.success) {
        setStatus({ type: 'success', message: response.data.message });
        // Optional: redirect to login after a few seconds
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setStatus({ type: 'error', message: err.response.data.message });
      } else {
        setStatus({ type: 'error', message: 'Failed to reset password. Token may be invalid or expired.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-banner">
        <div className="auth-banner-content">
          <h1>Hệ Thống Tuyển Dụng Nội Bộ</h1>
          <p>Nền tảng quản lý nhân sự và tối ưu hóa quy trình tuyển dụng chuyên nghiệp dành riêng cho doanh nghiệp.</p>
        </div>
      </div>
      <div className="auth-form-wrapper">
        <div className="auth-card">
          <h2>Đặt lại mật khẩu</h2>
          
          {status.message && (
            <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {status.message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="token">Mã xác nhận (Token)</label>
              <input
                type="text"
                id="token"
                className="form-control"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                placeholder="Dán mã thông báo vào đây"
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Mật khẩu mới</label>
              <input
                type="password"
                id="newPassword"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                placeholder="Nhập mật khẩu mới"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
          
          <div className="auth-links">
            <Link to="/login">Trở lại trang đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
