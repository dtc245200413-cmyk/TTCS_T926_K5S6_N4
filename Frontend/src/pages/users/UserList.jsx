import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FiUserPlus, FiSearch, FiDownload, FiInfo } from 'react-icons/fi';
import userApi from '../../api/userApi';
import authApi from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useContext(AuthContext);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  // New state for modal/action status
  const [actionMessage, setActionMessage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (departmentId) params.departmentId = departmentId;
      // Pagination can be added later

      const response = await userApi.getAll(params);
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setDepartmentId('');
    setLoading(true);
    userApi.getAll({})
      .then(res => setUsers(res.data.data.users))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  };

  const getStatusBadgeClass = (statusStr) => {
    if (statusStr === 'ACTIVE') return 'badge badge-success';
    if (statusStr === 'LOCKED') return 'badge badge-error';
    if (statusStr === 'INACTIVE') return 'badge badge-warning';
    return 'badge';
  };

  return (
    <div>
      <div className="g-page-header">
        <div>
          <h1 className="g-page-title">Quản Lý Nhân Sự</h1>
          <p className="g-page-subtitle">Quản lý danh sách và quyền hạn của nhân viên</p>
        </div>
        {hasPermission('USER_CREATE') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/users/import" className="g-btn-secondary">
              <FiDownload style={{ fontSize: "1.2rem" }}/> Nhập từ Excel
            </Link>
            <Link to="/users/create" className="g-btn-primary">
              <FiUserPlus style={{ fontSize: "1.2rem" }}/> Thêm Nhân Viên
            </Link>
          </div>
        )}
      </div>

      <div className="g-card" style={{ padding: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <FiSearch style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1.1rem" }}/>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, hoặc mã nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="g-form-input" style={{ paddingLeft: '48px' }}
            />
          </div>
          <div style={{ flex: '0 0 190px' }}>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="g-form-input"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="INACTIVE">Vô hiệu hóa</option>
            </select>
          </div>
          <div style={{ flex: '0 0 190px' }}>
            <select
              className="form-control"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="g-form-input"
            >
              <option value="">Tất cả phòng ban</option>
              <option value="1">Công Nghệ (IT)</option>
              <option value="2">Nhân Sự (HR)</option>
              <option value="3">Tài Chính</option>
              <option value="4">Kinh Doanh</option>
              <option value="5">Vận Hành</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="g-btn-primary">Tìm kiếm</button>
            <button type="button" className="g-btn-secondary" onClick={handleReset} >Làm mới</button>
          </div>
        </form>
      </div>

      <div>
        {error && <div className="alert alert-error">{error}</div>}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải danh sách...</div>
        ) : (
          <div className="table-responsive">
            {actionMessage && (
              <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
                {actionMessage}
              </div>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Phòng ban</th>
                  <th>Chức danh</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                      <FiInfo style={{ fontSize: "3rem", marginBottom: "10px", color: "#cbd5e1" }}/>
                      <div>Không tìm thấy nhân viên nào phù hợp.</div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.user_id}>
                      <td style={{ fontWeight: 700, color: '#4f46e5', letterSpacing: '0.5px' }}>{u.employee_code}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>{u.full_name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.company_email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#475569', fontWeight: 600 }}>{u.department ? u.department.department_name : 'N/A'}</td>
                      <td style={{ color: '#475569' }}>{u.job_title || 'N/A'}</td>
                      <td>
                        <span className={getStatusBadgeClass(u.status)}>
                          {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Đã khóa' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <Link to={`/users/${u.user_id}`} className="btn-action-view">Xem</Link>
                          {hasPermission('USER_UPDATE') && (
                            <Link to={`/users/${u.user_id}/edit`} className="btn-action-edit">Sửa</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
