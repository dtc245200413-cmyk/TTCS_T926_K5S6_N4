import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import userApi from '../../api/userApi';
import roleApi from '../../api/roleApi';
import { AuthContext } from '../../context/AuthContext';

import { FaIdCard, FaEnvelope, FaBuilding, FaUserShield, FaSave, FaArrowLeft } from 'react-icons/fa';

// Chỉ chấp nhận số di động Việt Nam: 03/05/07/08/09 + 8 số
// hoặc dạng quốc tế +84 + 9 số.
const VIETNAM_MOBILE_REGEX = /^(0[35789]\d{8}|\+84[35789]\d{8})$/;

const JOB_TITLES = [
  'Quản trị hệ thống',
  'Trưởng phòng',
  'Quản lý (Manager)',
  'Chuyên viên Tuyển dụng',
  'Trưởng nhóm (Leader)',
  'Chuyên viên (Specialist)',
  'Lập trình viên (Developer)',
  'Nhân viên (Staff)',
  'Thực tập sinh (Intern)'
];

/**
 * UserEdit component
 *
 * Props:
 *   isSelfEdit (bool) – when true, uses the /users/me endpoint so any
 *                       authenticated user can edit their own profile.
 *                       When false/omitted, uses /users/:id and requires admin.
 */
const UserEdit = ({ isSelfEdit = false }) => {
  const { id } = useParams(); // only used in admin mode
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    job_title: ''
  });
  const [originalUser, setOriginalUser] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allRoles, setAllRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);

  // Determine which user ID and API calls to use
  const targetId = isSelfEdit ? (currentUser?.user_id) : id;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let response;
        if (isSelfEdit) {
          response = await userApi.getMe();
        } else {
          response = await userApi.getById(id);
        }
        if (response.data.success) {
          const user = response.data.data;
          setOriginalUser(user);
          setUserRoles(user.roles || []);
          setFormData({
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            job_title: user.job_title || ''
          });

          if (!isSelfEdit) {
            const roleRes = await roleApi.getAll();
            if (roleRes.data.success) {
              setAllRoles(roleRes.data.data.roles || []);
            }
          }
        }
      } catch (err) {
        setStatus({
          type: 'error',
          message: err.response?.data?.message || 'Không thể tải thông tin nhân sự.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, isSelfEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    const fullName = formData.full_name.trim();
    const phone = formData.phone_number.trim();

    if (!fullName) {
      setStatus({ type: 'error', message: 'Họ tên không được để trống.' });
      return;
    }

    if (fullName.length > 150) {
      setStatus({ type: 'error', message: 'Họ tên không được vượt quá 150 ký tự.' });
      return;
    }

    if (formData.job_title.trim().length > 100) {
      setStatus({ type: 'error', message: 'Chức danh không được vượt quá 100 ký tự.' });
      return;
    }

    setSaving(true);
    try {
      // SCRUM-58: chỉ gửi 3 trường được phép chỉnh sửa.
      // Không gửi email, phòng ban, vai trò hoặc các trường hệ thống.
      const payload = {
        full_name: fullName,
        phone_number: phone,
        job_title: formData.job_title.trim()
      };

      let response;
      if (isSelfEdit) {
        response = await userApi.updateMe(payload);
      } else {
        response = await userApi.update(id, payload);
      }

      if (response.data.success) {
        setStatus({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
        // Refresh the global auth context so the top-bar shows updated name
        if (isSelfEdit) {
          await refreshUser();
          setTimeout(() => navigate('/'), 1000);
        } else {
          setTimeout(() => navigate(`/users/${id}`), 1000);
        }
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.toLowerCase().includes('số điện thoại')) {
        setStatus({
          type: 'error',
          message: 'Số điện thoại này đã được sử dụng. Vui lòng nhập số khác.'
        });
      } else {
        setStatus({
          type: 'error',
          message: err.response?.data?.message || 'Không thể cập nhật hồ sơ.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (roleId) => {
    try {
      const isAssigned = userRoles.some(r => r.role_id === roleId);
      if (isAssigned) {
        // Prevent revoking last ADMIN role if this is the only ADMIN role they have?
        // Let backend handle it, or we can prompt
        if (!window.confirm('Xác nhận thu hồi vai trò này?')) return;
        await userApi.revokeRole(targetId, roleId);
        setUserRoles(userRoles.filter(r => r.role_id !== roleId));
        setStatus({ type: 'success', message: 'Đã thu hồi vai trò thành công!' });
      } else {
        await userApi.assignRole(targetId, roleId);
        const roleToAdd = allRoles.find(r => r.role_id === roleId);
        setUserRoles([...userRoles, roleToAdd]);
        setStatus({ type: 'success', message: 'Đã gán vai trò thành công!' });
      }
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi thay đổi vai trò.');
    }
  };

  if (loading) return <div className="page-header">Đang tải...</div>;
  if (!originalUser) {
    return <div className="alert alert-error">{status.message || 'Không tìm thấy nhân sự.'}</div>;
  }

  const departmentName = originalUser.department?.department_name || 'Chưa phân phòng ban';
  const roleNames = originalUser.roles?.map((role) => role.role_name).filter(Boolean) || [];
  const backLink = isSelfEdit ? '/' : `/users/${id}`;
  const backLabel = isSelfEdit ? 'Quay lại trang chủ' : 'Hủy';

  return (
    <div className="g-page-container">
      <div className="g-card">
        <div className="g-page-header">
          <div>
            <h1 className="g-page-title">
              {isSelfEdit ? 'Hồ Sơ Cá Nhân' : 'Chỉnh Sửa Nhân Sự'}
            </h1>
            <p className="g-page-subtitle">
              {isSelfEdit ? 'Cập nhật thông tin liên lạc và chức danh hiển thị của bạn.' : `Đang chỉnh sửa hồ sơ của: ${originalUser.full_name}`}
            </p>
          </div>
        </div>
        {status.message && (
          <div style={{
            padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: '500',
            background: status.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: status.type === 'error' ? '#dc2626' : '#059669',
            borderLeft: `4px solid ${status.type === 'error' ? '#ef4444' : '#10b981'}`
          }}>
            {status.message}
          </div>
        )}

        {/* Thông tin quản trị (Read-only) */}
        <h2 className="g-card-title">Thông tin hệ thống</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '24px', 
          marginBottom: '24px' 
        }}>
          <InfoBox icon={<FaIdCard />} label="Mã nhân viên" value={originalUser.employee_code} />
          <InfoBox icon={<FaEnvelope />} label="Email" value={originalUser.company_email} />
          <InfoBox icon={<FaBuilding />} label="Phòng ban" value={departmentName} />
          {isSelfEdit && <InfoBox icon={<FaUserShield />} label="Vai trò" value={roleNames.length ? roleNames.join(', ') : 'Chưa được gán'} />}
        </div>
        
        <div style={{ 
          background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', 
          fontSize: '0.9rem', color: '#64748b', marginBottom: '32px', display: 'flex', gap: '12px', alignItems: 'center'
        }}>
          <FaUserShield style={{ color: '#94a3b8' }}/> 
          <span>{isSelfEdit ? 'Email, phòng ban và vai trò do hệ thống quản lý và không thể tự thay đổi tại đây.' : 'Email và phòng ban do đồng bộ hệ thống, chỉ HR/Admin cấp cao mới được đổi.'}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <h2 className="g-card-title">Thông tin cập nhật</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="full_name" className="g-form-label">Họ tên *</label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                maxLength={150}
                disabled={saving}
                required
                style={{ 
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none',
                  background: saving ? '#f8fafc' : '#fff'
                }}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="phone_number" className="g-form-label">Số điện thoại</label>
              <input
                id="phone_number"
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                maxLength={15}
                placeholder="0912345678 hoặc +84912345678"
                disabled={saving}
                style={{ 
                  padding: '10px 14px', borderRadius: '8px', 
                  border: `1px solid ${formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()) ? '#ef4444' : '#cbd5e1'}`, 
                  fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none',
                  background: saving ? '#f8fafc' : '#fff'
                }}
                onFocus={e => {
                  if (!(formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()))) {
                    e.target.style.borderColor = '#4f46e5';
                  }
                }}
                onBlur={e => {
                  if (!(formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()))) {
                    e.target.style.borderColor = '#cbd5e1';
                  }
                }}
              />
              {formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()) ? (
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam.</span>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>VD: 03/05/07/08/09 + 8 số</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="job_title" className="g-form-label">Chức danh hiển thị</label>
              <select
                id="job_title"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                disabled={saving}
                style={{ 
                  padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '0.95rem', color: '#0f172a', transition: 'all 0.2s', outline: 'none',
                  background: saving ? '#f8fafc' : '#fff', cursor: 'pointer'
                }}
                onFocus={e => e.target.style.borderColor = '#4f46e5'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              >
                <option value="">-- Chọn chức danh --</option>
                {formData.job_title && !JOB_TITLES.includes(formData.job_title) && (
                  <option value={formData.job_title}>{formData.job_title}</option>
                )}
                {JOB_TITLES.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
            <button 
              type="submit" 
              disabled={saving || (formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()))}
              style={{
                background: (saving || (formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()))) ? '#94a3b8' : '#4f46e5', 
                color: '#fff', border: 'none',
                padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold',
                cursor: (saving || (formData.phone_number && !VIETNAM_MOBILE_REGEX.test(formData.phone_number.trim()))) ? 'not-allowed' : 'pointer', 
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background 0.2s'
              }}
            >
              <FaSave /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            
            <Link 
              to={backLink} 
              style={{
                background: '#f1f5f9', color: '#475569', border: 'none', textDecoration: 'none',
                padding: '10px 20px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <FaArrowLeft /> {backLabel}
            </Link>
          </div>
        </form>
      </div>

      {!isSelfEdit && (
        <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#1e293b', margin: '0 0 8px 0' }}>Quản lý vai trò (Phân quyền)</h2>
          <p className="g-page-subtitle">
            Tích chọn hoặc bỏ chọn để gán/thu hồi vai trò cho nhân sự này. Cập nhật có hiệu lực ngay lập tức.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {allRoles.map(role => {
              const isChecked = userRoles.some(r => r.role_id === role.role_id);
              return (
                <label 
                  key={role.role_id}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
                    background: isChecked ? '#eff6ff' : '#f8fafc', 
                    border: `2px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '12px', cursor: 'pointer', minWidth: '220px',
                    transition: 'all 0.2s'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => handleToggleRole(role.role_id)}
                    style={{ width: '20px', height: '20px', accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: isChecked ? '#1d4ed8' : '#334155', fontSize: '1rem' }}>{role.role_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Mã: {role.role_code}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoBox = ({ icon, label, value }) => (
  <div style={{ 
    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
    background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' 
  }}>
    <div style={{ 
      width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', 
      color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ overflow: 'hidden' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  </div>
);

export default UserEdit;
