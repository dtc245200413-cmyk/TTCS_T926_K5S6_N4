import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

const Reports = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');
  const [isEditing, setIsEditing] = useState(false);

  // Single source of truth for ALL demo data
  const [mockData, setMockData] = useState(() => {
    const saved = localStorage.getItem('demo_full_mock_stats_v3');
    if (saved) return JSON.parse(saved);
    return {
      users: { total: 156, active: 142 },
      jobs: { total: 24, approved: 8, pending: 5, draft: 3, closed: 8 },
      candidates: { total: 345, new: 24 },
      interviews: { total: 42, upcoming: 12 },
      departments: [
        { name: 'Công nghệ thông tin', value: 45 },
        { name: 'Nhân sự', value: 12 },
        { name: 'Kinh doanh', value: 58 },
        { name: 'Kế toán', value: 8 },
        { name: 'Marketing', value: 15 }
      ],
      roles: [
        { name: 'Quản trị viên', value: 3 },
        { name: 'Trưởng bộ phận', value: 8 },
        { name: 'Người phỏng vấn', value: 25 },
        { name: 'Nhân viên tuyển dụng', value: 12 },
        { name: 'Người duyệt', value: 5 }
      ],
      activities: [
        { name: 'Nguyễn Thị Hồng Nhung', action: 'vừa tạo Yêu cầu tuyển dụng mới cho vị trí Frontend Developer', time: '10 phút trước', color: '#4f46e5' },
        { name: 'Hà Đức Minh', action: 'đã phê duyệt hồ sơ ứng viên', time: '1 giờ trước', color: '#10b981' },
        { name: 'Lưu Quang Lực', action: 'đã lên lịch phỏng vấn với 3 ứng viên', time: '3 giờ trước', color: '#f59e0b' },
        { name: 'Mã Dương Quốc', action: 'đã thay đổi phân quyền hệ thống', time: '1 ngày trước', color: '#8b5cf6' }
      ]
    };
  });

  const saveMockData = () => {
    localStorage.setItem('demo_full_mock_stats_v3', JSON.stringify(mockData));
    setIsEditing(false);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1e293b' }}>Truy cập bị từ chối</h1>
        <p style={{ fontSize: '1.2rem', color: '#ef4444' }}>Bạn không có quyền xem Báo cáo thống kê.</p>
      </div>
    );
  }

  // --- Handlers for nested state ---
  const updateNested = (group, field, value) => {
    setMockData(prev => ({
      ...prev,
      [group]: { ...prev[group], [field]: parseInt(value) || 0 }
    }));
  };

  const updateArray = (group, index, field, value) => {
    setMockData(prev => {
      const newArray = [...prev[group]];
      newArray[index] = { ...newArray[index], [field]: field === 'value' ? (parseInt(value)||0) : value };
      return { ...prev, [group]: newArray };
    });
  };

  // Render a CSS horizontal bar
  const renderBar = (item, index, max, color) => {
    const width = max > 0 ? (item.value / max) * 100 : 0;
    return (
      <div key={index} style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          {isEditing ? (
            <input 
              type="text" 
              value={item.name} 
              onChange={(e) => updateArray('departments', index, 'name', e.target.value)}
              style={{ fontWeight: '500', color: '#334155', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 5px', width: '70%' }}
            />
          ) : (
            <span style={{ fontWeight: '500', color: '#334155' }}>{item.name}</span>
          )}
          
          {isEditing ? (
             <input 
               type="number" 
               value={item.value} 
               onChange={(e) => updateArray('departments', index, 'value', e.target.value)}
               style={{ fontWeight: 'bold', color: '#0f172a', border: '1px solid #ccc', borderRadius: '4px', padding: '2px 5px', width: '60px', textAlign: 'right' }}
             />
          ) : (
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.value}</span>
          )}
        </div>
        <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${width}%`, 
            background: color,
            borderRadius: '5px',
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* Header Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        borderRadius: '16px', 
        padding: '35px 40px', 
        color: 'white',
        marginBottom: '35px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '800', marginBottom: '10px', letterSpacing: '-0.5px' }}>
            Tổng quan Hệ thống
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.2rem', margin: 0 }}>
            Dashboard Demo: Dữ liệu hoàn toàn có thể chỉnh sửa
          </p>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {isEditing ? (
            <button onClick={saveMockData} style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', boxShadow: '0 8px 20px -5px rgba(16, 185, 129, 0.5)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <span style={{ fontSize: '1.2rem' }}>💾</span> Hoàn tất Chỉnh sửa
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <span style={{ fontSize: '1.2rem' }}>✨</span> Bật Chế độ Sửa toàn bộ
            </button>
          )}
          
          <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', padding: '12px 24px', borderRadius: '14px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 20px rgba(0,0,0,0.15)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>Trạng thái hệ thống</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <div style={{ position: 'relative', width: '12px', height: '12px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%', background: '#10b981', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
                <div style={{ position: 'relative', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 15px #10b981' }}></div>
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981', textShadow: '0 0 10px rgba(16,185,129,0.3)' }}>Ổn định</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', marginBottom: '40px' }}>
        
        {/* KPI 1: Users */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', borderTop: '4px solid #4f46e5', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-lift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: '0 0 10px 0' }}>NHÂN SỰ</p>
              {isEditing ? (
                <input type="number" value={mockData.users.total} onChange={(e) => updateNested('users', 'total', e.target.value)} style={{ fontSize: '2rem', fontWeight: 'bold', width: '90%', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              ) : (
                <h3 style={{ fontSize: '2.5rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>{mockData.users.total}</h3>
              )}
            </div>
            <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '12px', fontSize: '1.5rem' }}>👥</div>
          </div>
          <div style={{ margin: '15px 0 0 0', fontSize: '0.95rem', color: '#10b981', fontWeight: '500', display: 'flex', gap: '5px' }}>
            ↑ 
            {isEditing ? (
               <input type="number" value={mockData.users.active} onChange={(e) => updateNested('users', 'active', e.target.value)} style={{ width: '50px', border: '1px solid #ccc' }} />
            ) : mockData.users.active}
            tài khoản đang hoạt động
          </div>
        </div>

        {/* KPI 2: Jobs */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', borderTop: '4px solid #f59e0b', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-lift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: '0 0 10px 0' }}>YÊU CẦU TUYỂN DỤNG</p>
              {isEditing ? (
                <input type="number" value={mockData.jobs.total} onChange={(e) => updateNested('jobs', 'total', e.target.value)} style={{ fontSize: '2rem', fontWeight: 'bold', width: '90%', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              ) : (
                <h3 style={{ fontSize: '2.5rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>{mockData.jobs.total}</h3>
              )}
            </div>
            <div style={{ background: '#fffbeb', padding: '15px', borderRadius: '12px', fontSize: '1.5rem' }}>💼</div>
          </div>
          <div style={{ margin: '15px 0 0 0', fontSize: '0.95rem', color: '#f59e0b', fontWeight: '500', display: 'flex', gap: '5px' }}>
            → 
            {isEditing ? (
               <input type="number" value={mockData.jobs.approved} onChange={(e) => updateNested('jobs', 'approved', e.target.value)} style={{ width: '50px', border: '1px solid #ccc' }} />
            ) : mockData.jobs.approved}
            vị trí đang mở tuyển
          </div>
        </div>

        {/* KPI 3: Candidates */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', borderTop: '4px solid #10b981', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-lift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: '0 0 10px 0' }}>ỨNG VIÊN</p>
              {isEditing ? (
                <input type="number" value={mockData.candidates.total} onChange={(e) => updateNested('candidates', 'total', e.target.value)} style={{ fontSize: '2rem', fontWeight: 'bold', width: '90%', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              ) : (
                <h3 style={{ fontSize: '2.5rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>{mockData.candidates.total}</h3>
              )}
            </div>
            <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '12px', fontSize: '1.5rem' }}>📄</div>
          </div>
          <div style={{ margin: '15px 0 0 0', fontSize: '0.95rem', color: '#10b981', fontWeight: '500', display: 'flex', gap: '5px' }}>
            + 
            {isEditing ? (
               <input type="number" value={mockData.candidates.new} onChange={(e) => updateNested('candidates', 'new', e.target.value)} style={{ width: '50px', border: '1px solid #ccc' }} />
            ) : mockData.candidates.new}
            ứng viên mới tuần này
          </div>
        </div>

        {/* KPI 4: Interviews */}
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', borderTop: '4px solid #8b5cf6', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-lift">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', margin: '0 0 10px 0' }}>PHỎNG VẤN</p>
              {isEditing ? (
                <input type="number" value={mockData.interviews.total} onChange={(e) => updateNested('interviews', 'total', e.target.value)} style={{ fontSize: '2rem', fontWeight: 'bold', width: '90%', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              ) : (
                <h3 style={{ fontSize: '2.5rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>{mockData.interviews.total}</h3>
              )}
            </div>
            <div style={{ background: '#f5f3ff', padding: '15px', borderRadius: '12px', fontSize: '1.5rem' }}>🤝</div>
          </div>
          <div style={{ margin: '15px 0 0 0', fontSize: '0.95rem', color: '#8b5cf6', fontWeight: '500', display: 'flex', gap: '5px' }}>
            {isEditing ? (
               <input type="number" value={mockData.interviews.upcoming} onChange={(e) => updateNested('interviews', 'upcoming', e.target.value)} style={{ width: '50px', border: '1px solid #ccc' }} />
            ) : mockData.interviews.upcoming}
            lịch sắp diễn ra
          </div>
        </div>

      </div>

      {/* Detailed Sections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        
        {/* Section: Departments */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '25px', fontWeight: '700' }}>Phân bổ nhân sự theo phòng ban</h2>
          {mockData.departments.map((d, index) => renderBar(d, index, mockData.users.total, '#4f46e5'))}
        </div>

        {/* Section: Job Requisitions Breakdown */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '25px', fontWeight: '700' }}>Trạng thái Yêu cầu tuyển dụng</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Đang tuyển (Approved)</p>
              {isEditing ? (
                 <input type="number" value={mockData.jobs.approved} onChange={(e) => updateNested('jobs', 'approved', e.target.value)} style={{ fontSize: '1.8rem', width: '100%', border: '1px solid #ccc' }} />
              ) : <h4 style={{ margin: 0, fontSize: '1.8rem', color: '#10b981' }}>{mockData.jobs.approved}</h4>}
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Chờ duyệt (Pending)</p>
              {isEditing ? (
                 <input type="number" value={mockData.jobs.pending} onChange={(e) => updateNested('jobs', 'pending', e.target.value)} style={{ fontSize: '1.8rem', width: '100%', border: '1px solid #ccc' }} />
              ) : <h4 style={{ margin: 0, fontSize: '1.8rem', color: '#f59e0b' }}>{mockData.jobs.pending}</h4>}
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #94a3b8' }}>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Bản nháp (Draft)</p>
              {isEditing ? (
                 <input type="number" value={mockData.jobs.draft} onChange={(e) => updateNested('jobs', 'draft', e.target.value)} style={{ fontSize: '1.8rem', width: '100%', border: '1px solid #ccc' }} />
              ) : <h4 style={{ margin: 0, fontSize: '1.8rem', color: '#94a3b8' }}>{mockData.jobs.draft}</h4>}
            </div>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontWeight: '600' }}>Đã đóng / Từ chối</p>
              {isEditing ? (
                 <input type="number" value={mockData.jobs.closed} onChange={(e) => updateNested('jobs', 'closed', e.target.value)} style={{ fontSize: '1.8rem', width: '100%', border: '1px solid #ccc' }} />
              ) : <h4 style={{ margin: 0, fontSize: '1.8rem', color: '#ef4444' }}>{mockData.jobs.closed}</h4>}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section: Roles & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Roles Tag Cloud */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '25px', fontWeight: '700' }}>Phân quyền Hệ thống (Roles)</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
            {mockData.roles.map((r, idx) => (
              <div key={idx} style={{ 
                background: '#f1f5f9', 
                padding: '12px 20px', 
                borderRadius: '30px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                {isEditing ? (
                  <>
                    <input type="text" value={r.name} onChange={(e) => updateArray('roles', idx, 'name', e.target.value)} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px', width: '120px' }} />
                    <input type="number" value={r.value} onChange={(e) => updateArray('roles', idx, 'value', e.target.value)} style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '2px', width: '50px' }} />
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: '600', color: '#334155' }}>{r.name}</span>
                    <span style={{ background: '#4f46e5', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {r.value}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Timeline (Fully Editable) */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '25px', fontWeight: '700' }}>Hoạt động gần đây</h2>
          
          <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #e2e8f0' }}>
            {mockData.activities.map((act, idx) => {
              const isLast = idx === mockData.activities.length - 1;
              return (
                <div key={idx} style={{ marginBottom: isLast ? '0' : '20px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-27px', top: '5px', width: '12px', height: '12px', background: act.color, borderRadius: '50%', border: '2px solid white' }}></div>
                  
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <input type="text" value={act.name} onChange={(e) => updateArray('activities', idx, 'name', e.target.value)} placeholder="Tên người dùng" style={{ border: '1px solid #ccc', padding: '4px', width: '100%' }} />
                      <input type="text" value={act.action} onChange={(e) => updateArray('activities', idx, 'action', e.target.value)} placeholder="Hành động (tiếng việt)" style={{ border: '1px solid #ccc', padding: '4px', width: '100%' }} />
                      <input type="text" value={act.time} onChange={(e) => updateArray('activities', idx, 'time', e.target.value)} placeholder="Thời gian (VD: 10 phút trước)" style={{ border: '1px solid #ccc', padding: '4px', width: '100%' }} />
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: 0, color: '#334155', fontWeight: '500' }}>{act.name}</p>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic' }}>{act.action}</p>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{act.time}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1) !important;
        }
      `}} />
    </div>
  );
};

export default Reports;
