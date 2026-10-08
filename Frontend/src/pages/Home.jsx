import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 100px)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      {/* Decorative Background Elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }}></div>

      {/* Welcome Banner (Top Strip) */}
      <div style={{ position: 'relative', zIndex: 1, height: '160px', flexShrink: 0, background: 'linear-gradient(to right, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.5)), url("/login-bg.png")', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '24px', padding: '0 40px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'white' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Chào mừng trở lại, {user?.full_name?.split(' ').pop()}! 👋
          </h1>
          <p style={{ fontSize: '1rem', color: '#cbd5e1', margin: 0 }}>
            Chúc bạn một ngày làm việc hiệu quả. Dưới đây là thông tin và đặc quyền của bạn.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
        </div>
      </div>

      {/* Profile Card (Bottom Area) */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', minHeight: 0 }}>
        <div className="card" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.5)', padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '60px', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(67, 56, 202, 0.02) 100%)', position: 'relative', flexShrink: 0 }}></div>
          
          <div style={{ padding: '0 40px 30px 40px', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header / Avatar */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginTop: '-30px', marginBottom: '20px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '800', boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)', border: '4px solid white', flexShrink: 0 }}>
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ paddingBottom: '5px', flex: 1 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: '#0f172a', fontWeight: '800' }}>{user?.full_name}</h2>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#4f46e5', fontWeight: '600' }}>{user?.job_title}</p>
              </div>
              {/* SCRUM-58: Update profile button — visible to all users */}
              <div style={{ paddingBottom: '5px' }}>
                <Link
                  to="/profile/edit"
                  className="btn-primary"
                  style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '0.875rem' }}
                >
                  ✏️ Cập nhật hồ sơ
                </Link>
              </div>
            </div>
            
            {/* Main Info Grid - Uses 2 columns for a wider horizontal layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã nhân viên</span>
                <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1rem' }}>{user?.employee_code}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phòng ban</span>
                <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1rem' }}>{user?.department?.department_name || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email liên hệ</span>
                <span style={{ color: '#0f172a', fontWeight: '700', fontSize: '1rem' }}>{user?.company_email}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trạng thái tài khoản</span>
                <div>
                  <span className={`badge ${user?.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    {user?.status === 'ACTIVE' ? 'Đang hoạt động' : user?.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Tập Quyền Hệ Thống</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {user?.roles?.map((role) => (
                  <div key={role.role_id} style={{ background: 'white', padding: '6px 14px', borderRadius: '10px', fontSize: '0.85rem', color: '#334155', border: '1px solid #cbd5e1', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }}></span>
                    {role.role_name}
                  </div>
                ))}
                {(!user?.roles || user.roles.length === 0) && <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>Chưa cấp quyền.</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
