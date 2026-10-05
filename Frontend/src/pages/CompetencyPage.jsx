import React, { useState, useEffect } from 'react';
import competencyApi from '../api/competencyApi';
import { FaPlus, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function CompetencyPage() {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState([
    { criterion_name: '', weight: 40, description: '' },
    { criterion_name: '', weight: 60, description: '' }
  ]);

  // Tính tổng trọng số
  const totalWeight = criteria.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isValidWeight = totalWeight === 100;

  useEffect(() => {
    fetchCompetencies();
  }, []);

  const fetchCompetencies = async () => {
    try {
      setLoading(true);
      const res = await competencyApi.getAll();
      setCompetencies(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCriterion = () => {
    setCriteria([...criteria, { criterion_name: '', weight: 0, description: '' }]);
  };

  const handleRemoveCriterion = (index) => {
    if (criteria.length <= 1) {
      alert('Khung năng lực cần có ít nhất 1 tiêu chí.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index, field, value) => {
    const updated = [...criteria];
    updated[index][field] = field === 'weight' ? Number(value) : value;
    setCriteria(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim() || !position.trim()) {
      setErrorMsg('Vui lòng nhập tên khung năng lực và chức danh/vị trí.');
      return;
    }

    if (!isValidWeight) {
      setErrorMsg(`Tổng trọng số hiện tại là ${totalWeight}%. Bắt buộc phải bằng đúng 100%!`);
      return;
    }

    const payload = {
      title,
      position,
      description,
      criteria
    };

    try {
      await competencyApi.create(payload);
      setSuccessMsg('Khai báo khung năng lực thành công!');
      setTitle('');
      setPosition('');
      setDescription('');
      setCriteria([
        { criterion_name: '', weight: 50, description: '' },
        { criterion_name: '', weight: 50, description: '' }
      ]);
      fetchCompetencies();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi tạo khung năng lực.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khung năng lực này?')) {
      try {
        await competencyApi.delete(id);
        fetchCompetencies();
      } catch (err) {
        alert(err.response?.data?.message || 'Không thể xóa');
      }
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        Quản lý Khung Năng Lực & Tiêu Chí (SCRUM-70)
      </h2>

      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          <FaExclamationTriangle style={{ marginRight: '8px' }} /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#15803d', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
          <FaCheckCircle style={{ marginRight: '8px' }} /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '32px' }}>
        <h3 style={{ marginTop: 0 }}>Thêm mới Khung Năng Lực</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Tên Khung Năng Lực *</label>
            <input
              type="text"
              placeholder="VD: Khung năng lực Lập trình viên Node.js"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Chức Danh / Vị Trí *</label>
            <input
              type="text"
              placeholder="VD: Backend Developer"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>Mô tả</label>
          <textarea
            rows="2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Danh sách Tiêu chí Đánh giá</h4>
            <div style={{ 
              fontWeight: 'bold', 
              color: isValidWeight ? '#16a34a' : '#dc2626',
              background: isValidWeight ? '#dcfce7' : '#fee2e2',
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              Tổng trọng số: {totalWeight}% {isValidWeight ? '(Hợp lệ)' : '(Phải bằng 100%)'}
            </div>
          </div>

          {criteria.map((item, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Tên tiêu chí (VD: Kiến thức SQL)"
                value={item.criterion_name}
                onChange={(e) => handleCriterionChange(index, 'criterion_name', e.target.value)}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="%"
                  value={item.weight}
                  onChange={(e) => handleCriterionChange(index, 'weight', e.target.value)}
                  style={{ width: '80px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  required
                />
                <span style={{ marginLeft: '6px' }}>%</span>
              </div>
              <input
                type="text"
                placeholder="Mô tả ngắn tiêu chí"
                value={item.description}
                onChange={(e) => handleCriterionChange(index, 'description', e.target.value)}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <button
                type="button"
                onClick={() => handleRemoveCriterion(index)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
              >
                <FaTrash />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddCriterion}
            style={{ marginTop: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaPlus /> Thêm tiêu chí
          </button>
        </div>

        <button
          type="submit"
          disabled={!isValidWeight}
          style={{
            background: isValidWeight ? '#2563eb' : '#94a3b8',
            color: '#ffffff',
            padding: '10px 24px',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: isValidWeight ? 'pointer' : 'not-allowed'
          }}
        >
          Lưu Khung Năng Lực
        </button>
      </form>

      <h3>Danh sách Khung Năng Lực Hiện Có</h3>
      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px' }}>ID</th>
              <th style={{ padding: '12px' }}>Tên Khung Năng Lực</th>
              <th style={{ padding: '12px' }}>Vị Trí</th>
              <th style={{ padding: '12px' }}>Số tiêu chí</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {competencies.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Chưa có dữ liệu</td>
              </tr>
            ) : (
              competencies.map((comp) => (
                <tr key={comp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px' }}>#{comp.id}</td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{comp.title}</td>
                  <td style={{ padding: '12px' }}>{comp.position}</td>
                  <td style={{ padding: '12px' }}>{comp.criteria?.length || comp.criteria_count || 0}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}