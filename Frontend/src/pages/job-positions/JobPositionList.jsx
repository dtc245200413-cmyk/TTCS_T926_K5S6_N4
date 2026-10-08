import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import jobPositionApi from '../../api/jobPositionApi';
import { AuthContext } from '../../context/AuthContext';

const JobPositionList = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useContext(AuthContext);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchPositions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;

      const response = await jobPositionApi.getAll(params);
      if (response.data.success) {
        setPositions(response.data.data.data);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách chức danh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPositions();
  };

  const handleReset = () => {
    setSearch('');
    setStatus('');
    setLoading(true);
    jobPositionApi.getAll({})
      .then(res => setPositions(res.data.data.data))
      .catch(() => setError('Lỗi khi tải danh sách chức danh.'))
      .finally(() => setLoading(false));
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Quản Lý Chức Danh</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Quản lý chức danh và khoảng lương chuẩn</p>
        </div>
        {hasPermission('USER_CREATE') && (
          <Link to="/job-positions/create" className="btn-primary" style={{ width: 'auto', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 20px -10px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Thêm Chức Danh
          </Link>
        )}
      </div>

      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên chức danh..."
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
              style={{ background: '#f8fafc', padding: '12px 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', cursor: 'pointer', width: '100%' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Vô hiệu hóa</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0 24px', height: '48px', borderRadius: '12px', margin: 0 }}>Tìm kiếm</button>
          <button type="button" onClick={handleReset} className="btn-secondary" style={{ padding: '0 24px', height: '48px', borderRadius: '12px', margin: 0 }}>Làm mới</button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : positions.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Không tìm thấy chức danh nào</h3>
            <p style={{ color: '#64748b' }}>Thử thay đổi bộ lọc hoặc thêm mới.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã CD</th>
                  <th>Tên Chức Danh</th>
                  <th>Cấp Bậc</th>
                  <th>Khoảng Lương</th>
                  <th>Trạng Thái</th>
                  {hasPermission('USER_UPDATE') && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.position_id}>
                    <td><span style={{ fontWeight: '600', color: '#334155' }}>{pos.position_code}</span></td>
                    <td>{pos.position_name}</td>
                    <td>{pos.position_level || '-'}</td>
                    <td>
                      {formatCurrency(pos.min_salary)} - {formatCurrency(pos.max_salary)}
                    </td>
                    <td>
                      <span className={`badge ${pos.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {pos.status === 'ACTIVE' ? 'HOẠT ĐỘNG' : 'TẠM KHÓA'}
                      </span>
                    </td>
                    {hasPermission('USER_UPDATE') && (
                      <td>
                        <Link to={`/job-positions/${pos.position_id}/edit`} className="action-link" style={{ marginRight: '16px' }}>
                          Sửa
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPositionList;
