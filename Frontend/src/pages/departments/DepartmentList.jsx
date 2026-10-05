import React, { useEffect, useState } from 'react';
import departmentApi from '../../api/departmentApi';
import axiosClient from '../../api/axiosClient';

function DepartmentList() {
  const [tree, setTree] = useState([]);
  const [flatDepartments, setFlatDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [form, setForm] = useState({
    department_code: '',
    department_name: '',
    description: '',
    parent_department_id: '',
    manager_user_id: '',
  });

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await departmentApi.getAll();

      if (response.data?.success) {
        setTree(response.data.data?.tree || []);
        setFlatDepartments(
          response.data.data?.departments || []
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể tải danh sách phòng ban.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axiosClient.get(
        '/users?limit=100'
      );

      setUsers(
        response.data?.data?.users || []
      );
    } catch (err) {
      console.error('Không thể tải danh sách nhân viên:', err);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm({
      department_code: '',
      department_name: '',
      description: '',
      parent_department_id: '',
      manager_user_id: '',
    });

    setEditingDepartment(null);
    setShowForm(false);
  };

  const openCreateForm = (parentId = '') => {
    setEditingDepartment(null);

    setForm({
      department_code: '',
      department_name: '',
      description: '',
      parent_department_id: parentId
        ? String(parentId)
        : '',
      manager_user_id: '',
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const openEditForm = (department) => {
    setEditingDepartment(department);

    setForm({
      department_code:
        department.department_code || '',
      department_name:
        department.department_name || '',
      description:
        department.description || '',
      parent_department_id:
        department.parent_department_id
          ? String(department.parent_department_id)
          : '',
      manager_user_id:
        department.manager_user_id
          ? String(department.manager_user_id)
          : '',
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setSuccess('');

      const payload = {
        department_code:
          form.department_code.trim(),
        department_name:
          form.department_name.trim(),
        description:
          form.description.trim() || null,
        parent_department_id:
          form.parent_department_id
            ? Number(form.parent_department_id)
            : null,
        manager_user_id:
          form.manager_user_id
            ? Number(form.manager_user_id)
            : null,
      };

      if (editingDepartment) {
        await departmentApi.update(
          editingDepartment.department_id,
          payload
        );

        setSuccess(
          'Cập nhật phòng ban thành công.'
        );
      } else {
        await departmentApi.create(payload);

        setSuccess(
          'Thêm phòng ban thành công.'
        );
      }

      resetForm();
      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Có lỗi xảy ra khi lưu phòng ban.'
      );
    }
  };

  const handleDeactivate = async (department) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn ngừng áp dụng phòng ban "${department.department_name}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      await departmentApi.deactivate(
        department.department_id
      );

      setSuccess(
        `Đã ngừng áp dụng "${department.department_name}".`
      );

      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể ngừng áp dụng phòng ban.'
      );
    }
  };

  const handleActivate = async (department) => {
    try {
      setError('');
      setSuccess('');

      await departmentApi.activate(
        department.department_id
      );

      setSuccess(
        `Đã kích hoạt lại "${department.department_name}".`
      );

      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể kích hoạt phòng ban.'
      );
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phòng ban "${department.department_name}"?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      await departmentApi.remove(
        department.department_id
      );

      setSuccess(
        `Đã xóa phòng ban "${department.department_name}".`
      );

      await loadDepartments();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Không thể xóa phòng ban.'
      );
    }
  };

  const renderTree = (departments, level = 0) => {
    return departments.map((department) => (
      <div key={department.department_id}>
        <div
          style={{
            marginLeft: `${level * 38}px`,
            padding: '18px 20px',
            marginBottom: '10px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderLeft:
              level > 0
                ? '4px solid #6366f1'
                : '1px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow:
              '0 2px 5px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <strong
                  style={{
                    fontSize: '1.08rem',
                    color: '#0f172a',
                  }}
                >
                  {level > 0 ? '↳ ' : '🏢 '}
                  {department.department_name}
                </strong>

                <span
                  style={{
                    color: '#64748b',
                  }}
                >
                  ({department.department_code})
                </span>

                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background:
                      department.status === 'ACTIVE'
                        ? '#dcfce7'
                        : '#fee2e2',
                    color:
                      department.status === 'ACTIVE'
                        ? '#15803d'
                        : '#b91c1c',
                  }}
                >
                  {department.status === 'ACTIVE'
                    ? 'ĐANG ÁP DỤNG'
                    : 'NGỪNG ÁP DỤNG'}
                </span>
              </div>

              {department.description && (
                <div
                  style={{
                    marginTop: '7px',
                    color: '#64748b',
                  }}
                >
                  {department.description}
                </div>
              )}

              <div
                style={{
                  marginTop: '7px',
                  color: '#64748b',
                  fontSize: '0.9rem',
                }}
              >
                Người phụ trách:{' '}
                <strong>
                  {department.manager_name ||
                    'Chưa chọn'}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '7px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() =>
                  openCreateForm(
                    department.department_id
                  )
                }
                style={buttonBlue}
              >
                + Phòng con
              </button>

              <button
                onClick={() =>
                  openEditForm(department)
                }
                style={buttonGray}
              >
                Sửa
              </button>

              {department.status === 'ACTIVE' ? (
                <button
                  onClick={() =>
                    handleDeactivate(department)
                  }
                  style={buttonOrange}
                >
                  Ngừng áp dụng
                </button>
              ) : (
                <button
                  onClick={() =>
                    handleActivate(department)
                  }
                  style={buttonGreen}
                >
                  Kích hoạt
                </button>
              )}

              <button
                onClick={() =>
                  handleDelete(department)
                }
                style={buttonRed}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>

        {department.children?.length > 0 &&
          renderTree(
            department.children,
            level + 1
          )}
      </div>
    ));
  };

  return (
    <div
      style={{
        padding: '28px',
        maxWidth: '1250px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '20px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '1.9rem',
            }}
          >
            Quản Lý Phòng Ban
          </h1>

          <p
            style={{
              color: '#64748b',
              marginTop: '6px',
            }}
          >
            Khai báo phòng ban, cơ cấu tổ chức và
            người phụ trách.
          </p>
        </div>

        <button
          onClick={() => openCreateForm()}
          style={{
            ...buttonBlue,
            padding: '11px 18px',
            fontSize: '0.95rem',
          }}
        >
          + Thêm Phòng Ban
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '13px 16px',
            borderRadius: '10px',
            border: '1px solid #fecaca',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: '16px',
            background: '#dcfce7',
            color: '#166534',
            padding: '13px 16px',
            borderRadius: '10px',
            border: '1px solid #bbf7d0',
          }}
        >
          ✓ {success}
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '22px',
            marginBottom: '24px',
            boxShadow:
              '0 8px 24px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '18px',
              color: '#0f172a',
            }}
          >
            {editingDepartment
              ? 'Sửa Phòng Ban'
              : 'Thêm Phòng Ban'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <div>
                <label style={labelStyle}>
                  Mã phòng ban *
                </label>

                <input
                  name="department_code"
                  value={form.department_code}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="VD: HR-REC"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Tên phòng ban *
                </label>

                <input
                  name="department_name"
                  value={form.department_name}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="VD: Tuyển dụng"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Phòng ban cha
                </label>

                <select
                  name="parent_department_id"
                  value={
                    form.parent_department_id
                  }
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">
                    -- Không có / Cấp cao nhất --
                  </option>

                  {flatDepartments
                    .filter(
                      (d) =>
                        !editingDepartment ||
                        d.department_id !==
                          editingDepartment.department_id
                    )
                    .map((department) => (
                      <option
                        key={
                          department.department_id
                        }
                        value={
                          department.department_id
                        }
                      >
                        {department.department_name} (
                        {department.department_code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Người phụ trách
                </label>

                <select
                  name="manager_user_id"
                  value={form.manager_user_id}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">
                    -- Chưa chọn --
                  </option>

                  {users.map((user) => (
                    <option
                      key={user.user_id}
                      value={user.user_id}
                    >
                      {user.full_name} -{' '}
                      {user.employee_code}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={labelStyle}>
                  Mô tả
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  style={{
                    ...inputStyle,
                    minHeight: '90px',
                    resize: 'vertical',
                  }}
                  placeholder="Mô tả chức năng của phòng ban..."
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '18px',
                display: 'flex',
                gap: '10px',
              }}
            >
              <button
                type="submit"
                style={buttonBlue}
              >
                {editingDepartment
                  ? 'Lưu Thay Đổi'
                  : 'Thêm Phòng Ban'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={buttonGray}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px',
            color: '#64748b',
          }}
        >
          Đang tải phòng ban...
        </div>
      ) : tree.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px',
            color: '#64748b',
          }}
        >
          Chưa có phòng ban.
        </div>
      ) : (
        renderTree(tree)
      )}
    </div>
  );
}

const formGrid = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
};

const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 700,
  color: '#334155',
  fontSize: '0.9rem',
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.95rem',
  background: '#fff',
};

const baseButton = {
  border: 'none',
  borderRadius: '8px',
  padding: '8px 12px',
  cursor: 'pointer',
  fontWeight: 700,
};

const buttonBlue = {
  ...baseButton,
  background: '#4f46e5',
  color: '#fff',
};

const buttonGray = {
  ...baseButton,
  background: '#e2e8f0',
  color: '#334155',
};

const buttonOrange = {
  ...baseButton,
  background: '#fff7ed',
  color: '#c2410c',
  border: '1px solid #fed7aa',
};

const buttonGreen = {
  ...baseButton,
  background: '#dcfce7',
  color: '#15803d',
  border: '1px solid #bbf7d0',
};

const buttonRed = {
  ...baseButton,
  background: '#fee2e2',
  color: '#b91c1c',
  border: '1px solid #fecaca',
};

export default DepartmentList;