import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', color: '#1e293b' }}>Tổng quan</h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>Hệ Thống Tuyển Dụng Nội Bộ</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Cột trái: Thông tin User */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{user?.full_name}</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>{user?.job_title}</p>
            </div>
          </div>
          
          <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
            <p><strong>Mã nhân viên:</strong> <span style={{ float: 'right', color: '#475569' }}>{user?.employee_code}</span></p>
            <p><strong>Email:</strong> <span style={{ float: 'right', color: '#475569' }}>{user?.company_email}</span></p>
            <p><strong>Phòng ban:</strong> <span style={{ float: 'right', color: '#475569' }}>{user?.department?.department_name || 'N/A'}</span></p>
            <p>
              <strong>Trạng thái:</strong> 
              <span style={{ float: 'right' }} className={`badge ${user?.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                {user?.status === 'ACTIVE' ? 'Hoạt động' : user?.status}
              </span>
            </p>
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #e2e8f0' }}>
              <strong>Vai trò hiện tại:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {user?.roles?.map((role) => (
                  <span key={role.role_id} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', color: '#334155', border: '1px solid #cbd5e1' }}>
                    {role.role_name}
                  </span>
                ))}
                {(!user?.roles || user.roles.length === 0) && <span style={{ color: '#94a3b8' }}>Không có vai trò</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
