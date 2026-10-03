import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authApi from '../api/authApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '', devToken: null });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '', devToken: null });
    
    if (!email) {
      setStatus({ type: 'error', message: 'Please enter your company email.' });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword(email);
      if (response.data.success) {
        setStatus({
          type: 'success',
          message: response.data.message,
          devToken: response.data.data?.devToken || null
        });
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setStatus({ type: 'error', message: err.response.data.message });
      } else {
        setStatus({ type: 'error', message: 'Failed to request password reset.' });
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
          <h2>Quên mật khẩu</h2>
          <p className="auth-subtitle">Vui lòng nhập email để nhận liên kết đặt lại mật khẩu</p>
          
          {status.message && (
            <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>
              {status.message}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email công ty</label>
              <input
                type="email"
                id="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="Nhập email của bạn..."
              />
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
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

export default ForgotPassword;
