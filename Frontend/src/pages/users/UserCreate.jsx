import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import userApi from '../../api/userApi';

const UserCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    company_email: '',
    password: '',
    phone_number: '',
    job_title: '',
    department_id: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!formData.employee_code || !formData.full_name || !formData.company_email || !formData.password) {
      setStatus({ type: 'error', message: 'Employee Code, Full Name, Email, and Password are required.' });
      return;
    }

    setLoading(true);
    try {
      // Backend expects department_id as integer or null
      const payload = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null
      };

      const response = await userApi.create(payload);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'User created successfully!' });
        setTimeout(() => navigate('/users'), 1500);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setStatus({ type: 'error', message: err.response.data.message }); // Handles duplicate email/code
      } else {
        setStatus({ type: 'error', message: 'Failed to create user.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Thêm Nhân Viên Mới</h1>
      </div>

      <div className="card" style={{ width: '100%' }}>
        {status.message && (
          <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Mã NV *</label>
              <input
                type="text"
                name="employee_code"
                className="form-control"
                value={formData.employee_code}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Họ tên *</label>
              <input
                type="text"
                name="full_name"
                className="form-control"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="company_email"
                className="form-control"
                value={formData.company_email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Mật khẩu khởi tạo *</label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="text"
                name="phone_number"
                className="form-control"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Chức danh</label>
              <select
                name="job_title"
                className="form-control"
                value={formData.job_title}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">-- Chọn chức danh --</option>
                <option value="Quản trị hệ thống">Quản trị hệ thống</option>
                <option value="Trưởng phòng">Trưởng phòng</option>
                <option value="Quản lý (Manager)">Quản lý (Manager)</option>
                <option value="Chuyên viên Tuyển dụng">Chuyên viên Tuyển dụng</option>
                <option value="Trưởng nhóm (Leader)">Trưởng nhóm (Leader)</option>
                <option value="Chuyên viên (Specialist)">Chuyên viên (Specialist)</option>
                <option value="Lập trình viên (Developer)">Lập trình viên (Developer)</option>
                <option value="Nhân viên (Staff)">Nhân viên (Staff)</option>
                <option value="Thực tập sinh (Intern)">Thực tập sinh (Intern)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Phòng ban</label>
              <select
                name="department_id"
                className="form-control"
                value={formData.department_id}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Không có</option>
                <option value="1">Công Nghệ (IT)</option>
                <option value="2">Nhân Sự (HR)</option>
                <option value="3">Tài Chính (Finance)</option>
                <option value="4">Kinh Doanh (Sales/Marketing)</option>
                <option value="5">Vận Hành (Operations)</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button type="submit" className="g-btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Thêm Nhân Viên'}
            </button>
            <Link to="/users" className="btn-secondary">Hủy</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserCreate;
