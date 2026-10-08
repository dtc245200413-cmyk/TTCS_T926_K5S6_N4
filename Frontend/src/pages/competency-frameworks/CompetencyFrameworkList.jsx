import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import competencyFrameworkApi from '../../api/competencyFrameworkApi';
import { AuthContext } from '../../context/AuthContext';

const CompetencyFrameworkList = () => {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { hasPermission, user } = useContext(AuthContext);

  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // =========================================================
  // PHÂN QUYỀN
  // =========================================================

  // Có COMPETENCY_VIEW -> được xem khung năng lực
  const canView = hasPermission('COMPETENCY_VIEW');

  // Có COMPETENCY_MANAGE -> được thêm / sửa / xóa
  const canManage = hasPermission('COMPETENCY_MANAGE');
  const canCreate = user?.roles?.some(
    (role) => role.role_code === 'HR_MANAGER'
  );

  // =========================================================
  // LẤY DANH SÁCH KHUNG NĂNG LỰC
  // =========================================================

  const fetchFrameworks = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};

      if (search) {
        params.search = search;
      }

      const response = await competencyFrameworkApi.getAll(params);

      if (response.data.success) {
        const list = Array.isArray(response.data.data?.data)
          ? response.data.data.data
          : Array.isArray(response.data.data)
            ? response.data.data
            : [];

        setFrameworks(list);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Lỗi khi tải danh sách khung năng lực.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchFrameworks();
    } else {
      setLoading(false);
    }

    // eslint-disable-next-line
  }, [canView]);

  // =========================================================
  // TÌM KIẾM
  // =========================================================

  const handleSearch = (e) => {
    e.preventDefault();

    if (!canView) {
      return;
    }

    fetchFrameworks();
  };

  // =========================================================
  // LÀM MỚI
  // =========================================================

  const handleReset = () => {
    setSearch('');
    setLoading(true);

    if (!canView) {
      setLoading(false);
      return;
    }

    competencyFrameworkApi
      .getAll({})
      .then((res) => {
        const list = Array.isArray(res.data?.data?.data)
          ? res.data.data.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

        setFrameworks(list);
        setError('');
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          'Lỗi khi tải danh sách khung năng lực.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // =========================================================
  // XÓA KHUNG NĂNG LỰC
  // =========================================================

  const handleDelete = async (framework) => {
    if (!canManage) {
      setError(
        'Bạn không có quyền quản lý khung năng lực.'
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa khung năng lực "${framework.framework_code} - ${framework.framework_name}" không?\n\nThao tác này sẽ xóa khung năng lực khỏi hệ thống.`
    );

    if (!confirmDelete) {
      return;
    }

    setDeletingId(framework.framework_id);
    setError('');

    try {
      await competencyFrameworkApi.delete(
        framework.framework_id
      );

      setFrameworks((prev) =>
        prev.filter(
          (item) =>
            item.framework_id !== framework.framework_id
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Không thể xóa khung năng lực.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // KHÔNG CÓ QUYỀN XEM
  // =========================================================

  if (!canView) {
    return (
      <div
        style={{
          padding: '60px 40px',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: '4rem',
            marginBottom: '20px'
          }}
        >
          🔒
        </div>

        <h2
          style={{
            color: '#1e293b',
            marginBottom: '10px'
          }}
        >
          Không có quyền truy cập
        </h2>

        <p
          style={{
            color: '#64748b',
            margin: 0
          }}
        >
          Bạn không có quyền xem khung năng lực.
          <br />
          Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </p>
      </div>
    );
  }

  // =========================================================
  // GIAO DIỆN
  // =========================================================

  return (
    <div>
      {/* PAGE HEADER */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.5px',
              margin: 0
            }}
          >
            Khung Năng Lực
          </h1>

          <p
            style={{
              color: '#64748b',
              margin: '4px 0 0 0',
              fontSize: '0.95rem'
            }}
          >
            Quản lý các bộ tiêu chí đánh giá cho chức danh
          </p>
        </div>

        {/* CHỈ NGƯỜI CÓ COMPETENCY_MANAGE MỚI ĐƯỢC THÊM */}
        {canCreate && (
          <Link
            to="/competency-frameworks/create"
            className="btn-primary"
            style={{
              width: 'auto',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              boxShadow:
                '0 10px 20px -10px rgba(59,130,246,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
            >
              +
            </span>

            Thêm Khung Mới
          </Link>
        )}
      </div>

      {/* SEARCH */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '24px',
          boxShadow:
            '0 10px 30px -10px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0'
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              flex: '1 1 320px',
              position: 'relative'
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '1.1rem'
              }}
            >
              🔍
            </span>

            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên khung năng lực..."
              className="form-control"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{
                background: '#f8fafc',
                padding: '12px 16px 12px 48px',
                height: '48px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '0.95rem',
                width: '100%'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '0 24px',
              height: '48px',
              borderRadius: '12px',
              margin: 0
            }}
          >
            Tìm kiếm
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            style={{
              padding: '0 24px',
              height: '48px',
              borderRadius: '12px',
              margin: 0
            }}
          >
            Làm mới
          </button>
        </form>
      </div>

      {/* ERROR */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#64748b'
            }}
          >
            Đang tải dữ liệu...
          </div>
        ) : frameworks.length === 0 ? (
          <div
            style={{
              padding: '60px 40px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '3rem',
                marginBottom: '16px'
              }}
            >
              📭
            </div>

            <h3
              style={{
                color: '#1e293b',
                marginBottom: '8px'
              }}
            >
              Không có khung năng lực nào
            </h3>

            <p
              style={{
                color: '#64748b'
              }}
            >
              Hiện chưa có khung năng lực nào.
            </p>
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

                  {/* CHỈ HIỆN THAO TÁC KHI CÓ QUYỀN QUẢN LÝ */}
                  {canManage && (
                    <th>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {frameworks.map((fw) => (
                  <tr key={fw.framework_id}>
                    <td>
                      <span
                        style={{
                          fontWeight: '600',
                          color: '#334155'
                        }}
                      >
                        {fw.framework_code}
                      </span>
                    </td>

                    <td>
                      {fw.framework_name}
                    </td>

                    <td>
                      <span className="badge badge-success">
                        {Array.isArray(fw.criteria)
                          ? fw.criteria.length
                          : 0}
                      </span>
                    </td>

                    <td
                      style={{
                        maxWidth: '300px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {fw.description || '-'}
                    </td>

                    {/* CHỈ CÓ THỂ SỬA / XÓA KHI CÓ MANAGE */}
                    {canManage && (
                      <td>
                        <Link
                          to={`/competency-frameworks/${fw.framework_id}/edit`}
                          className="action-link"
                          style={{
                            marginRight: '16px'
                          }}
                        >
                          Sửa
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(fw)
                          }
                          disabled={
                            deletingId ===
                            fw.framework_id
                          }
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            color:
                              deletingId ===
                              fw.framework_id
                                ? '#94a3b8'
                                : '#ef4444',
                            cursor:
                              deletingId ===
                              fw.framework_id
                                ? 'not-allowed'
                                : 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          {deletingId ===
                          fw.framework_id
                            ? 'Đang xóa...'
                            : 'Xóa'}
                        </button>
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
