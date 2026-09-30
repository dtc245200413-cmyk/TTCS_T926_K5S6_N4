import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import userApi from '../../api/userApi';

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    job_title: '',
    department_id: ''
  });
  const [originalUser, setOriginalUser] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await userApi.getById(id);
        if (response.data.success) {
          const user = response.data.data;
          setOriginalUser(user);
          setFormData({
            full_name: user.full_name || '',
            phone_number: user.phone_number || '',
            job_title: user.job_title || '',
            department_id: user.department?.department_id || ''
          });
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'Failed to load user data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!formData.full_name) {
      setStatus({ type: 'error', message: 'Full Name is required.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        job_title: formData.job_title,
        department_id: formData.department_id ? parseInt(formData.department_id, 10) : null
      };

      const response = await userApi.update(id, payload);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'User updated successfully!' });
        setTimeout(() => navigate(`/users/${id}`), 1500);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setStatus({ type: 'error', message: err.response.data.message });
      } else {
        setStatus({ type: 'error', message: 'Failed to update user.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-header">Loading...</div>;
  if (!originalUser) return <div className="alert alert-error">{status.message || 'User not found.'}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Sửa Thông Tin Nhân Viên</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {status.message && (
          <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {status.message}
          </div>
        )}
        
        {/* Read-only fields context */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <p><strong>Mã NV:</strong> {originalUser.employee_code}</p>
          <p><strong>Email:</strong> {originalUser.company_email}</p>
          <p style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '5px' }}>
            * Không thể chỉnh sửa Email, Mã NV, Mật khẩu và Trạng thái tại đây.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Họ tên *</label>
              <input
                type="text"
                name="full_name"
                className="form-control"
                value={formData.full_name}
                onChange={handleChange}
                disabled={saving}
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
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Chức danh</label>
              <select
                name="job_title"
                className="form-control"
                value={formData.job_title}
                onChange={handleChange}
                disabled={saving}
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
                disabled={saving}
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
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Cập nhật'}
            </button>
            <Link to={`/users/${id}`} className="btn-secondary">Hủy</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEdit;
