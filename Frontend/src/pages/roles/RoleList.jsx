import React, { useState, useEffect } from 'react';
import roleApi from '../../api/roleApi';

const permissionGroups = [
  {
    id: 'recruitment',
    name: 'Quy trình Tuyển dụng',
    children: [
      { id: 'org', name: 'Danh mục tổ chức & vị trí' },
      { id: 'req', name: 'Yêu cầu tuyển dụng' },
      { id: 'job', name: 'Tin tuyển dụng' },
      { id: 'candidate', name: 'Hồ sơ ứng viên & pipeline' },
      { id: 'interview', name: 'Lịch phỏng vấn' },
      { id: 'assessment', name: 'Phiếu đánh giá' },
      { id: 'offer', name: 'Offer & onboarding' }
    ]
  },
  {
    id: 'system',
    name: 'Hệ thống & Cấu hình',
    children: [
      { id: 'email', name: 'Email & thông báo' },
      { id: 'report', name: 'Báo cáo & dashboard' },
      { id: 'user', name: 'Người dùng & nhật ký' }
    ]
  }
];

const defaultMatrix = {
  CANDIDATE: {
    org: '-', req: '-', job: 'R', candidate: 'R*', interview: 'R*', assessment: '-', offer: 'R*', email: 'R*', report: '-', user: '-'
  },
  INTERVIEWER: {
    org: 'R', req: '-', job: '-', candidate: 'R*', interview: 'R*', assessment: 'W*', offer: '-', email: 'R*', report: '-', user: '-'
  },
  HIRING_MANAGER: {
    org: 'R', req: 'W*', job: 'R', candidate: 'R*', interview: 'R*', assessment: 'R*', offer: 'R*', email: 'R*', report: 'R*', user: '-'
  },
  RECRUITER: {
    org: 'R', req: 'W', job: 'W', candidate: 'F', interview: 'F', assessment: 'R', offer: 'W', email: 'F', report: 'R*', user: '-'
  },
  APPROVER: {
    org: 'R', req: 'W*', job: 'R', candidate: 'R', interview: '-', assessment: 'R', offer: 'W*', email: '-', report: 'R', user: '-'
  },
  HR_MANAGER: {
    org: 'F', req: 'F', job: 'F', candidate: 'F', interview: 'F', assessment: 'F', offer: 'F', email: 'F', report: 'F', user: 'R'
  },
  ADMIN: {
    org: 'F', req: 'F', job: 'F', candidate: 'F', interview: 'F', assessment: 'F', offer: 'F', email: 'F', report: 'F', user: 'F'
  }
};

const accessColors = {
  'F': { bg: '#dcfce7', text: '#166534', label: 'F (Toàn quyền)' },
  'W': { bg: '#fef08a', text: '#854d0e', label: 'W (Ghi)' },
  'W*': { bg: '#fef08a', text: '#854d0e', label: 'W* (Ghi cá nhân)' },
  'R': { bg: '#dbeafe', text: '#1e40af', label: 'R (Chỉ xem)' },
  'R*': { bg: '#dbeafe', text: '#1e40af', label: 'R* (Xem cá nhân)' },
  '-': { bg: '#f1f5f9', text: '#475569', label: '- (Không)' }
};

const Badge = ({ val }) => {
  const style = accessColors[val] || accessColors['-'];
  return (
    <span style={{ 
      backgroundColor: style.bg, color: style.text, 
      padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', minWidth: '32px', textAlign: 'center', display: 'inline-block' 
    }}>
      {val}
    </span>
  );
};

const AccessLegend = () => (
  <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#475569', marginBottom: '24px' }}>
    <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Chú thích phân quyền:</h4>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="F" /> <span><b>Toàn quyền</b>: Có thể xem, sửa, xóa, duyệt trên mọi dữ liệu.</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="W" /> <span><b>Quyền ghi</b>: Ghi (tạo mới, sửa) trong phạm vi được giao.</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="W*" /> <span><b>Quyền ghi (Cá nhân)</b>: Ghi, nhưng <i>chỉ trên dữ liệu của chính mình</i>.</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="R" /> <span><b>Chỉ xem</b>: Xem toàn bộ dữ liệu trong module.</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="R*" /> <span><b>Chỉ xem (Cá nhân)</b>: Xem, nhưng <i>chỉ trên dữ liệu của chính mình</i>.</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Badge val="-" /> <span><b>Không truy cập</b>: Không có quyền truy cập vào module.</span></div>
    </div>
  </div>
);

