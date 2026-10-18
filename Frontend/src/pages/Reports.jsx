import React, { useContext, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  FiDownload, FiPrinter, FiFilter, FiTrendingUp, FiUsers, 
  FiBriefcase, FiCheckCircle, FiClock, FiLayers, FiCalendar,
  FiArrowUpRight, FiPieChart, FiBarChart2, FiAward, FiShare2
} from 'react-icons/fi';

const CAMPAIGNS_DATA = [
  { id: 'REC-2026-001', title: 'Kỹ sư Phần mềm Fresher (Fullstack)', department: 'Công nghệ thông tin', deptCode: 'IT', headcount: 8, applied: 94, interviewed: 28, hired: 7, status: 'IN_PROGRESS', slaDays: 16.5 },
  { id: 'REC-2026-002', title: 'Chuyên viên Tuyển dụng (Recruiter)', department: 'Nhân sự', deptCode: 'HR', headcount: 2, applied: 42, interviewed: 12, hired: 2, status: 'COMPLETED', slaDays: 14.0 },
  { id: 'REC-2026-003', title: 'Giám sát Kinh doanh Doanh nghiệp (B2B)', department: 'Kinh doanh', deptCode: 'SALES', headcount: 5, applied: 68, interviewed: 22, hired: 4, status: 'IN_PROGRESS', slaDays: 19.8 },
  { id: 'REC-2026-004', title: 'Chuyên viên Digital Marketing Lead', department: 'Marketing', deptCode: 'MKT', headcount: 2, applied: 35, interviewed: 8, hired: 2, status: 'COMPLETED', slaDays: 15.2 },
  { id: 'REC-2026-005', title: 'Kỹ sư Kiểm thử Phần mềm (Automation QA)', department: 'Công nghệ thông tin', deptCode: 'IT', headcount: 4, applied: 56, interviewed: 18, hired: 3, status: 'IN_PROGRESS', slaDays: 21.0 },
  { id: 'REC-2026-006', title: 'Kế toán Tổng hợp & Thuế', department: 'Kế toán', deptCode: 'ACC', headcount: 1, applied: 26, interviewed: 6, hired: 1, status: 'COMPLETED', slaDays: 12.0 },
  { id: 'REC-2026-007', title: 'Product Owner (Nền tảng Cloud)', department: 'Công nghệ thông tin', deptCode: 'IT', headcount: 2, applied: 24, interviewed: 9, hired: 1, status: 'NEED_BOOST', slaDays: 28.5 },
];

