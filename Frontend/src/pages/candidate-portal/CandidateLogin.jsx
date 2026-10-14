import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CandidateAuthContext } from '../../context/CandidateAuthContext';
import CandidatePublicHeader from '../../components/CandidatePublicHeader';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';

const CandidateLogin = () => {
  const { login } = useContext(CandidateAuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:3000/api/candidate-portal/login', { email, password });
      login(response.data.data.token, response.data.data.candidate);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo?.startsWith('/candidate') ? returnTo : '/candidate', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <CandidatePublicHeader />
      <section style={{ display: 'grid', placeItems: 'center', minHeight: 'calc(100vh - 58px)', padding: 20 }}>
        <div style={{ width: 'min(460px, 100%)', padding: '32px clamp(22px, 5vw, 44px)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 36px rgba(15,23,42,.06)' }}>
          <div style={{ textAlign: 'center', marginBottom: 25 }}>
            <h1 style={{ margin: 0, color: '#111827', fontSize: 26 }}>Đăng nhập ứng viên</h1>
            <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 14 }}>Đăng nhập để ứng tuyển và theo dõi hồ sơ của bạn</p>
          </div>
          {error && <div role="alert" style={{ marginBottom: 14, padding: 10, color: '#991b1b', background: '#fef2f2', borderRadius: 6, fontSize: 13 }}>{error}</div>}
          <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>Email
              <span style={{ position: 'relative' }}><FiMail style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} /><input required type="email" autoComplete="email" className="g-form-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="Nhập email của bạn" style={{ paddingLeft: 36 }} /></span>
            </label>
            <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>Mật khẩu
              <span style={{ position: 'relative' }}><FiLock style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} /><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="g-form-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" style={{ padding: '8px 38px' }} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(value => !value)} style={{ position: 'absolute', right: 8, top: 6, display: 'grid', placeItems: 'center', width: 30, height: 30, border: 0, color: '#64748b', background: 'transparent', cursor: 'pointer' }}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Link to="/candidate/forgot-password" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>Quên mật khẩu?</Link></div>
            <button className="g-btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: 11, borderRadius: 6 }}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          </form>
          <div style={{ marginTop: 20, paddingTop: 17, borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#475569', fontSize: 13 }}>Chưa có tài khoản? <Link to="/candidate/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Đăng ký ứng viên</Link></div>
        </div>
      </section>
    </main>
  );
};

export default CandidateLogin;