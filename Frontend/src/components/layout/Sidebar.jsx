import React, { useContext, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  FiGrid, FiUsers, FiUser, FiList, FiFileText, 
  FiShield, FiHome, FiShare2, FiBriefcase, 
  FiClipboard, FiEdit, FiCheckSquare, FiBookOpen, 
  FiClock, FiKey, FiLock, FiLogOut, FiBell, FiBarChart2, FiCheckCircle, FiGitBranch,
  FiCalendar, FiAward, FiLayers, FiPlus, FiTrendingUp, FiRepeat
} from 'react-icons/fi';
import '../../styles/global.css';
import { interviewAccess } from '../../utils/interviewSchedules';

const Sidebar = () => {
  const { hasPermission, logout, user } = useContext(AuthContext);
  const location = useLocation();
  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');
  const isHrManager = Boolean(
    user?.roles?.some(
      (r) =>
        r.role_code === 'HR_MANAGER' ||
        (r.role_name && (
          r.role_name.toLowerCase().includes('trưởng phòng nhân sự') ||
          r.role_name.toLowerCase().includes('hr manager')
        ))
    ) ||
    user?.company_email === 'dtc245200002@ictu.edu.vn'
  );
  
  const isApprover = Boolean(
    user?.roles?.some(r => 
      r.role_code === 'APPROVER' || 
      r.role_code === 'DIRECTOR' || 
      (r.role_name && r.role_name.toLowerCase().includes('giám đốc')) ||
      (r.role_name && r.role_name.toLowerCase().includes('phê duyệt')) ||
      (r.role_name && r.role_name.toLowerCase().includes('approver'))
    ) || 
    user?.job_title?.toLowerCase().includes('người phê duyệt') || 
    user?.job_title?.toLowerCase().includes('giám đốc') || 
    user?.company_email === 'dtc245200592@ictu.edu.vn'
  );

  const isHiringManager = Boolean(
    user?.roles?.some(r => 
      r.role_code === 'HIRING_MANAGER' ||
      (r.role_name && r.role_name.toLowerCase().includes('trưởng bộ phận')) ||
      (r.role_name && r.role_name.toLowerCase().includes('hiring manager'))
    ) || 
    user?.job_title?.toLowerCase().includes('trưởng bộ phận')
  );

  const isRecruiterRole = Boolean(
    user?.roles?.some(r => 
      r.role_code === 'RECRUITER' || 
      (r.role_name && r.role_name.toLowerCase().includes('tuyển dụng')) ||
      (r.role_name && r.role_name.toLowerCase().includes('recruiter'))
    ) || 
    user?.job_title?.toLowerCase().includes('tuyển dụng') ||
    user?.job_title?.toLowerCase().includes('recruiter')
  );

  const isInterviewer = Boolean(
    user?.roles?.some(r => 
      r.role_code === 'INTERVIEWER' || 
      r.role_code === 'NGUOI_PHONG_VAN' || 
      (r.role_name && r.role_name.toLowerCase().includes('phỏng vấn')) ||
      (r.role_name && r.role_name.toLowerCase().includes('interviewer'))
    ) || 
    user?.job_title?.toLowerCase().includes('phỏng vấn') || 
    user?.job_title?.toLowerCase().includes('interviewer') || 
    user?.company_email === 'dtc245200571@ictu.edu.vn'
  );

  const getSubtitle = () => {
    if (isAdmin) return 'Quản trị hệ thống';
    if (isHrManager) return 'TRƯỞNG PHÒNG NHÂN SỰ';
    if (isApprover) return 'GIÁM ĐỐC';
    if (isHiringManager) return 'TRƯỞNG BỘ PHẬN';
    if (isRecruiterRole) return 'NHÂN VIÊN TUYỂN DỤNG';
    if (isInterviewer) return 'NGƯỜI PHỎNG VẤN';
    return 'HỆ THỐNG NỘI BỘ';
  };
  
  const getLogoIcon = () => {
    if (isAdmin || isHrManager || isHiringManager || isApprover) return <FiShield size={20} />;
    if (isRecruiterRole) return <FiUsers size={20} />;
    if (isInterviewer) return <FiCalendar size={20} />;
    return <FiHome size={20} />;
  };
  
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNavLinkStyle = (toPath) => {
    return ({ isActive }) => {
      let active = isActive;
      if (toPath.includes('?')) {
        active = (location.pathname + location.search) === toPath;
      } else if (location.search && (toPath === location.pathname)) {
        active = false;
      }
      return {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', margin: '4px 12px',
        borderRadius: '8px', textDecoration: 'none',
        color: active ? '#fff' : '#cbd5e1',
        background: active ? '#2563eb' : 'transparent',
        fontWeight: active ? '700' : '500',
        fontSize: '0.9rem',
        transition: 'all 0.2s',
        border: 'none',
        boxShadow: active ? '0 2px 8px rgba(37,99,235,0.4)' : 'none'
      };
    };
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', margin: '4px 12px',
    borderRadius: '8px', textDecoration: 'none',
    color: isActive ? '#fff' : '#cbd5e1',
    background: isActive ? '#2563eb' : 'transparent',
    fontWeight: isActive ? '700' : '500',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    border: 'none',
    boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.4)' : 'none'
  });

  const getClassName = () => '';

  const [openMenus, setOpenMenus] = useState({
    account: false,
    org: true,
    hiringReq: true,
    hiringCand: true
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', margin: '4px 12px',
    borderRadius: '8px', cursor: 'pointer',
    color: '#ffffff', fontWeight: '700', fontSize: '0.9rem',
    background: 'transparent', transition: 'all 0.2s', userSelect: 'none'
  };

  const sectionHeader = (text) => (
    <div style={{ padding: '0 24px', marginTop: '16px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
      {text}
    </div>
  );

  const renderAdminMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>
      
      <NavLink to="/users" className={getClassName} style={navLinkStyle}>
        <FiUsers size={18} /> Quản lý nhân sự
      </NavLink>

      <NavLink to="/accounts" className={getClassName} style={navLinkStyle}>
        <FiUser size={18} /> Quản lý tài khoản
      </NavLink>

      <NavLink to="/roles" className={getClassName} style={navLinkStyle}>
        <FiShield size={18} /> Quản lý phân quyền
      </NavLink>

      {sectionHeader('QUẢN LÝ TỔ CHỨC')}
      <NavLink to="/departments" className={getClassName} style={navLinkStyle}>
        <FiShare2 size={18} /> Phòng ban
      </NavLink>
      <NavLink to="/positions" className={getClassName} style={navLinkStyle}>
        <FiList size={18} /> Chức danh & dải lương
      </NavLink>

      {sectionHeader('QUẢN LÝ TUYỂN DỤNG')}
      <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle}>
        <FiEdit size={18} /> Yêu cầu tuyển dụng
      </NavLink>
      <NavLink to="/job-postings" className={getClassName} style={navLinkStyle}>
        <FiFileText size={18} /> Tin tuyển dụng
      </NavLink>
      <NavLink to="/candidates" className={getClassName} style={navLinkStyle}>
        <FiUsers size={18} /> Quản lý ứng viên
      </NavLink>
      <NavLink to="/interview-schedules" className={getClassName} style={navLinkStyle}>
        <FiCalendar size={18} /> Lịch phỏng vấn
      </NavLink>
      <NavLink to="/competency-frameworks" className={getClassName} style={navLinkStyle}>
        <FiAward size={18} /> Khung năng lực
      </NavLink>
      <NavLink to="/questions" className={getClassName} style={navLinkStyle}>
        <FiBarChart2 size={18} /> Ngân hàng câu hỏi
      </NavLink>
      <NavLink to="/master-data" className={getClassName} style={navLinkStyle}>
        <FiLayers size={18} /> Danh mục tuyển dụng
      </NavLink>
      <NavLink to="/company-profile" className={getClassName} style={navLinkStyle}>
        <FiBriefcase size={18} /> Hồ sơ công ty
      </NavLink>
    </div>
  );

  const renderHrMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiFileText size={18} /> Tổng quan
      </NavLink>

      <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle} end>
        <FiEdit size={18} /> Yêu cầu tuyển dụng
      </NavLink>

      <NavLink to="/job-postings" className={getClassName} style={navLinkStyle}>
        <FiFileText size={18} /> Tin tuyển dụng
      </NavLink>

      <NavLink to="/candidates" className={getClassName} style={navLinkStyle}>
        <FiUser size={18} /> Ứng viên
      </NavLink>

      <NavLink to="/interview-schedules" className={getClassName} style={navLinkStyle}>
        <FiCalendar size={18} /> Lịch phỏng vấn
      </NavLink>

      <NavLink to="/reports" className={getClassName} style={navLinkStyle}>
        <FiBarChart2 size={18} /> Báo cáo
      </NavLink>

      {/* Quản lý tổ chức (Collapsible with ▼ matching screenshot) */}
      <div 
        onClick={() => toggleMenu('org')} 
        style={headerStyle}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiLayers size={18} /> Quản lý tổ chức
        </div>
        <span style={{ fontSize: '0.75rem', opacity: 0.7, transform: openMenus.org ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
      </div>
      {openMenus.org && (
        <div style={{ paddingLeft: '24px' }}>
          <NavLink to="/departments" className={getClassName} style={navLinkStyle}>
            <FiShare2 size={18} /> Phòng ban
          </NavLink>
          <NavLink to="/positions" className={getClassName} style={navLinkStyle}>
            <FiBriefcase size={18} /> Chức danh & dải lương
          </NavLink>
        </div>
      )}

      <NavLink to="/approval-workflows" className={getClassName} style={navLinkStyle}>
        <FiCheckCircle size={18} /> Luồng phê duyệt
      </NavLink>

      <NavLink to="/competency-frameworks" className={getClassName} style={navLinkStyle}>
        <FiShield size={18} /> Khung năng lực
      </NavLink>

      <NavLink to="/questions" className={getClassName} style={navLinkStyle}>
        <FiBookOpen size={18} /> Ngân hàng câu hỏi
      </NavLink>

      <NavLink to="/master-data" className={getClassName} style={navLinkStyle}>
        <FiLayers size={18} /> Danh mục tuyển dụng
      </NavLink>

      <NavLink to="/company-profile" className={getClassName} style={navLinkStyle}>
        <FiBriefcase size={18} /> Hồ sơ công ty
      </NavLink>
    </div>
  );

  const renderHiringManagerMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>

      <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle}>
        <FiEdit size={18} /> Quản lý yêu cầu
      </NavLink>

      <NavLink to="/candidates" className={getClassName} style={navLinkStyle}>
        <FiUsers size={18} /> Ứng viên bộ phận
      </NavLink>

      <NavLink to="/interview-schedules" className={getClassName} style={navLinkStyle}>
        <FiCalendar size={18} /> Lịch phỏng vấn
      </NavLink>
    </div>
  );

  const renderRecruiterMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={getNavLinkStyle('/')} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/recruitment-requests" className={getClassName} style={getNavLinkStyle('/recruitment-requests')} end>
        <FiFileText size={18} /> Quản lý yêu cầu
      </NavLink>
      <NavLink to="/job-postings" className={getClassName} style={getNavLinkStyle('/job-postings')}>
        <FiRepeat size={18} /> Tin tuyển dụng
      </NavLink>
      <NavLink to="/candidates" className={getClassName} style={getNavLinkStyle('/candidates')} end>
        <FiUsers size={18} /> Quản lý ứng viên
      </NavLink>
      <NavLink to="/interview-schedules" className={getClassName} style={getNavLinkStyle('/interview-schedules')}>
        <FiCalendar size={18} /> Lịch phỏng vấn
      </NavLink>
    </div>
  );

  const renderApproverMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={getNavLinkStyle('/')} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/recruitment-requests/approvals" className={getClassName} style={getNavLinkStyle('/recruitment-requests/approvals')} end>
        <FiCalendar size={18} /> Duyệt yêu cầu
      </NavLink>
    </div>
  );

  const renderInterviewerMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={getNavLinkStyle('/')} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/interview-schedules" className={getClassName} style={getNavLinkStyle('/interview-schedules')}>
        <FiCalendar size={18} /> Lịch phỏng vấn
      </NavLink>
      <NavLink to="/competency-frameworks" className={getClassName} style={getNavLinkStyle('/competency-frameworks')}>
        <FiAward size={18} /> Khung năng lực
      </NavLink>
      <NavLink to="/questions" className={getClassName} style={getNavLinkStyle('/questions')}>
        <FiBookOpen size={18} /> Ngân hàng câu hỏi
      </NavLink>
    </div>
  );

  const renderStandardMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={getNavLinkStyle('/')} end>
        <FiHome size={18} /> Tổng quan
      </NavLink>

      {(isHiringManager || isRecruiterRole) && (
        <NavLink to="/recruitment-requests" className={getClassName} style={getNavLinkStyle('/recruitment-requests')} end>
          <FiFileText size={18} /> Quản lý yêu cầu
        </NavLink>
      )}

      {isRecruiterRole && (
        <NavLink to="/job-postings" className={getClassName} style={getNavLinkStyle('/job-postings')}>
          <FiRepeat size={18} /> Tin tuyển dụng
        </NavLink>
      )}

      {(isRecruiterRole || isHrManager) && (
        <NavLink to="/candidates" className={getClassName} style={getNavLinkStyle('/candidates')}>
          <FiUsers size={18} /> Quản lý ứng viên
        </NavLink>
      )}

      {interviewAccess(user).canView && (
        <NavLink to="/interview-schedules" className={getClassName} style={getNavLinkStyle('/interview-schedules')}>
          <FiCalendar size={18} /> Lịch phỏng vấn
        </NavLink>
      )}
    </div>
  );

  return (
    <aside className="sidebar" style={{ background: '#111827', color: '#cbd5e1', width: '260px', display: 'flex', flexDirection: 'column' }}>
      <div className="sidebar-header" style={{ padding: '24px 20px', borderBottom: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(79,70,229,0.3)'
            }}
          >
            {getLogoIcon()}
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0, fontWeight: '800', letterSpacing: '0.5px' }}>
              TechCorp
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0', fontWeight: '500', letterSpacing: '0.3px' }}>
              {getSubtitle()}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isAdmin ? renderAdminMenu() : (isHrManager ? renderHrMenu() : (isApprover ? renderApproverMenu() : (isHiringManager ? renderHiringManagerMenu() : (isRecruiterRole ? renderRecruiterMenu() : (isInterviewer ? renderInterviewerMenu() : renderStandardMenu())))))}

        <div style={{ borderTop: '1px solid #1f2937', padding: '12px 0', marginTop: 'auto' }}>
          {isAdmin && (
            <NavLink to="/audit-logs" style={getNavLinkStyle('/audit-logs')} className={getClassName}>
              <FiClock size={18} /> Nhật ký hoạt động
            </NavLink>
          )}
          {!isAdmin && sectionHeader('TÀI KHOẢN')}
          <NavLink to="/profile/edit" style={getNavLinkStyle('/profile/edit')} className={getClassName}>
            <FiUser size={18} /> Hồ sơ cá nhân
          </NavLink>
          <NavLink to="/change-password" style={getNavLinkStyle('/change-password')} className={getClassName}>
            <FiLock size={18} /> Đổi mật khẩu
          </NavLink>
          <div onClick={handleLogout} style={{ ...navLinkStyle({ isActive: false }), cursor: 'pointer' }}>
            <FiLogOut size={18} /> Đăng xuất
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
