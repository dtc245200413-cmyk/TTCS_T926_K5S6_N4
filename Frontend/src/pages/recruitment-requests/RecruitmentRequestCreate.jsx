import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaSave, FaPaperPlane } from 'react-icons/fa';

const RecruitmentRequestCreate = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    department_id: '',
    position_id: '',
    headcount: '',
    reason: 'Thay thế',
    proposed_salary_min: '',
    proposed_salary_max: '',
    needed_by_date: '',
    job_description: '',
    candidate_requirements: '',
    salary_explanation: '',
    work_location_code: '',
    work_type_code: '',
  });

  const [locations, setLocations] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [deptRes, posRes, masterDataRes] = await Promise.all([
        axios.get('http://localhost:3000/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/api/job-positions', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:3000/api/master-data', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (deptRes.data.success) {
        const deptData = deptRes.data.data;
        setDepartments(Array.isArray(deptData) ? deptData : (deptData.departments || []));
      }
      if (posRes.data.success) {
        const posData = posRes.data.data;
        setPositions(Array.isArray(posData) ? posData : (posData.data || []));
      }
      if (masterDataRes.data.success) {
        const mdData = masterDataRes.data.data;
        const md = Array.isArray(mdData) ? mdData : (mdData.data || mdData.items || []);
        setLocations(md.filter(x => x.category_group === 'WORK_LOCATION' && x.is_active));
        setWorkTypes(md.filter(x => x.category_group === 'WORK_TYPE' && x.is_active));
      }
    } catch (err) {
      console.error('Error fetching form data', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    setError(null);
  };

  const getSelectedPosition = () => {
    if (!formData.position_id) return null;
    return positions.find(p => p.position_id.toString() === formData.position_id);
  };

  const isSalaryOutsideStandard = () => {
    const pos = getSelectedPosition();
    if (!pos) return false;
    const minProp = Number(formData.proposed_salary_min);
    const maxProp = Number(formData.proposed_salary_max);
    const stdMin = Number(pos.min_salary);
    const stdMax = Number(pos.max_salary);

    if (minProp && stdMin && minProp < stdMin) return true;
    if (maxProp && stdMax && maxProp > stdMax) return true;
    if (minProp && stdMax && minProp > stdMax) return true;
    return false;
  };

  const validateForm = (status) => {
    const newErrors = {};

    // Validate salary ranges if provided
    if (formData.proposed_salary_min && Number(formData.proposed_salary_min) < 0) {
      newErrors.proposed_salary_min = 'Không được âm';
    }
    if (formData.proposed_salary_max && Number(formData.proposed_salary_max) < 0) {
      newErrors.proposed_salary_max = 'Không được âm';
    }
    if (formData.proposed_salary_min && formData.proposed_salary_max && Number(formData.proposed_salary_min) > Number(formData.proposed_salary_max)) {
      newErrors.proposed_salary_max = 'Phải lớn hơn hoặc bằng mức từ';
    }

    if (formData.needed_by_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const neededDate = new Date(formData.needed_by_date);
      if (neededDate < today) newErrors.needed_by_date = 'Không được trong quá khứ';
    }

    if (status === 'PENDING') {
      if (!formData.department_id) newErrors.department_id = 'Bắt buộc chọn phòng ban';
      if (!formData.position_id) newErrors.position_id = 'Bắt buộc chọn chức danh';
      if (!formData.headcount || Number(formData.headcount) <= 0) newErrors.headcount = 'Bắt buộc nhập số lượng lớn hơn 0';
      if (!formData.reason) newErrors.reason = 'Bắt buộc chọn lý do';
      if (!formData.needed_by_date) newErrors.needed_by_date = 'Bắt buộc chọn ngày';
      if (!formData.work_location_code) newErrors.work_location_code = 'Bắt buộc chọn địa điểm';
      if (!formData.work_type_code) newErrors.work_type_code = 'Bắt buộc chọn hình thức làm việc';
      
      if (!formData.job_description) newErrors.job_description = 'Bắt buộc nhập mô tả công việc';
      if (!formData.candidate_requirements) newErrors.candidate_requirements = 'Bắt buộc nhập yêu cầu ứng viên';

      if (isSalaryOutsideStandard() && !formData.salary_explanation) {
        newErrors.salary_explanation = 'Bắt buộc nhập giải trình khi lương ngoài chuẩn';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (status) => {
    const validationErrors = validateForm(status);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError('Vui lòng kiểm tra lại các trường bị lỗi.');
      window.scrollTo(0, 0);
      return;
    }

    setLoading(true);
    setError(null);
    setErrors({});
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        status: status,
        headcount: formData.headcount ? parseInt(formData.headcount) : null,
        proposed_salary_min: formData.proposed_salary_min ? parseInt(formData.proposed_salary_min) : null,
        proposed_salary_max: formData.proposed_salary_max ? parseInt(formData.proposed_salary_max) : null,
      };

      await axios.post('http://localhost:3000/api/recruitment-requests', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/recruitment-requests');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu yêu cầu.');
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)', backgroundColor: '#f8fafc', backgroundSize: '20px 20px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#4f46e5', padding: '16px 24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px', display: 'flex' }}>✨</span> 
              Tạo yêu cầu tuyển dụng
            </h2>
            <p className="g-page-subtitle">Điền các thông tin cần thiết để đăng tuyển vị trí mới</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <FaArrowLeft /> Quay lại
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '10px 16px', borderRadius: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            
            {/* Phòng ban */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                🏢 Phòng ban <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="department_id" 
                value={formData.department_id} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.department_id ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
              {errors.department_id && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.department_id}</span>}
            </div>
            
            {/* Chức danh */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                👔 Chức danh <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="position_id" 
                value={formData.position_id} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.position_id ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Chọn chức danh --</option>
                {positions.map(p => (
                  <option key={p.position_id} value={p.position_id}>{p.position_name}</option>
                ))}
              </select>
              {errors.position_id && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.position_id}</span>}
            </div>

            {/* Số lượng cần tuyển */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                👥 Số lượng tuyển <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="number" 
                name="headcount" 
                value={formData.headcount} 
                onChange={handleChange} 
                min="1" 
                placeholder="VD: 2"
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.headcount ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none' }}
              />
              {errors.headcount && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.headcount}</span>}
            </div>

            {/* Lý do tuyển */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                🎯 Lý do tuyển <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="reason" 
                value={formData.reason} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.reason ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Thay thế">Thay thế</option>
                <option value="Tăng mới">Tăng mới</option>
              </select>
              {errors.reason && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.reason}</span>}
            </div>

            {/* Ngày cần người */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                📅 Ngày cần người <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="date" 
                name="needed_by_date" 
                value={formData.needed_by_date} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.needed_by_date ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none' }}
              />
              {errors.needed_by_date && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.needed_by_date}</span>}
            </div>

            {/* Địa điểm làm việc */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                📍 Địa điểm <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="work_location_code" 
                value={formData.work_location_code} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.work_location_code ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Chọn địa điểm --</option>
                {locations.map(loc => (
                  <option key={loc.code} value={loc.code}>{loc.name}</option>
                ))}
              </select>
              {errors.work_location_code && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.work_location_code}</span>}
            </div>

            {/* Hình thức làm việc */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                ⏱ Hình thức <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select 
                name="work_type_code" 
                value={formData.work_type_code} 
                onChange={handleChange} 
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.work_type_code ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Chọn hình thức --</option>
                {workTypes.map(type => (
                  <option key={type.code} value={type.code}>{type.name}</option>
                ))}
              </select>
              {errors.work_type_code && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.work_type_code}</span>}
            </div>
            
            {/* Dải lương đề xuất */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>💰 Mức lương (VNĐ/tháng)</span>
                <span style={{ fontSize: '0.65rem', color: '#4f46e5' }}>
                  {getSelectedPosition() ? `Chuẩn: ${Number(getSelectedPosition().min_salary || 0).toLocaleString()} - ${Number(getSelectedPosition().max_salary || 0).toLocaleString()}` : ''}
                </span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    name="proposed_salary_min" 
                    placeholder="Từ..." 
                    value={formData.proposed_salary_min} 
                    onChange={handleChange} 
                    style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.proposed_salary_min ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', width: '100%' }}
                  />
                  {errors.proposed_salary_min && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.proposed_salary_min}</div>}
                </div>
                <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>-</span>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    name="proposed_salary_max" 
                    placeholder="Đến..." 
                    value={formData.proposed_salary_max} 
                    onChange={handleChange} 
                    style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.proposed_salary_max ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', width: '100%' }}
                  />
                  {errors.proposed_salary_max && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.proposed_salary_max}</div>}
                </div>
              </div>
            </div>

            {/* Giải trình lương ngoài chuẩn (nếu có) */}
            {isSalaryOutsideStandard() && (
              <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  ⚠️ Giải trình lương ngoài chuẩn <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea 
                  name="salary_explanation" 
                  rows="1" 
                  value={formData.salary_explanation} 
                  onChange={handleChange}
                  placeholder="Lý do đề xuất mức lương nằm ngoài khung chuẩn..."
                  style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.salary_explanation ? '#ef4444' : '#fca5a5'}`, background: '#fef2f2', fontSize: '0.9rem', color: '#1e293b', outline: 'none', resize: 'vertical' }}
                ></textarea>
                {errors.salary_explanation && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.salary_explanation}</span>}
              </div>
            )}

            {/* Mô tả công việc */}
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                📝 Mô tả công việc
              </label>
              <textarea 
                name="job_description" 
                rows="2" 
                value={formData.job_description} 
                onChange={handleChange}
                placeholder="Nhập mô tả chi tiết công việc..."
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.job_description ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', resize: 'vertical' }}
              ></textarea>
              {errors.job_description && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.job_description}</span>}
            </div>

            {/* Yêu cầu ứng viên */}
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                🎓 Yêu cầu ứng viên
              </label>
              <textarea 
                name="candidate_requirements" 
                rows="2" 
                value={formData.candidate_requirements} 
                onChange={handleChange}
                placeholder="Kinh nghiệm, kỹ năng, trình độ..."
                style={{ padding: '8px 12px', borderRadius: '10px', border: `1px solid ${errors.candidate_requirements ? '#ef4444' : '#cbd5e1'}`, background: '#f8fafc', fontSize: '0.9rem', color: '#1e293b', outline: 'none', resize: 'vertical' }}
              ></textarea>
              {errors.candidate_requirements && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{errors.candidate_requirements}</span>}
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              onClick={() => handleSubmit('DRAFT')} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#f8fafc')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.background = 'white')}
            >
              <FaSave /> Lưu Nháp
            </button>
            <button 
              onClick={() => handleSubmit('PENDING')} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#4f46e5', border: 'none', color: 'white', padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)' }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <FaPaperPlane /> {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Tuyển Dụng'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RecruitmentRequestCreate;