const Reports = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');
  const isHrManager = user?.roles?.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'RECRUITER') || user?.company_email === 'dtc245200002@ictu.edu.vn';
  const canViewReports = isAdmin || isHrManager;

  const [timeRange, setTimeRange] = useState('30days');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const filteredCampaigns = useMemo(() => {
    if (selectedDept === 'ALL') return CAMPAIGNS_DATA;
    return CAMPAIGNS_DATA.filter(c => c.deptCode === selectedDept);
  }, [selectedDept]);

  const stats = useMemo(() => {
    const totalHeadcount = filteredCampaigns.reduce((sum, c) => sum + c.headcount, 0);
    const totalHired = filteredCampaigns.reduce((sum, c) => sum + c.hired, 0);
    const totalApplied = filteredCampaigns.reduce((sum, c) => sum + c.applied, 0);
    const totalInterviewed = filteredCampaigns.reduce((sum, c) => sum + c.interviewed, 0);
    const completionRate = totalHeadcount > 0 ? ((totalHired / totalHeadcount) * 100).toFixed(1) : 0;
    const avgSla = filteredCampaigns.length > 0 
      ? (filteredCampaigns.reduce((sum, c) => sum + c.slaDays, 0) / filteredCampaigns.length).toFixed(1) 
      : 0;

    return {
      totalHeadcount,
      totalHired,
      totalApplied,
      totalInterviewed,
      completionRate,
      avgSla
    };
  }, [filteredCampaigns]);

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = ['Mã chiến dịch', 'Vị trí tuyển dụng', 'Phòng ban', 'Chỉ tiêu', 'Hồ sơ nhận', 'Đã phỏng vấn', 'Đã tuyển', 'Tỷ lệ đạt (%)', 'Thời gian trung bình (ngày)'];
    const rows = filteredCampaigns.map(c => [
      c.id,
      `"${c.title}"`,
      `"${c.department}"`,
      c.headcount,
      c.applied,
      c.interviewed,
      c.hired,
      ((c.hired / c.headcount) * 100).toFixed(1),
      c.slaDays
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Tuyen_Dung_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Đã xuất file báo cáo Excel (CSV UTF-8) thành công!');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!canViewReports) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h1 className="g-page-title" style={{ fontSize: '1.8rem', color: '#0f172a' }}>Truy cập bị từ chối</h1>
        <p className="g-page-subtitle" style={{ color: '#64748b', marginTop: '8px' }}>Bạn không có quyền hạn truy cập Báo cáo & Thống kê Tuyển dụng.</p>
      </div>
    );
  }

  return (
    <div className="reports-container" style={{ width: '100%', maxWidth: '100%', padding: '24px clamp(16px, 3vw, 36px)', boxSizing: 'border-box' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, background: '#0f172a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
          <FiCheckCircle color="#34d399" size={18} /> {toastMessage}
        </div>
      )}

      {/* Executive Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '32px 36px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 12px 30px -10px rgba(15, 23, 42, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(165, 180, 252, 0.3)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            <FiBarChart2 /> Trung tâm Phân tích & Quản trị Nhân sự
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '1.95rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Báo cáo & Phân tích Tuyển dụng
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '0.95rem', margin: 0, lineHeight: 1.6, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            Tổng hợp dữ liệu nguồn lực, thời gian tuyển dụng trung bình (Time-to-Hire), phễu chuyển đổi ứng viên và tiến độ tuyển theo thời gian thực.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleExportCSV} 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '11px 18px', backgroundColor: '#2563eb', color: '#ffffff', 
              border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', 
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <FiDownload size={16} /> Xuất Báo Cáo Excel
          </button>
          
          <button 
            type="button"
            onClick={handlePrint}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', 
              padding: '11px 16px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', 
              border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '10px', 
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <FiPrinter size={16} /> In / Xuất PDF
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiFilter /> Phạm vi:
          </span>
          
          <select 
            value={timeRange} 
            onChange={e => setTimeRange(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="30days">30 ngày gần nhất (Tháng 10/2026)</option>
            <option value="q4">Quý 4 / 2026</option>
            <option value="q3">Quý 3 / 2026</option>
            <option value="year">Cả năm 2026</option>
          </select>

          <select 
            value={selectedDept} 
            onChange={e => setSelectedDept(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          >
            <option value="ALL">Tất cả phòng ban</option>
            <option value="IT">Công nghệ thông tin</option>
            <option value="SALES">Khối Kinh doanh</option>
            <option value="HR">Phòng Nhân sự</option>
            <option value="MKT">Marketing & Truyền thông</option>
            <option value="ACC">Tài chính - Kế toán</option>
          </select>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiCalendar /> Dữ liệu cập nhật: <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Card 1: Headcount & Completion */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiến độ chỉ tiêu</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiBriefcase />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalHired} / {stats.totalHeadcount}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>nhân sự</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <FiTrendingUp /> Đạt {stats.completionRate}% chỉ tiêu
            </span>
            <span style={{ color: '#94a3b8' }}>Kỳ tuyển dụng</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, stats.completionRate)}%`, height: '100%', background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '3px' }}></div>
          </div>
        </div>

        {/* Card 2: Applications Received */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hồ sơ ứng tuyển</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiUsers />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalApplied}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>hồ sơ tiếp nhận</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <FiArrowUpRight /> ↑ 18.5% so với cùng kỳ
            </span>
            <span style={{ color: '#94a3b8' }}>68% nộp trực tuyến</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '3px' }}></div>
          </div>
        </div>

        {/* Card 3: Interview Pass Rate */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lượt phỏng vấn</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiClock />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalInterviewed}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>lượt đã thực hiện</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>Tỷ lệ đạt phỏng vấn: 44.2%</span>
            <span style={{ color: '#94a3b8' }}>Mục tiêu: 40%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: '44.2%', height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '3px' }}></div>
          </div>
        </div>

        {/* Card 4: Time to Hire */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', borderTop: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thời gian tuyển dụng</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <FiAward />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#0f172a' }}>{stats.avgSla}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>ngày (Time-to-Hire)</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: '#7c3aed', fontWeight: 700 }}>Nhanh hơn 3.5 ngày so với SLA</span>
            <span style={{ color: '#94a3b8' }}>SLA chuẩn: 21 ngày</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
            <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: '3px' }}></div>
          </div>
        </div>

      </div>

      {/* Analytics Mid Section: Funnel & Sourcing Channels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(300px, 1fr)', gap: '24px', marginBottom: '28px' }}>
        
        {/* Recruitment Funnel */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Phễu chuyển đổi tuyển dụng (Recruitment Funnel)</h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>Tỷ lệ chuyển đổi ứng viên qua từng vòng đánh giá và tiếp nhận</p>
            </div>
            <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>Tổng: {stats.totalApplied} CV</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: '1. Hồ sơ ứng tuyển tiếp nhận', count: stats.totalApplied, pct: 100, color: '#3b82f6', desc: 'Nộp qua web & các kênh tuyển dụng' },
              { label: '2. Vượt qua sơ loại hồ sơ (Screening)', count: Math.round(stats.totalApplied * 0.63), pct: 63, color: '#6366f1', desc: 'Đạt yêu cầu bằng cấp và kinh nghiệm' },
              { label: '3. Phỏng vấn vòng 1 (HR & Văn hóa)', count: stats.totalInterviewed, pct: Math.round((stats.totalInterviewed / (stats.totalApplied || 1)) * 100), color: '#8b5cf6', desc: 'Đánh giá thái độ, giao tiếp và fit văn hóa' },
              { label: '4. Phỏng vấn chuyên môn (Technical/HOD)', count: Math.round(stats.totalInterviewed * 0.52), pct: Math.round((stats.totalInterviewed * 0.52 / (stats.totalApplied || 1)) * 100), color: '#ec4899', desc: 'Kiểm tra nghiệp vụ, bài test kỹ năng' },
              { label: '5. Gửi thư mời nhận việc (Offer)', count: Math.round(stats.totalHired * 1.15), pct: Math.round((stats.totalHired * 1.15 / (stats.totalApplied || 1)) * 100), color: '#f59e0b', desc: 'Thỏa thuận lương thưởng & chế độ' },
              { label: '6. Onboarding nhận việc thành công', count: stats.totalHired, pct: Math.round((stats.totalHired / (stats.totalApplied || 1)) * 100), color: '#10b981', desc: 'Ký hợp đồng & bắt đầu làm việc' },
            ].map((step, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{step.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{step.count} ứng viên</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', background: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>{step.pct}%</span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${step.pct}%`, height: '100%', background: step.color, borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sourcing Channels & Dept Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Source Breakdown */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 26px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Kênh tiếp nhận ứng viên hiệu quả</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px' }}>Tỷ lệ nguồn hồ sơ chất lượng cao</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Cổng Tuyển dụng Nội bộ TechCorp', pct: 45, count: '155 hồ sơ', color: '#2563eb' },
                { name: 'LinkedIn & Mạng Nghề nghiệp', pct: 28, count: '96 hồ sơ', color: '#0284c7' },
                { name: 'Giới thiệu nội bộ (Employee Referral)', pct: 18, count: '62 hồ sơ', color: '#10b981' },
                { name: 'Các trang việc làm đối tác & Khác', pct: 9, count: '32 hồ sơ', color: '#8b5cf6' },
              ].map((src, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{src.name}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{src.pct}% ({src.count})</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${src.pct}%`, height: '100%', background: src.color, borderRadius: '3px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Progress Summary */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px 26px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Chỉ tiêu tuyển theo phòng ban</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 16px' }}>Tiến độ đáp ứng nhân sự các khối</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { dept: 'Công nghệ thông tin', hired: 11, target: 14, color: '#2563eb' },
                { dept: 'Khối Kinh doanh', hired: 4, target: 5, color: '#10b981' },
                { dept: 'Marketing & Truyền thông', hired: 2, target: 2, color: '#059669' },
                { dept: 'Phòng Nhân sự', hired: 2, target: 2, color: '#f59e0b' },
              ].map((d, idx) => (
                <div key={idx} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{d.dept}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {d.hired} / {d.target} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: d.hired >= d.target ? '#16a34a' : '#2563eb' }}>({Math.round((d.hired / d.target) * 100)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Detailed Campaigns Performance Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '26px 28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Chi tiết các chiến dịch tuyển dụng trọng điểm</h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>Theo dõi tiến độ tuyển, tỷ lệ đáp ứng và số ngày hoàn thành trung bình</p>
          </div>
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Hiển thị {filteredCampaigns.length} vị trí tuyển dụng</span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Mã vị trí / Tên công việc</th>
                <th style={{ padding: '14px 16px', fontWeight: 700 }}>Phòng ban</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Chỉ tiêu</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Hồ sơ nộp</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Phỏng vấn</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Đã tuyển</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Tiến độ</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((camp, idx) => {
                const pct = Math.round((camp.hired / camp.headcount) * 100);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{camp.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{camp.id}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155', fontWeight: 500 }}>{camp.department}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{camp.headcount}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>{camp.applied}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>{camp.interviewed}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 800, color: camp.hired >= camp.headcount ? '#16a34a' : '#0f172a' }}>
                      {camp.hired}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', minWidth: '110px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: pct >= 100 ? '#10b981' : '#2563eb' }}></div>
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pct >= 100 ? '#16a34a' : '#334155' }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {camp.status === 'COMPLETED' ? (
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                          Đã hoàn thành
                        </span>
                      ) : camp.status === 'NEED_BOOST' ? (
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: '#fef2f2', color: '#b91c1c' }}>
                          Cần đẩy mạnh
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                          Đang tuyển dụng
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;
