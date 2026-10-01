import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import statsApi from '../api/statsApi';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const [userStats, setUserStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');

  // Load mock data from localStorage or use defaults
  const [mockData, setMockData] = useState(() => {
    const saved = localStorage.getItem('demo_mock_stats');
    if (saved) return JSON.parse(saved);
    return {
      recruitment: { total: 12, active: 5, closed: 7, candidatesApplied: 156, hired: 8 },
      candidate: { new: 45, reviewing: 30, interviewing: 25, passed: 10, failed: 46 },
      interview: { total: 85, completed: 60, pending: 25, passed: 15, failed: 45 }
    };
  });

  const handleMockChange = (group, field, value) => {
    setMockData(prev => ({
      ...prev,
      [group]: { ...prev[group], [field]: parseInt(value) || 0 }
    }));
  };

  const saveMockData = () => {
    localStorage.setItem('demo_mock_stats', JSON.stringify(mockData));
    setIsEditing(false);
  };

  useEffect(() => {
    if (isAdmin) {
      setLoadingStats(true);
      statsApi.getDashboardStats()
        .then(res => {
          if (res.data && res.data.success) {
            setUserStats(res.data.data);
          }
        })
        .catch(err => console.error('Error fetching stats:', err))
        .finally(() => setLoadingStats(false));
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header" style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#1e293b' }}>Báo cáo thống kê</h1>
        </div>
        <p style={{ fontSize: '1.2rem', color: '#ef4444' }}>Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  const renderStatItem = (label, value, group, field, color = '#3b82f6') => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: `5px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <span style={{ color: '#64748b', fontSize: '1rem', marginBottom: '10px', fontWeight: '600' }}>{label}</span>
        {isEditing && group ? (
          <input 
            type="number" 
            value={value} 
            onChange={(e) => handleMockChange(group, field, e.target.value)}
            style={{ fontSize: '1.8rem', fontWeight: 'bold', padding: '5px 10px', border: '2px solid #cbd5e1', borderRadius: '6px', width: '100%', outline: 'none', color: '#0f172a' }}
          />
        ) : (
          <strong style={{ fontSize: '2.2rem', color: '#0f172a', lineHeight: '1' }}>{value}</strong>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', color: '#1e293b', fontWeight: 'bold' }}>Báo Cáo Thống Kê</h1>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '1.1rem' }}>Bảng điều khiển tổng hợp dữ liệu toàn bộ Hệ Thống Tuyển Dụng</p>
        </div>
        <div>
          {isEditing ? (
            <button onClick={saveMockData} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.4)' }}>
              💾 Lưu Số Liệu Demo
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.4)' }}>
              ✏️ Sửa Số Liệu Demo
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        
        {/* 1. Thống kê tuyển dụng */}
        <div className="card" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            💼 Thống Kê Tuyển Dụng
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {renderStatItem('Tổng số vị trí', mockData.recruitment.total, 'recruitment', 'total', '#3b82f6')}
            {renderStatItem('Vị trí đang tuyển', mockData.recruitment.active, 'recruitment', 'active', '#10b981')}
            {renderStatItem('Vị trí đã đóng', mockData.recruitment.closed, 'recruitment', 'closed', '#ef4444')}
            {renderStatItem('Ứng viên ứng tuyển', mockData.recruitment.candidatesApplied, 'recruitment', 'candidatesApplied', '#f59e0b')}
            {renderStatItem('Ứng viên được tuyển', mockData.recruitment.hired, 'recruitment', 'hired', '#8b5cf6')}
          </div>
        </div>

        {/* 2. Thống kê ứng viên */}
        <div className="card" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📄 Thống Kê Ứng Viên
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {renderStatItem('Ứng viên Mới', mockData.candidate.new, 'candidate', 'new', '#3b82f6')}
            {renderStatItem('Đang xét duyệt', mockData.candidate.reviewing, 'candidate', 'reviewing', '#f59e0b')}
            {renderStatItem('Đang phỏng vấn', mockData.candidate.interviewing, 'candidate', 'interviewing', '#8b5cf6')}
            {renderStatItem('Đã Trúng Tuyển', mockData.candidate.passed, 'candidate', 'passed', '#10b981')}
            {renderStatItem('Không Đạt', mockData.candidate.failed, 'candidate', 'failed', '#ef4444')}
          </div>
        </div>

        {/* 3. Thống kê phỏng vấn */}
        <div className="card" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🤝 Thống Kê Phỏng Vấn
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {renderStatItem('Tổng số buổi', mockData.interview.total, 'interview', 'total', '#3b82f6')}
            {renderStatItem('Đã hoàn thành', mockData.interview.completed, 'interview', 'completed', '#10b981')}
            {renderStatItem('Chưa diễn ra', mockData.interview.pending, 'interview', 'pending', '#f59e0b')}
            {renderStatItem('Kết quả: Đạt', mockData.interview.passed, 'interview', 'passed', '#10b981')}
            {renderStatItem('Kết quả: Không Đạt', mockData.interview.failed, 'interview', 'failed', '#ef4444')}
          </div>
        </div>

        {/* 4. Thống kê người dùng (Real Data) */}
        <div className="card" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.6rem', color: '#0f172a', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            👥 Thống Kê Người Dùng (Dữ liệu thực tế từ Database)
          </h2>
          {loadingStats ? (
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Đang tải dữ liệu thực...</p>
          ) : userStats ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {renderStatItem('Tổng số tài khoản', userStats.users?.total, null, null, '#3b82f6')}
                {renderStatItem('Tài khoản hoạt động', userStats.users?.active, null, null, '#10b981')}
                {renderStatItem('Tài khoản bị khóa', userStats.users?.total - userStats.users?.active, null, null, '#ef4444')}
              </div>
              
              {userStats.roles && userStats.roles.length > 0 && (
                <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', marginBottom: '20px', color: '#334155', fontSize: '1.2rem' }}>Chi tiết theo từng Vai trò (Roles):</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {userStats.roles.map(r => (
                      <div key={r.role_code} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1.1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <span style={{ color: '#475569', fontWeight: '600' }}>{r.role_name}</span>
                        <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.4rem' }}>{r.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '1.2rem', color: '#64748b' }}>Không có dữ liệu thống kê.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Reports;
