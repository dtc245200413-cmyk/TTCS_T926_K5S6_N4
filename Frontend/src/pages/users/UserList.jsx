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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Quản Lý Nhân Sự</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Quản lý danh sách và quyền hạn của nhân viên</p>
        </div>
        {hasPermission('USER_CREATE') && (
          <Link to="/users/create" className="btn-primary" style={{ width: 'auto', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 20px -10px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Thêm Nhân Viên
          </Link>
        )}
      </div>

      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, hoặc mã nhân viên..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: '#f8fafc', padding: '12px 16px 12px 48px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 190px' }}>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ background: '#f8fafc', padding: '12px 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.95rem', width: '100%' }}
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
              style={{ background: '#f8fafc', padding: '12px 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.95rem', width: '100%' }}
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
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px', height: '48px', margin: 0, borderRadius: '12px', fontWeight: 'bold' }}>Tìm kiếm</button>
            <button type="button" className="btn-secondary" onClick={handleReset} style={{ height: '48px', padding: '0 20px', display: 'flex', alignItems: 'center', borderRadius: '12px', fontWeight: '600', color: '#64748b', background: '#f1f5f9', border: 'none' }}>Làm mới</button>
          </div>
        </form>
      </div>

      <div>
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
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔍</div>
                      <div>Không tìm thấy nhân viên nào phù hợp.</div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.user_id}>
                      <td style={{ fontWeight: 700, color: '#4f46e5', letterSpacing: '0.5px' }}>{u.employee_code}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
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
                          <Link to={`/users/${u.user_id}`} style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', background: '#eff6ff', transition: 'all 0.2s' }}>Xem</Link>
                          {hasPermission('USER_UPDATE') && (
                            <Link to={`/users/${u.user_id}/edit`} style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', background: '#ecfdf5', transition: 'all 0.2s' }}>Sửa</Link>
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
