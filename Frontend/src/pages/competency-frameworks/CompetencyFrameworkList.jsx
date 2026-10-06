import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import competencyFrameworkApi from '../../api/competencyFrameworkApi';
import { AuthContext } from '../../context/AuthContext';

const CompetencyFrameworkList = () => {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useContext(AuthContext);

  const [search, setSearch] = useState('');

  const fetchFrameworks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;

      const response = await competencyFrameworkApi.getAll(params);
      if (response.data.success) {
        setFrameworks(response.data.data.data);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách khung năng lực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworks();
    // eslint-disable-next-line
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFrameworks();
  };

  const handleReset = () => {
    setSearch('');
    setLoading(true);
    competencyFrameworkApi.getAll({})
      .then(res => setFrameworks(res.data.data.data))
      .catch(() => setError('Lỗi khi tải danh sách khung năng lực.'))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Khung Năng Lực</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Quản lý các bộ tiêu chí đánh giá cho chức danh</p>
        </div>
        {hasPermission('USER_CREATE') && (
          <Link to="/competency-frameworks/create" className="btn-primary" style={{ width: 'auto', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 20px -10px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Thêm Khung Mới
          </Link>
        )}
      </div>

      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên khung năng lực..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: '#f8fafc', padding: '12px 16px 12px 48px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', width: '100%' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0 24px', height: '48px', borderRadius: '12px', margin: 0 }}>Tìm kiếm</button>
          <button type="button" onClick={handleReset} className="btn-secondary" style={{ padding: '0 24px', height: '48px', borderRadius: '12px', margin: 0 }}>Làm mới</button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : frameworks.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Không có khung năng lực nào</h3>
            <p style={{ color: '#64748b' }}>Thêm khung năng lực mới để sử dụng trong quá trình phỏng vấn.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Khung</th>
                  <th>Tên Khung Năng Lực</th>
                  <th>Số Tiêu Chí</th>
                  <th>Mô tả</th>
                  {hasPermission('USER_UPDATE') && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {frameworks.map((fw) => (
                  <tr key={fw.framework_id}>
                    <td><span style={{ fontWeight: '600', color: '#334155' }}>{fw.framework_code}</span></td>
                    <td>{fw.framework_name}</td>
                    <td><span className="badge badge-success">{fw.criteria ? fw.criteria.length : 0}</span></td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {fw.description || '-'}
                    </td>
                    {hasPermission('USER_UPDATE') && (
                      <td>
                        <Link to={`/competency-frameworks/${fw.framework_id}/edit`} className="action-link" style={{ marginRight: '16px' }}>
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

export default CompetencyFrameworkList;
