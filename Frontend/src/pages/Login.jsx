import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [companyProfile, setCompanyProfile] = useState(null);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    // If already logged in, redirect to home
    if (user) {
      navigate('/');
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/company-profile');
        if (res.data.success) {
          setCompanyProfile(res.data.data);
        }
      } catch (err) {
        console.error('Could not load company profile', err);
      }
    };
    fetchCompanyProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      // Thêm một chút thời gian chờ (delay) để giao diện hiển thị trạng thái "Đang xác thực..." mượt hơn
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const response = await authApi.login(email, password);
      if (response.data.success) {
        login(response.data.data.token, response.data.data.user);
        navigate('/');
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setCountdown(30);
        setError('Bạn đã nhập sai 5 lần. Vui lòng đợi 30 giây.');
      } else if (err.response && err.response.data && err.response.data.message) {
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
      <div className="auth-banner" style={{ 
        backgroundImage: companyProfile?.banner_url ? `url(http://localhost:3000${companyProfile.banner_url})` : undefined, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 50%, rgba(15, 23, 42, 0.3) 100%)', zIndex: 0 }}></div>
        <div className="auth-banner-content" style={{ textAlign: 'left', maxWidth: '600px', padding: '50px', transform: 'translateY(-10px)', position: 'relative', zIndex: 1 }}>
          
          {companyProfile?.logo_url && (
            <div style={{ width: '80px', height: '80px', backgroundColor: 'white', borderRadius: '16px', padding: '8px', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              <img src={`http://localhost:3000${companyProfile.logo_url}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ display: 'inline-block', padding: '8px 16px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.9), rgba(67, 56, 202, 0.9))', borderRadius: '30px', fontSize: '0.75rem', marginBottom: '20px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)' }}>
            {companyProfile?.name || 'Hệ sinh thái số TechCorp'}
          </div>
          
          <h1 style={{ fontSize: '2.8rem', marginBottom: '20px', fontWeight: '800', lineHeight: '1.15', letterSpacing: '-1px', textShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>Hệ thống Tuyển dụng Nội bộ</h1>
          
          <p style={{ fontSize: '1.05rem', opacity: '0.95', marginBottom: '20px', lineHeight: '1.7', color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>
            {companyProfile?.description || 'Chào mừng bạn đến với Hệ thống Quản trị Nhân sự thế hệ mới. Nơi kết nối các thành viên, tối ưu hóa quy trình tuyển dụng và kiến tạo môi trường làm việc thông minh.'}
          </p>

          {companyProfile?.website && (
            <a href={companyProfile.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#60a5fa', textDecoration: 'none', fontWeight: '700', marginBottom: '30px', fontSize: '0.95rem' }}>
              🌐 Truy cập Website Công ty
            </a>
          )}
          <div style={{ display: 'flex', gap: '40px', marginTop: '20px', paddingTop: '25px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#60a5fa', marginBottom: '4px', textShadow: '0 2px 10px rgba(96, 165, 250, 0.3)' }}>99%</div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: '700' }}>Tự động hóa</div>
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', marginBottom: '4px', textShadow: '0 2px 10px rgba(52, 211, 153, 0.3)' }}>24/7</div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: '700' }}>Vận hành liên tục</div>
            </div>
          </div>

          <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Hệ Thống Văn Phòng</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong>Hà Nội:</strong> Tầng 12, Tòa nhà Enterprise Center, Cầu Giấy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong>TP. HCM:</strong> Tầng 8, Tòa nhà Innovation Hub, Quận 1</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong>Đà Nẵng:</strong> Tầng 5, Tòa nhà HighTech, Hải Châu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-wrapper" style={{ background: '#f8fafc', position: 'relative' }}>
        {/* Subtle decorative elements for the right side */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(79, 70, 229, 0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.03) 0%, transparent 70%)', borderRadius: '50%' }}></div>

        <div className="auth-card" style={{ background: '#ffffff', borderRadius: '24px', padding: '48px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05), 0 0 0 1px rgba(226,232,240,0.5)', position: 'relative', zIndex: 10 }}>
          <div className="auth-logo" style={{ marginBottom: '32px' }}>
            <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', borderRadius: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px', textAlign: 'center' }}>Đăng nhập tài khoản</h2>
          <p className="auth-subtitle" style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: '32px', textAlign: 'center' }}>Vui lòng nhập thông tin để truy cập hệ thống</p>
          
          {error && <div className="alert alert-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="email" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Email công ty</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="ví dụ: employee@techcorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', width: '100%', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; e.target.style.backgroundColor = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label htmlFor="password" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Mật khẩu</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu của bạn..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', width: '100%', transition: 'all 0.2s', outline: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; e.target.style.backgroundColor = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                />
              </div>
            </div>
            
            <button type="submit" disabled={loading || countdown > 0} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', cursor: (loading || countdown > 0) ? 'not-allowed' : 'pointer', opacity: (loading || countdown > 0) ? 0.7 : 1, boxShadow: '0 8px 20px rgba(67, 56, 202, 0.25)', transition: 'all 0.3s ease', marginBottom: '24px' }} onMouseOver={(e) => { if (!loading && countdown === 0) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 25px rgba(67, 56, 202, 0.35)'; } }} onMouseOut={(e) => { if (!loading && countdown === 0) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 20px rgba(67, 56, 202, 0.25)'; } }}>
              {countdown > 0 
                ? `Vui lòng đợi ${countdown}s...` 
                : loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP NGAY'}
            </button>

            {/* QUICK LOGIN CHO MỤC ĐÍCH TEST */}
            <div style={{ marginTop: '10px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>⚡ ĐĂNG NHẬP NHANH (TEST)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200413@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = '#ef4444'; }}
                >
                  Quản trị viên
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200002@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#4f46e5'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(79, 70, 229, 0.1)'; e.target.style.color = '#4f46e5'; }}
                >
                  Trưởng phòng NS
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200480@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#f59e0b'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(245, 158, 11, 0.1)'; e.target.style.color = '#f59e0b'; }}
                >
                  Trưởng bộ phận
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200852@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#10b981'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.1)'; e.target.style.color = '#10b981'; }}
                >
                  NV Tuyển dụng
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200571@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#8b5cf6'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.1)'; e.target.style.color = '#8b5cf6'; }}
                >
                  Người phỏng vấn
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEmail('dtc245200592@ictu.edu.vn'); setPassword('123456'); }}
                  style={{ padding: '8px', fontSize: '0.85rem', fontWeight: '600', background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.target.style.background = '#64748b'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = 'rgba(100, 116, 139, 0.1)'; e.target.style.color = '#64748b'; }}
                >
                  Người phê duyệt
                </button>
              </div>
            </div>
          </form>
          
          <div className="auth-links">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
