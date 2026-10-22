import { API_BASE_URL } from '../../config/api';
import React, { useContext, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { CandidateAuthContext } from '../../context/CandidateAuthContext';
import CandidatePublicHeader from '../../components/CandidatePublicHeader';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const CandidateRegister = () => {
  const { login } = useContext(CandidateAuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirm_password) return setError('Mật khẩu xác nhận chưa khớp.');
    if (form.password.length < 8) return setError('Mật khẩu cần có ít nhất 8 ký tự.');
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/candidate-portal/register`, form);
      login(response.data.data.token, response.data.data.candidate);
      navigate('/candidate', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', placeholder = '') => (
    <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>{label}
      <input required type={type} autoComplete={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'name'} className="g-form-input" value={form[name]} onChange={event => setForm(current => ({ ...current, [name]: event.target.value }))} placeholder={placeholder} />
    </label>
  );

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <CandidatePublicHeader />
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 520px) minmax(240px, 340px)', justifyContent: 'center', alignItems: 'center', gap: 20, minHeight: 'calc(100vh - 58px)', padding: 20 }}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 14, padding: '28px clamp(22px, 4vw, 38px)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 12px 36px rgba(15,23,42,.05)' }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}><h1 style={{ margin: 0, fontSize: 25, color: '#111827' }}>Đăng ký ứng viên</h1><p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>Tạo tài khoản để nộp hồ sơ và theo dõi quá trình tuyển dụng</p></div>
          {error && <div role="alert" style={{ padding: 10, color: '#991b1b', background: '#fef2f2', borderRadius: 6, fontSize: 13 }}>{error}</div>}
          {field('full_name', 'Họ và tên', 'text', 'Nhập họ và tên')}
          {field('email', 'Email', 'email', 'Nhập email của bạn')}
          {field('phone', 'Số điện thoại', 'tel', 'Nhập số điện thoại')}
          <label style={{ display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 }}>Mật khẩu
            <span style={{ position: 'relative' }}><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="g-form-input" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} placeholder="Tạo mật khẩu (ít nhất 8 ký tự)" style={{ paddingRight: 40 }} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label="Hiện hoặc ẩn mật khẩu" style={{ position: 'absolute', right: 8, top: 6, display: 'grid', placeItems: 'center', width: 30, height: 30, border: 0, color: '#64748b', background: 'transparent' }}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></span>
          </label>
          {field('confirm_password', 'Xác nhận mật khẩu', 'password', 'Nhập lại mật khẩu')}
          <button className="g-btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: 11 }}>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
          <div style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>Đã có tài khoản? <Link to="/candidate/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Đăng nhập</Link></div>
        </form>
        <aside style={{ padding: 22, border: '1px solid #dbeafe', borderRadius: 10, background: '#eff6ff' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, color: '#172554' }}>Cơ hội tại TechCorp</h2>
          {['Môi trường làm việc chuyên nghiệp', 'Cơ hội phát triển sự nghiệp', 'Chính sách đãi ngộ hấp dẫn', 'Đào tạo và phát triển kỹ năng'].map(item => <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 12, color: '#334155', fontSize: 13 }}><span style={{ color: '#2563eb' }}>✓</span>{item}</div>)}
        </aside>
      </section>
    </main>
  );
};

export default CandidateRegister;