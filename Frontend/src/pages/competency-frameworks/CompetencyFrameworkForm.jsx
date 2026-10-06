import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import competencyFrameworkApi from '../../api/competencyFrameworkApi';

const CompetencyFrameworkForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    framework_code: '',
    framework_name: '',
    description: ''
  });

  const [criteriaList, setCriteriaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode) {
      fetchFramework();
    } else {
      // Default initial criteria
      setCriteriaList([{ criteria_name: '', weight: '', description: '' }]);
    }
  }, [id]);

  const fetchFramework = async () => {
    setLoading(true);
    try {
      const res = await competencyFrameworkApi.getById(id);
      const data = res.data.data;
      setFormData({
        framework_code: data.framework_code,
        framework_name: data.framework_name,
        description: data.description || ''
      });
      if (data.criteria && data.criteria.length > 0) {
        setCriteriaList(data.criteria.map(c => ({
          criteria_name: c.criteria_name,
          weight: c.weight,
          description: c.description || ''
        })));
      } else {
        setCriteriaList([{ criteria_name: '', weight: '', description: '' }]);
      }
    } catch (err) {
      setError('Không thể tải thông tin khung năng lực.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCriteriaChange = (index, field, value) => {
    const newList = [...criteriaList];
    newList[index][field] = value;
    setCriteriaList(newList);
  };

  const addCriteria = () => {
    setCriteriaList([...criteriaList, { criteria_name: '', weight: '', description: '' }]);
  };

  const removeCriteria = (index) => {
    const newList = [...criteriaList];
    newList.splice(index, 1);
    setCriteriaList(newList);
  };

  const totalWeight = criteriaList.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const roundedTotal = Math.round(totalWeight * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate empty criteria
    if (criteriaList.length === 0) {
      setError('Phải có ít nhất 1 tiêu chí đánh giá.');
      setLoading(false);
      return;
    }

    for (let i = 0; i < criteriaList.length; i++) {
      if (!criteriaList[i].criteria_name || !criteriaList[i].weight) {
        setError(`Tiêu chí thứ ${i + 1} không được để trống Tên và Trọng số.`);
        setLoading(false);
        return;
      }
    }

    if (roundedTotal !== 100) {
      setError(`Tổng trọng số phải bằng chính xác 100%. Hiện tại là ${roundedTotal}%.`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        frameworkCode: formData.framework_code,
        frameworkName: formData.framework_name,
        description: formData.description,
        criteriaList: criteriaList,
        // for update support
        framework_name: formData.framework_name
      };

      if (isEditMode) {
        await competencyFrameworkApi.update(id, payload);
      } else {
        await competencyFrameworkApi.create(payload);
      }
      navigate('/competency-frameworks');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
            {isEditMode ? 'Cập Nhật Khung Năng Lực' : 'Khai Báo Khung Năng Lực'}
          </h1>
          <p style={{ color: '#64748b', marginTop: '8px', fontSize: '0.95rem' }}>
            {isEditMode ? 'Chỉnh sửa bộ tiêu chí đánh giá' : 'Tạo mới bộ tiêu chí đánh giá cho chức danh'}
          </p>
        </div>
        <Link to="/competency-frameworks" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: '600' }}>
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
          <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📄</span> Thông tin chung
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Mã Khung <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="framework_code"
                value={formData.framework_code}
                onChange={handleChange}
                required
                disabled={isEditMode}
                placeholder="VD: FW_DEV_BE"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: isEditMode ? '#f8fafc' : '#fff', fontSize: '1rem', outline: 'none', color: isEditMode ? '#94a3b8' : '#0f172a' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Tên Khung Năng Lực <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="framework_name"
                value={formData.framework_name}
                onChange={handleChange}
                required
                placeholder="VD: Khung năng lực Lập trình viên Backend..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Mô tả chi tiết
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                placeholder="Mô tả về bộ tiêu chí này..."
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
              ></textarea>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: '0', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎯</span> Bộ Tiêu Chí Đánh Giá
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: roundedTotal === 100 ? '#dcfce7' : '#fee2e2', padding: '8px 16px', borderRadius: '20px', border: `1px solid ${roundedTotal === 100 ? '#bbf7d0' : '#fecaca'}` }}>
                <span style={{ fontWeight: '600', color: roundedTotal === 100 ? '#166534' : '#991b1b' }}>Tổng trọng số:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: roundedTotal === 100 ? '#15803d' : '#b91c1c' }}>{roundedTotal}%</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '16px', marginBottom: '12px', fontWeight: '600', color: '#475569', fontSize: '0.9rem', padding: '0 8px' }}>
              <div>Tên tiêu chí <span style={{ color: '#ef4444' }}>*</span></div>
              <div>Trọng số (%) <span style={{ color: '#ef4444' }}>*</span></div>
              <div>Mô tả (Hướng dẫn chấm)</div>
              <div style={{ width: '40px' }}></div>
            </div>

            {criteriaList.map((criteria, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
                <input
                  type="text"
                  value={criteria.criteria_name}
                  onChange={(e) => handleCriteriaChange(index, 'criteria_name', e.target.value)}
                  placeholder="VD: Kỹ năng giải quyết vấn đề"
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={criteria.weight}
                    onChange={(e) => handleCriteriaChange(index, 'weight', e.target.value)}
                    placeholder="VD: 20"
                    required
                    style={{ width: '100%', padding: '12px 30px 12px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: '600' }}>%</span>
                </div>
                <textarea
                  value={criteria.description}
                  onChange={(e) => handleCriteriaChange(index, 'description', e.target.value)}
                  placeholder="Diễn giải cách cho điểm..."
                  rows="1"
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
                />
                <button
                  type="button"
                  onClick={() => removeCriteria(index)}
                  disabled={criteriaList.length === 1}
                  style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: criteriaList.length === 1 ? '#f1f5f9' : '#fee2e2', color: criteriaList.length === 1 ? '#cbd5e1' : '#ef4444', fontSize: '1.2rem', cursor: criteriaList.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  title="Xóa tiêu chí"
                >
                  ✖
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addCriteria}
              style={{ padding: '10px 20px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', fontWeight: '600', border: 'none', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }}
            >
              <span>+</span> Thêm Tiêu Chí
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
            <Link to="/competency-frameworks" style={{ padding: '14px 28px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: '600', textDecoration: 'none', transition: 'background 0.2s' }}>
              Hủy Bỏ
            </Link>
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Đang xử lý...' : 'Lưu Khung Năng Lực'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompetencyFrameworkForm;
