import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import userApi from '../../api/userApi';

// Chỉ chấp nhận số di động Việt Nam: 03/05/07/08/09 + 8 số
// hoặc dạng quốc tế +84 + 9 số.
const VIETNAM_MOBILE_REGEX = /^(0[35789]\d{8}|\+84[35789]\d{8})$/;

const JOB_TITLES = [
  'Quản trị hệ thống',
  'Trưởng phòng',
  'Quản lý (Manager)',
  'Chuyên viên Tuyển dụng',
  'Trưởng nhóm (Leader)',
  'Chuyên viên (Specialist)',
  'Lập trình viên (Developer)',
  'Nhân viên (Staff)',
  'Thực tập sinh (Intern)'
];

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    job_title: ''
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
            job_title: user.job_title || ''
          });
        }
      } catch (err) {
        setStatus({
          type: 'error',
          message: err.response?.data?.message || 'Không thể tải thông tin nhân sự.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    const fullName = formData.full_name.trim();
    const phone = formData.phone_number.trim();

    if (!fullName) {
      setStatus({ type: 'error', message: 'Họ tên không được để trống.' });
      return;
    }

    if (fullName.length > 150) {
      setStatus({ type: 'error', message: 'Họ tên không được vượt quá 150 ký tự.' });
      return;
    }

    if (phone && !VIETNAM_MOBILE_REGEX.test(phone)) {
      setStatus({
        type: 'error',
        message: 'Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678.'
      });
      return;
    }

    if (formData.job_title.trim().length > 100) {
      setStatus({ type: 'error', message: 'Chức danh không được vượt quá 100 ký tự.' });
      return;
    }

    setSaving(true);
    try {
      // SCRUM-58: chỉ gửi 3 trường được phép chỉnh sửa.
      // Không gửi email, phòng ban, vai trò hoặc các trường hệ thống.
      const payload = {
        full_name: fullName,
        phone_number: phone,
        job_title: formData.job_title.trim()
      };

      const response = await userApi.update(id, payload);
      if (response.data.success) {
        setStatus({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
        setTimeout(() => navigate(`/users/${id}`), 1000);
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Không thể cập nhật hồ sơ.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-header">Đang tải...</div>;
  if (!originalUser) {
    return <div className="alert alert-error">{status.message || 'Không tìm thấy nhân sự.'}</div>;
  }

  const departmentName = originalUser.department?.department_name || 'Chưa phân phòng ban';
  const roleNames = originalUser.roles?.map((role) => role.role_name).filter(Boolean) || [];

  return (
    <div>
      <div className="page-header">
        <h1>Cập nhật hồ sơ cá nhân</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px' }}>
        {status.message && (
          <div className={`alert ${status.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {status.message}
          </div>
        )}

        {/* Các thông tin thuộc quyền quản trị được hiển thị nhưng không cho sửa. */}
        <div
          style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
            border: '1px solid #e5e7eb'
          }}
        >
          <p><strong>Mã nhân viên:</strong> {originalUser.employee_code}</p>
          <p><strong>Email:</strong> {originalUser.company_email}</p>
          <p><strong>Phòng ban:</strong> {departmentName}</p>
          <p><strong>Vai trò:</strong> {roleNames.length ? roleNames.join(', ') : 'Chưa được gán'}</p>
          <p style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
            * Email, phòng ban và vai trò do hệ thống/quản trị viên quản lý và không thể thay đổi tại đây.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="full_name">Họ tên *</label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                className="form-control"
                value={formData.full_name}
                onChange={handleChange}
                maxLength={150}
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone_number">Số điện thoại</label>
              <input
                id="phone_number"
                type="tel"
                name="phone_number"
                className="form-control"
                value={formData.phone_number}
                onChange={handleChange}
                maxLength={15}
                inputMode="tel"
                placeholder="0912345678 hoặc +84912345678"
                disabled={saving}
              />
              <small style={{ color: '#6b7280' }}>
                Định dạng số di động Việt Nam: 03/05/07/08/09 + 8 số.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="job_title">Chức danh hiển thị</label>
              <select
                id="job_title"
                name="job_title"
                className="form-control"
                value={formData.job_title}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">-- Chọn chức danh --</option>
                {formData.job_title && !JOB_TITLES.includes(formData.job_title) && (
                  <option value={formData.job_title}>{formData.job_title}</option>
                )}
                {JOB_TITLES.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
            </button>
            <Link to={`/users/${id}`} className="btn-secondary">Hủy</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEdit;