const AccessSelect = ({ value, onChange }) => {
  const currentStyle = accessColors[value] || accessColors['-'];
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      style={{
        backgroundColor: currentStyle.bg,
        color: currentStyle.text,
        border: '1px solid transparent',
        borderRadius: '6px',
        padding: '6px',
        fontWeight: '700',
        cursor: 'pointer',
        outline: 'none',
        width: '100%',
        textAlign: 'center'
      }}
    >
      {Object.entries(accessColors).map(([key, style]) => (
        <option key={key} value={key} style={{ backgroundColor: '#fff', color: '#111827' }}>
          {style.label}
        </option>
      ))}
    </select>
  );
};

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // permissions state structure: { [role_id]: { [module_id]: 'F' | 'W' ... } }
  const [permissions, setPermissions] = useState({});

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleApi.getAll();
      if (response.data.success) {
        const rolesData = response.data.data;
        setRoles(rolesData);
        
        // Initialize permissions from defaultMatrix
        const initPerms = {};
        rolesData.forEach(role => {
          const roleCode = role.role_code;
          const defaultData = defaultMatrix[roleCode] || {};
          const rolePerms = {};
          
          permissionGroups.forEach(group => {
            group.children.forEach(child => {
              rolePerms[child.id] = defaultData[child.id] || '-';
            });
          });
          initPerms[role.role_id] = rolePerms;
        });
        setPermissions(initPerms);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách chức danh.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    const roleName = window.prompt('Nhập tên chức danh/role mới (Ví dụ: Trưởng nhóm Kế toán, Chuyên viên MKT):');
    if (!roleName) return;
    
    // Tạo mã code ngẫu nhiên dựa trên tên (viết hoa không dấu thay khoảng trắng bằng gạch dưới)
    let roleCode = roleName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (!roleCode) roleCode = 'ROLE_' + Date.now();

    try {
      await roleApi.create({
        role_code: roleCode,
        role_name: roleName,
        description: 'Chức danh mới tạo từ giao diện'
      });
      alert('Thêm chức danh thành công!');
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thêm chức danh.');
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chức danh "${roleName}" không?`)) return;
    try {
      await roleApi.delete(roleId);
      alert('Xóa chức danh thành công!');
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xóa chức danh.');
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handlePermissionChange = (roleId, moduleId, newValue) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [moduleId]: newValue
      }
    }));
  };

  const handleSaveAll = () => {
    alert('Đã lưu thành công cấu hình phân quyền cho tất cả chức danh!');
    console.log("Dữ liệu phân quyền sẽ gửi lên API:", permissions);
    // await roleApi.updateAllPermissions(permissions);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Đang tải danh sách...</div>;
  }

  return (
    <div className="page-container">
      <div className="g-page-header">
        <h1 className="page-title">Quản Lý Phân Quyền</h1>
        <button className="btn-primary" onClick={handleAddRole} style={{ width: 'auto', padding: '12px 24px', margin: 0 }}>+ Thêm Chức danh</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      <div className="card" style={{ padding: '24px' }}>
        <AccessLegend />
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>Module</th>
                {roles.map(r => (
                  <th key={r.role_id} style={{ textAlign: 'center', minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {r.role_name}
                      <button 
                        onClick={() => handleDeleteRole(r.role_id, r.role_name)}
                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        title="Xóa chức danh"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionGroups.map((group, gIdx) => (
                <React.Fragment key={group.id}>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td colSpan={roles.length + 1} style={{ fontWeight: 800, color: '#0f172a', padding: '16px 24px' }}>
                      {group.name}
                    </td>
                  </tr>
                  
                  {group.children.map((child) => (
                    <tr key={child.id}>
                      <td style={{ paddingLeft: '40px', fontWeight: 600, color: '#475569' }}>
                        {child.name}
                      </td>
                      {roles.map(r => (
                        <td key={r.role_id} style={{ textAlign: 'center' }}>
                          <AccessSelect 
                            value={permissions[r.role_id]?.[child.id] || '-'}
                            onChange={(newVal) => handlePermissionChange(r.role_id, child.id, newVal)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="g-btn-primary" onClick={handleSaveAll} >Lưu Toàn Bộ Bảng Quyền</button>
        </div>
      </div>
    </div>
  );
};

export default RoleList;
