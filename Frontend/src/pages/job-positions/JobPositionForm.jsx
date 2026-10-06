import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import jobPositionApi from '../../api/jobPositionApi';

const JobPositionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    position_code: '',
    position_name: '',
    position_level: '',
    min_salary: '',
    max_salary: '',
    description: '',
    status: 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchPosition();
    }
  }, [id]);

  const fetchPosition = async () => {
    setLoading(true);
    try {
      const res = await jobPositionApi.getById(id);
      const data = res.data.data;
      setFormData({
        position_code: data.position_code,
        position_name: data.position_name,
        position_level: data.position_level || '',
        min_salary: data.min_salary || '',
        max_salary: data.max_salary || '',
        description: data.description || '',
        status: data.status
      });
    } catch (err) {
      setError('Không thể tải thông tin chức danh.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        positionCode: formData.position_code,
        positionName: formData.position_name,
        positionLevel: formData.position_level,
        minSalary: formData.min_salary ? Number(formData.min_salary) : null,
        maxSalary: formData.max_salary ? Number(formData.max_salary) : null,
        description: formData.description,
        status: formData.status,
        
        // Match backend expecting snake_case for updates
        position_name: formData.position_name,
        position_level: formData.position_level,
        min_salary: formData.min_salary ? Number(formData.min_salary) : null,
        max_salary: formData.max_salary ? Number(formData.max_salary) : null
      };

      if (isEditMode) {
        await jobPositionApi.update(id, payload);
      } else {
        await jobPositionApi.create(payload);
      }
      navigate('/job-positions');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div>Đang tải...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            {isEditMode ? 'Cập Nhật Chức Danh' : 'Thêm Mới Chức Danh'}
          </h1>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.95rem' }}>
            {isEditMode ? 'Chỉnh sửa thông tin chức danh và khoảng lương' : 'Điền thông tin dưới đây để tạo chức danh mới'}
          </p>
        </div>
        <Link to="/job-positions" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600' }}>
          ⬅ Quay lại
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        {error && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Mã Chức Danh <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="position_code"
                value={formData.position_code}
                onChange={handleChange}
                required
                disabled={isEditMode}
                placeholder="VD: DEV, HR_MANAGER..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: isEditMode ? '#f8fafc' : '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', color: isEditMode ? '#94a3b8' : '#0f172a' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Tên Chức Danh <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="position_name"
                value={formData.position_name}
                onChange={handleChange}
                required
                placeholder="VD: Lập trình viên Backend..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Cấp Bậc
              </label>
              <input
                type="text"
                name="position_level"
                value={formData.position_level}
                onChange={handleChange}
                placeholder="VD: Fresher, Junior, Senior..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            
            {isEditMode && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                  Trạng Thái
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Tạm khóa</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💰</span> Khoảng Lương Chuẩn (VNĐ)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>Lương Tối Thiểu</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>₫</span>
                  <input
                    type="number"
                    name="min_salary"
                    value={formData.min_salary}
                    onChange={handleChange}
                    placeholder="VD: 10000000"
                    style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#475569' }}>Lương Tối Đa</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>₫</span>
                  <input
                    type="number"
                    name="max_salary"
                    value={formData.max_salary}
                    onChange={handleChange}
                    placeholder="VD: 30000000"
                    style={{ width: '100%', padding: '14px 16px 14px 40px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
              Mô tả chi tiết
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Nhập mô tả về chức danh công việc..."
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
            <Link to="/job-positions" style={{ padding: '14px 28px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: '600', textDecoration: 'none', transition: 'background 0.2s' }}>
              Hủy Bỏ
            </Link>
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Đang xử lý...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobPositionForm;
