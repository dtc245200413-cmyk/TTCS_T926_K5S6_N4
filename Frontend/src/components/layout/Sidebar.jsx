import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  FiGrid, FiUsers, FiUser, FiList, FiFileText, 
  FiShield, FiHome, FiShare2, FiBriefcase, 
  FiClipboard, FiEdit, FiCheckSquare, FiBookOpen, 
  FiClock, FiKey, FiLogOut, FiBell, FiBarChart2, FiCheckCircle
} from 'react-icons/fi';
import '../../styles/global.css';

const Sidebar = () => {
  const { hasPermission, logout, user } = useContext(AuthContext);
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
  
  const isHiringManager = user?.roles?.some(r => r.role_code === 'HIRING_MANAGER') || user?.job_title?.toLowerCase().includes('trưởng bộ phận');
  const isRecruiterRole = user?.roles?.some(r => r.role_code === 'RECRUITER') || user?.job_title?.toLowerCase().includes('tuyển dụng');
  const isApprover = user?.roles?.some(r => r.role_code === 'APPROVER') || user?.job_title?.toLowerCase().includes('người phê duyệt') || user?.job_title?.toLowerCase().includes('giám đốc');

  const getSubtitle = () => {
    if (isAdmin) return 'QUẢN TRỊ HỆ THỐNG';
    if (isHrManager) return 'TRƯỞNG PHÒNG NHÂN SỰ';
    if (isHiringManager) return 'TRƯỞNG BỘ PHẬN';
    if (isRecruiterRole) return 'NHÂN VIÊN TUYỂN DỤNG';
    return 'HỆ THỐNG NỘI BỘ';
  };
  
  const getLogoIcon = () => {
    if (isAdmin) return <FiShield size={20} />;
    if (isRecruiterRole && !isHrManager && !isAdmin) return <FiUsers size={20} />;
    return <FiHome size={20} />;
  };
  
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', margin: '4px 12px',
    borderRadius: '8px', textDecoration: 'none',
    color: isActive ? '#fff' : '#94a3b8',
    background: isActive ? '#2e325a' : 'transparent',
    fontWeight: isActive ? '600' : '500',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    border: 'none',
    boxShadow: 'none'
  });

  const getClassName = () => '';

  const [openMenus, setOpenMenus] = useState({
    account: true,
    org: true,
    recruit: true
  });

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', margin: '4px 12px',
    borderRadius: '8px', cursor: 'pointer',
    color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem',
    background: 'transparent', transition: 'all 0.2s', userSelect: 'none'
  };

  const sectionHeader = (text) => (
    <div style={{ padding: '0 24px', marginTop: '16px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
      {text}
    </div>
  );

  const renderAdminMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiGrid size={18} /> Tổng quan
      </NavLink>
      
      <NavLink to="/users" className={getClassName} style={navLinkStyle}>
        <FiUsers size={18} /> Quản lý nhân sự
      </NavLink>

      <div onClick={() => toggleMenu('account')} style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiUser size={18} /> Quản lý tài khoản
        </div>
        <span style={{ fontSize: '0.8rem', opacity: 0.7, transform: openMenus.account ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
      </div>
      {openMenus.account && (
        <div style={{ paddingLeft: '24px' }}>
          <NavLink to="/accounts" className={getClassName} style={navLinkStyle}>
            <FiList size={18} /> Danh sách tài khoản
          </NavLink>
          <NavLink to="/users/import" className={getClassName} style={navLinkStyle}>
            <FiFileText size={18} /> Nhập Excel hàng loạt
          </NavLink>
        </div>
      )}

      <NavLink to="/roles" className={getClassName} style={navLinkStyle}>
        <FiShield size={18} /> Quản lý phân quyền
      </NavLink>

      <div onClick={() => toggleMenu('org')} style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiHome size={18} /> Quản lý tổ chức
        </div>
        <span style={{ fontSize: '0.8rem', opacity: 0.7, transform: openMenus.org ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
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

      <div onClick={() => toggleMenu('recruit')} style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiClipboard size={18} /> Quản lý tuyển dụng
        </div>
        <span style={{ fontSize: '0.8rem', opacity: 0.7, transform: openMenus.recruit ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
      </div>
      {openMenus.recruit && (
        <div style={{ paddingLeft: '24px' }}>
          <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle}>
            <FiEdit size={18} /> Yêu cầu tuyển dụng
          </NavLink>
          <NavLink to="/competency-frameworks" className={getClassName} style={navLinkStyle}>
            <FiCheckSquare size={18} /> Khung năng lực
          </NavLink>
          <NavLink to="/questions" className={getClassName} style={navLinkStyle}>
            <FiBookOpen size={18} /> Ngân hàng câu hỏi
          </NavLink>
          <NavLink to="/master-data" className={getClassName} style={navLinkStyle}>
            <FiList size={18} /> Danh mục tuyển dụng
          </NavLink>
          <NavLink to="/company-profile" className={getClassName} style={navLinkStyle}>
            <FiHome size={18} /> Hồ sơ công ty
          </NavLink>
        </div>
      )}

      <NavLink to="/audit-logs" className={getClassName} style={navLinkStyle}>
        <FiClock size={18} /> Nhật ký hoạt động
      </NavLink>
    </div>
  );

  const renderHrMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiGrid size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/departments" className={getClassName} style={navLinkStyle}>
        <FiHome size={18} /> Quản lý phòng ban
      </NavLink>
      <NavLink to="/positions" className={getClassName} style={navLinkStyle}>
        <FiBriefcase size={18} /> Chức danh & dải lương
      </NavLink>
      <NavLink to="/competency-frameworks" className={getClassName} style={navLinkStyle}>
        <FiCheckSquare size={18} /> Khung năng lực
      </NavLink>
      <NavLink to="/questions" className={getClassName} style={navLinkStyle}>
        <FiBookOpen size={18} /> Ngân hàng câu hỏi
      </NavLink>
      <NavLink to="/master-data" className={getClassName} style={navLinkStyle}>
        <FiList size={18} /> Danh mục tuyển dụng
      </NavLink>
      <NavLink to="/company-profile" className={getClassName} style={navLinkStyle}>
        <FiFileText size={18} /> Hồ sơ công ty
      </NavLink>
    </div>
  );

  const renderRecruiterMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiGrid size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle} end>
        <FiEdit size={18} /> Quản lý yêu cầu
      </NavLink>
      <NavLink to="/candidates" className={getClassName} style={navLinkStyle}>
        <FiUsers size={18} /> Quản lý ứng viên
      </NavLink>
    </div>
  );

  const renderApproverMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiBarChart2 size={18} /> Tổng quan
      </NavLink>
      <NavLink to="/recruitment-requests/approvals" className={getClassName} style={navLinkStyle}>
        <FiCheckCircle size={18} /> Duyệt yêu cầu
      </NavLink>
    </div>
  );

  const renderStandardMenu = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 0', gap: '2px' }}>
      <NavLink to="/" className={getClassName} style={navLinkStyle} end>
        <FiGrid size={18} /> Tổng quan
      </NavLink>

      {(isHiringManager || isRecruiterRole) && (
        <NavLink to="/recruitment-requests" className={getClassName} style={navLinkStyle} end>
          <FiEdit size={18} /> Quản lý yêu cầu
        </NavLink>
      )}

      {(isRecruiterRole || isHrManager) && (
        <NavLink to="/candidates" className={getClassName} style={navLinkStyle}>
          <FiUsers size={18} /> Quản lý ứng viên
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
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {getSubtitle()}
            </p>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isAdmin ? renderAdminMenu() : (isHrManager ? renderHrMenu() : (isRecruiterRole ? renderRecruiterMenu() : (isApprover ? renderApproverMenu() : renderStandardMenu())))}

        <div style={{ borderTop: '1px solid #1f2937', padding: '16px 0', marginTop: 'auto' }}>
          {sectionHeader('TÀI KHOẢN')}
          <NavLink to="/profile/edit" style={navLinkStyle} className={getClassName}>
            <FiUser size={18} color="#c084fc" /> Hồ sơ cá nhân
          </NavLink>
          <NavLink to="/change-password" style={navLinkStyle} className={getClassName}>
            <FiKey size={18} color="#eab308" /> Đổi mật khẩu
          </NavLink>
          <div onClick={handleLogout} style={{ ...navLinkStyle({ isActive: false }), cursor: 'pointer' }}>
            <FiLogOut size={18} color="#f97316" /> Đăng xuất
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
