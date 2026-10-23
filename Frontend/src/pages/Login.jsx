import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';
import axios from 'axios';
import { FiUsers, FiBriefcase, FiInfo, FiSearch, FiFileText, FiArrowRight, FiCheckCircle } from 'react-icons/fi';

const Login = () => {
  const [activeTab, setActiveTab] = useState('EMPLOYEE'); // 'EMPLOYEE' | 'CANDIDATE'
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
        const res = await axios.get(`${API_BASE_URL}/company-profile`);
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
        backgroundImage: companyProfile?.banner_url ? `url(${SERVER_BASE_URL}${companyProfile.banner_url})` : undefined,
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 50%, rgba(15, 23, 42, 0.3) 100%)', zIndex: 0 }}></div>
        <div className="auth-banner-content" style={{ textAlign: 'left', maxWidth: '600px', padding: '50px', transform: 'translateY(-10px)', position: 'relative', zIndex: 1, color: '#ffffff' }}>
          
          {companyProfile?.logo_url && (
            <div style={{ width: '80px', height: '80px', backgroundColor: 'white', borderRadius: '16px', padding: '8px', marginBottom: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              <img src={`${SERVER_BASE_URL}${companyProfile.logo_url}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ display: 'inline-block', padding: '8px 16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(79, 70, 229, 0.95))', borderRadius: '30px', fontSize: '0.75rem', marginBottom: '20px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#ffffff', boxShadow: '0 4px 15px rgba(79, 70, 229, 0.5)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {companyProfile?.name || 'Hệ sinh thái số TechCorp'}
          </div>
          
          <h1 className="g-page-title" style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.25, margin: '0 0 16px', letterSpacing: '-0.5px', textShadow: '0 4px 16px rgba(0,0,0,0.6)' }}>
            Hệ thống Tuyển dụng Nội bộ
          </h1>
          
          <p className="g-page-subtitle" style={{ color: '#f1f5f9', fontSize: '1.05rem', lineHeight: 1.65, margin: '0 0 20px', textShadow: '0 2px 6px rgba(0,0,0,0.4)', opacity: 0.95 }}>
            {companyProfile?.description || 'Chào mừng bạn đến với Hệ thống Quản trị Nhân sự thế hệ mới. Nơi kết nối các thành viên, tối ưu hóa quy trình tuyển dụng và kiến tạo môi trường làm việc thông minh.'}
          </p>

          {(() => {
            const raw = companyProfile?.website?.trim();
            const targetUrl = !raw || raw.includes('techcorp.vn') || raw.includes('techcorp.com')
              ? '/jobs'
              : (raw.startsWith('/') || raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);

            return (
              <a 
                href={targetUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: '#93c5fd', 
                  textDecoration: 'none', 
                  fontWeight: '700', 
                  marginBottom: '24px', 
                  fontSize: '0.95rem', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
                onMouseOut={(e) => e.currentTarget.style.color = '#93c5fd'}
              >
                🌐 Truy cập Website Công ty / Tuyển dụng
              </a>
            );
          })()}
          <div style={{ display: 'flex', gap: '40px', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#60a5fa', marginBottom: '4px', textShadow: '0 2px 10px rgba(96, 165, 250, 0.4)' }}>99%</div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#e2e8f0', fontWeight: '700' }}>Tự động hóa</div>
            </div>
            <div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', marginBottom: '4px', textShadow: '0 2px 10px rgba(52, 211, 153, 0.4)' }}>24/7</div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#e2e8f0', fontWeight: '700' }}>Vận hành liên tục</div>
            </div>
          </div>

          <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', letterSpacing: '1.5px', color: '#67e8f9', textTransform: 'uppercase', fontWeight: '800', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Hệ Thống Văn Phòng</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem', color: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong style={{ color: '#ffffff' }}>Hà Nội:</strong> Tầng 12, Tòa nhà Enterprise Center, Cầu Giấy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong style={{ color: '#ffffff' }}>TP. HCM:</strong> Tầng 8, Tòa nhà Innovation Hub, Quận 1</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#60a5fa' }}>📍</span>
                <span><strong style={{ color: '#ffffff' }}>Đà Nẵng:</strong> Tầng 5, Tòa nhà HighTech, Hải Châu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-wrapper" style={{ background: '#f8fafc', position: 'relative' }}>
        {/* Subtle decorative elements for the right side */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: '#f8fafc', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '400px', height: '400px', background: '#f8fafc', borderRadius: '50%' }}></div>

        <div className="auth-card" style={{ maxWidth: '600px', width: '100%', background: '#ffffff', borderRadius: '24px', padding: '40px 48px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05), 0 0 0 1px rgba(226,232,240,0.5)', position: 'relative', zIndex: 10 }}>
          {/* SEGMENTED TAB SWITCHER */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '28px',
            gap: '4px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('EMPLOYEE'); setError(''); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'EMPLOYEE' ? '#ffffff' : 'transparent',
                color: activeTab === 'EMPLOYEE' ? '#4f46e5' : '#64748b',
                boxShadow: activeTab === 'EMPLOYEE' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <FiUsers size={17} />
              Cán bộ nhân viên
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('CANDIDATE'); setError(''); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'CANDIDATE' ? '#ffffff' : 'transparent',
                color: activeTab === 'CANDIDATE' ? '#4f46e5' : '#64748b',
                boxShadow: activeTab === 'CANDIDATE' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <FiBriefcase size={17} />
              Ứng viên tuyển dụng
            </button>
          </div>

          {activeTab === 'EMPLOYEE' ? (
            <>
              <div className="auth-logo" style={{ marginBottom: '24px' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#4f46e5', borderRadius: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px', textAlign: 'center' }}>Đăng nhập nội bộ</h2>
              <p className="auth-subtitle" style={{ fontSize: '0.92rem', color: '#64748b', marginBottom: '28px', textAlign: 'center' }}>Dành cho cán bộ quản lý, nhân viên và người phỏng vấn TechCorp</p>
              
              {error && <div className="alert alert-error">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '18px' }}>
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
                      style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', width: '100%', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; e.target.style.backgroundColor = '#ffffff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '24px' }}>
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
                      style={{ padding: '13px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.95rem', width: '100%', transition: 'all 0.2s', outline: 'none' }}
                      onFocus={(e) => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)'; e.target.style.backgroundColor = '#ffffff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#f8fafc'; }}
                    />
                  </div>
                </div>
                
                <button type="submit" disabled={loading || countdown > 0} style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '700', letterSpacing: '0.5px', cursor: (loading || countdown > 0) ? 'not-allowed' : 'pointer', opacity: (loading || countdown > 0) ? 0.7 : 1, boxShadow: '0 8px 20px rgba(67, 56, 202, 0.25)', transition: 'all 0.3s ease', marginBottom: '20px' }} onMouseOver={(e) => { if (!loading && countdown === 0) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 12px 25px rgba(67, 56, 202, 0.35)'; } }} onMouseOut={(e) => { if (!loading && countdown === 0) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 20px rgba(67, 56, 202, 0.25)'; } }}>
                  {countdown > 0 
                    ? `Vui lòng đợi ${countdown}s...` 
                    : loading ? 'Đang xác thực...' : 'ĐĂNG NHẬP NGAY'}
                </button>

                {/* QUICK LOGIN CHO MỤC ĐÍCH TEST */}
                <div style={{ marginTop: '6px', padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <p className="g-page-subtitle" style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>⚡ ĐĂNG NHẬP NHANH (TEST TÀI KHOẢN NỘI BỘ)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200413@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#ef4444'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(239, 68, 68, 0.1)'; e.target.style.color = '#ef4444'; }}
                    >
                      Quản trị viên
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200002@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#4f46e5'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(79, 70, 229, 0.1)'; e.target.style.color = '#4f46e5'; }}
                    >
                      Trưởng phòng NS
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200480@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#f59e0b'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(245, 158, 11, 0.1)'; e.target.style.color = '#f59e0b'; }}
                    >
                      Trưởng bộ phận
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200852@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#10b981'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(16, 185, 129, 0.1)'; e.target.style.color = '#10b981'; }}
                    >
                      NV Tuyển dụng
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200571@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#8b5cf6'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.1)'; e.target.style.color = '#8b5cf6'; }}
                    >
                      Người phỏng vấn
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setEmail('dtc245200592@ictu.edu.vn'); setPassword('123456'); }}
                      style={{ padding: '8px', fontSize: '0.82rem', fontWeight: '600', background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', border: '1px solid rgba(100, 116, 139, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.target.style.background = '#64748b'; e.target.style.color = 'white'; }}
                      onMouseOut={(e) => { e.target.style.background = 'rgba(100, 116, 139, 0.1)'; e.target.style.color = '#64748b'; }}
                    >
                      Người phê duyệt
                    </button>
                  </div>
                </div>
              </form>
              
              <div className="auth-links" style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ color: '#4f46e5', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}>Quên mật khẩu?</Link>
              </div>
            </>
          ) : (
            /* CANDIDATE WELCOME PORTAL */
            <div>
              <div className="auth-logo" style={{ marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#4f46e5', borderRadius: '16px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)' }}>
                  <FiBriefcase size={26} color="#ffffff" />
                </div>
              </div>

              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.5px', textAlign: 'center' }}>
                Cổng Thông Tin Ứng Viên
              </h2>
              <p className="auth-subtitle" style={{ fontSize: '0.92rem', color: '#64748b', marginBottom: '24px', textAlign: 'center' }}>
                Khám phá cơ hội nghề nghiệp và nộp hồ sơ ứng tuyển trực tuyến tại TechCorp
              </p>

              {/* NOTICE BANNER */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                color: '#3730a3',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                marginBottom: '22px'
              }}>
                <FiInfo size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#4f46e5' }} />
                <div>
                  <strong style={{ display: 'block', color: '#1e1b4b', marginBottom: '2px', fontSize: '0.92rem' }}>
                    Ứng viên không cần tài khoản nội bộ!
                  </strong>
                  <span style={{ color: '#4338ca', fontSize: '0.85rem' }}>
                    Bạn chỉ cần chọn công việc phù hợp, điền thông tin liên hệ (Gmail, SĐT) và tải CV lên để nộp hồ sơ trực tiếp chỉ trong 1 phút.
                  </span>
                </div>
              </div>

              {/* ACTION BUTTON 1: BROWSE JOBS */}
              <Link
                to="/jobs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  boxShadow: '0 8px 20px rgba(67, 56, 202, 0.25)',
                  transition: 'all 0.25s ease',
                  marginBottom: '14px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 25px rgba(67, 56, 202, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(67, 56, 202, 0.25)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FiSearch size={22} color="#ffffff" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.2px' }}>Khám phá việc làm đang tuyển</div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '2px' }}>Xem danh sách vị trí, yêu cầu & nộp CV trực tiếp</div>
                  </div>
                </div>
                <FiArrowRight size={20} />
              </Link>

              {/* ACTION BUTTON 2: TRACK APPLICATION */}
              <Link
                to="/jobs/track"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px 20px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  marginBottom: '22px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#4f46e5';
                  e.currentTarget.style.background = '#eef2ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <FiFileText size={20} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Tra cứu trạng thái hồ sơ</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>Kiểm tra kết quả duyệt CV, lịch phỏng vấn qua mã hồ sơ</div>
                  </div>
                </div>
                <FiArrowRight size={18} color="#64748b" />
              </Link>

              {/* BENEFIT HIGHLIGHTS */}
              <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quy trình tuyển dụng thông minh:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCheckCircle color="#4f46e5" size={16} style={{ flexShrink: 0 }} /> <span>Không cần tạo tài khoản hay ghi nhớ mật khẩu.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCheckCircle color="#4f46e5" size={16} style={{ flexShrink: 0 }} /> <span>Hỗ trợ tải CV định dạng PDF / DOCX dung lượng tối đa 10MB.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiCheckCircle color="#4f46e5" size={16} style={{ flexShrink: 0 }} /> <span>Nhận thông báo cập nhật kết quả tuyển dụng qua Email cá nhân.</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.88rem', color: '#64748b' }}>
                Bạn là nhân sự của công ty?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('EMPLOYEE')}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Đăng nhập nội bộ tại đây
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
