import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
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
          r.role_name.toLowerCase().includes('trưởng phòng ns') ||
          r.role_name.toLowerCase().includes('tp nhân sự') ||
          r.role_name.toLowerCase().includes('tp ns') ||
          r.role_name.toLowerCase().includes('hr manager')
        ))
    ) ||
    (user?.job_title && (
      user.job_title.toLowerCase().includes('trưởng phòng nhân sự') ||
      user.job_title.toLowerCase().includes('trưởng phòng ns') ||
      user.job_title.toLowerCase().includes('tp nhân sự') ||
      user.job_title.toLowerCase().includes('tp ns') ||
      user.job_title.toLowerCase().includes('hr manager')
    )) ||
    user?.company_email === 'dtc245200002@ictu.edu.vn'
  );
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #60a5fa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.4)'
            }}
          >
            T
          </div>

          <div>
            <h2
              style={{
                fontSize: '1.15rem',
                color: '#f8fafc',
                margin: 0,
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}
            >
              TechCorp
            </h2>

            <p
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                margin: 0,
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Hệ Thống Nội Bộ
            </p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '24px 12px' }}>

        {/* Tổng quan */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
          end
        >
          <span style={{ marginRight: '10px' }}>📊</span>
          Tổng Quan
        </NavLink>
        {(user?.roles?.some(r => r.role_code === 'HIRING_MANAGER' || r.role_code === 'RECRUITER') || user?.job_title?.toLowerCase().includes('trưởng bộ phận')) && (
          <NavLink 
            to="/recruitment-requests" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            end
          >
            <span style={{ marginRight: '10px' }}>📝</span> Quản lý Yêu Cầu
          </NavLink>
        )}

        {(user?.roles?.some(r => r.role_code === 'RECRUITER' || r.role_code === 'HR_MANAGER')) && (
          <NavLink 
            to="/candidates" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span style={{ marginRight: '10px' }}>🧑‍💼</span> Quản lý Ứng viên
          </NavLink>
        )}
        
        {(user?.roles?.some(r => r.role_code === 'APPROVER') || user?.job_title?.toLowerCase().includes('người phê duyệt')) && (
          <NavLink 
            to="/recruitment-requests/approvals" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span style={{ marginRight: '10px' }}>✅</span> Duyệt Yêu Cầu
          </NavLink>
        )}

        {(user?.roles?.some(r => r.role_code === 'HR_MANAGER')) && (
          <>
            <NavLink 
              to="/company-profile" 
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span style={{ marginRight: '10px' }}>🏢</span> Hồ sơ Công ty
            </NavLink>
            <NavLink 
              to="/master-data" 
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span style={{ marginRight: '10px' }}>📋</span> Danh mục hệ thống
            </NavLink>
          </>
        )}
        
        {/* Quản lý nhân sự */}
        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span style={{ marginRight: '10px' }}>👥</span>
            Quản Lý Nhân Sự
          </NavLink>
        )}

<<<<<<< HEAD
        {/* Quản lý phân quyền */}
        {isAdmin && (
          <NavLink
            to="/roles"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span style={{ marginRight: '10px' }}>🛡️</span>
            Quản Lý Phân Quyền
          </NavLink>
        )}

        {/* Báo cáo */}
        {isAdmin && (
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span style={{ marginRight: '10px' }}>📈</span>
            Báo Cáo Thống Kê
          </NavLink>
        )}

        {/* KHUNG NĂNG LỰC */}
        <NavLink
          to="/competency-frameworks"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <span style={{ marginRight: '10px' }}>📋</span>
          Khung Năng Lực
        </NavLink>

        {/* Ngân Hàng Câu Hỏi */}
        <NavLink 
          to="/questions" 
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <span style={{ marginRight: '10px' }}>❓</span> Ngân Hàng Câu Hỏi
        </NavLink>

        {/* Tài khoản */}
        <div
          style={{
            marginTop: '30px',
            marginBottom: '10px',
            padding: '0 24px',
            fontSize: '0.7rem',
            color: '#64748b',
            textTransform: 'uppercase',
            fontWeight: '700',
            letterSpacing: '1.5px'
          }}
        >
=======
        {isHrManager && (
          <NavLink 
            to="/positions" 
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span style={{ marginRight: '10px' }}>💼</span> Chức Danh & Dải Lương
          </NavLink>
        )}
        
        <div style={{ marginTop: '30px', marginBottom: '10px', padding: '0 24px', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1.5px' }}>
>>>>>>> origin/feature/DTC245200344-SCRUM-62
          Tài Khoản
        </div>

        {/* Đổi mật khẩu */}
        <NavLink
          to="/change-password"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          <span
            style={{
              marginRight: '12px',
              fontSize: '1.1rem'
            }}
          >
            🔑
          </span>
          Đổi Mật Khẩu
        </NavLink>

        {/* Đăng xuất */}
        <div
          className="nav-link"
          style={{ cursor: 'pointer' }}
          onClick={handleLogout}
        >
          <span style={{ marginRight: '10px' }}>🚪</span>
          Đăng Xuất
        </div>
      </nav>

      <div
        className="sidebar-footer"
        style={{
          padding: '20px',
          marginTop: 'auto',
          fontSize: '0.8rem',
          color: '#6b7280',
          borderTop: '1px solid #374151'
        }}
      >
        &copy; 2026 Nội Bộ
      </div>
    </aside>
  );
};

export default Sidebar;