import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import userApi from '../../api/userApi';
import { AuthContext } from '../../context/AuthContext';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useContext(AuthContext);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');

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
    // Need to trigger fetch again without filters. 
    // State updates are async, so we pass empty params directly.
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Quản Lý Nhân Sự</h1>
        {hasPermission('USER_CREATE') && (
          <Link to="/users/create" className="btn-primary" style={{ width: 'auto', textDecoration: 'none' }}>
            + Thêm Nhân Viên
          </Link>
        )}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <form onSubmit={handleSearch} className="filter-form">
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <input
              type="text"
              placeholder="Tìm theo tên, email, hoặc mã nhân viên..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Trạng thái (Tất cả)</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
              <option value="INACTIVE">Vô hiệu</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
             {/* Note: In a real app, departments would be fetched dynamically */}
            <select
              className="form-control"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Phòng ban (Tất cả)</option>
              <option value="1">Công Nghệ (IT)</option>
              <option value="2">Nhân Sự (HR)</option>
              <option value="3">Tài Chính (Finance)</option>
              <option value="4">Kinh Doanh (Sales/Marketing)</option>
              <option value="5">Vận Hành (Operations)</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Tìm kiếm</button>
          <button type="button" className="btn-secondary" onClick={handleReset}>Làm mới</button>
        </form>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải danh sách...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Phòng ban</th>
                  <th>Chức danh</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Không tìm thấy nhân viên nào.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.user_id}>
                      <td style={{ fontWeight: 500, color: '#3b82f6' }}>{u.employee_code}</td>
                      <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                      <td>{u.company_email}</td>
                      <td>{u.department ? u.department.department_name : 'N/A'}</td>
                      <td>{u.job_title || 'N/A'}</td>
                      <td>
                        <span className={getStatusBadgeClass(u.status)}>
                          {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'LOCKED' ? 'Đã khóa' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/users/${u.user_id}`} className="action-link">Xem</Link>
                        {hasPermission('USER_UPDATE') && (
                          <Link to={`/users/${u.user_id}/edit`} className="action-link" style={{ marginLeft: '12px' }}>Sửa</Link>
                        )}
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
