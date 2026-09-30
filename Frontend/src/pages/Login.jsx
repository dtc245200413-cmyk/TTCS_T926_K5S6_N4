import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to home
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-banner">
        <div className="auth-banner-content" style={{ textAlign: 'left', maxWidth: '550px' }}>
          <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '0.85rem', marginBottom: '20px', fontWeight: '600', letterSpacing: '1px' }}>
            CỔNG THÔNG TIN NỘI BỘ
          </div>
          
          <h1 style={{ fontSize: '2.8rem', marginBottom: '20px', fontWeight: '800', lineHeight: '1.2' }}>Tập đoàn TechCorp</h1>
          
          <p style={{ fontSize: '1.15rem', opacity: '0.9', marginBottom: '40px', lineHeight: '1.7' }}>
            Chào mừng bạn đến với Hệ thống Quản trị Nhân sự nội bộ. 
            Nơi kết nối các thành viên, xây dựng văn hóa doanh nghiệp vững mạnh và kiến tạo môi trường làm việc số chuyên nghiệp, sáng tạo.
          </p>
          
          <div className="auth-features" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div className="auth-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '12px', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>🎯</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0', fontWeight: '700' }}>Tầm nhìn chiến lược</h3>
                <p style={{ margin: 0, opacity: '0.85', fontSize: '0.95rem', lineHeight: '1.6' }}>Trở thành tập đoàn công nghệ hàng đầu, mang lại giá trị đột phá thông qua các giải pháp số hóa và tự động hóa.</p>
              </div>
            </div>
            
            <div className="auth-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '12px', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>💡</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0', fontWeight: '700' }}>Giá trị cốt lõi</h3>
                <p style={{ margin: 0, opacity: '0.85', fontSize: '0.95rem', lineHeight: '1.6' }}>Sáng tạo không ngừng, hợp tác cùng phát triển và luôn đặt con người làm trung tâm của mọi hoạt động.</p>
              </div>
            </div>
            
            <div className="auth-feature-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px', borderRadius: '12px', fontSize: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>👥</div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 8px 0', fontWeight: '700' }}>Văn hóa doanh nghiệp</h3>
                <p style={{ margin: 0, opacity: '0.85', fontSize: '0.95rem', lineHeight: '1.6' }}>Môi trường làm việc mở, tôn trọng sự khác biệt và luôn tạo điều kiện tốt nhất để nhân tài phát triển.</p>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', gap: '40px', opacity: '0.9' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800' }}>2010</div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.8' }}>Năm thành lập</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800' }}>500+</div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.8' }}>Nhân sự</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800' }}>3</div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: '0.8' }}>Chi nhánh</div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-wrapper">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="url(#paint0_linear)" />
              <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" fill="white" />
              <defs>
                <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#1E3A8A" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2>Đăng nhập tài khoản</h2>
          <p className="auth-subtitle">Vui lòng nhập thông tin để tiếp tục</p>
          
          {error && <div className="alert alert-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email công ty</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="ví dụ: employee@company.com"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Mật khẩu</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Nhập mật khẩu của bạn..."
                />
              </div>
            </div>
            
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            </button>
          </form>
          
          <div className="auth-links">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '15px', fontWeight: '600' }}>Đăng nhập nhanh (Demo)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => { setEmail('nhung.nguyen@company.com'); setPassword('123456'); }}
                style={{ textAlign: 'left', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Quản trị viên (Admin) - Nhung</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>nhung.nguyen@company.com</span>
                </div>
              </button>
              
              <button 
                type="button" 
                onClick={() => { setEmail('minh.ha@company.com'); setPassword('123456'); }}
                style={{ textAlign: 'left', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Quản lý Nhân sự (HR) - Minh</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>minh.ha@company.com</span>
                </div>
              </button>

              <button 
                type="button" 
                onClick={() => { setEmail('son.nguyen@company.com'); setPassword('123456'); }}
                style={{ textAlign: 'left', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Nhân viên Tuyển dụng - Sơn</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>son.nguyen@company.com</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
