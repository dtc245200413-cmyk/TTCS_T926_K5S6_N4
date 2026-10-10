import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const CandidateCreate = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    source_code: '',
    recruitment_request_id: ''
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/master-data', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const md = response.data.data;
        setSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE' && x.is_active));
      } catch (err) {
        console.error(err);
      }
    };
    
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/recruitment-requests/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Sàng lọc các yêu cầu đã được duyệt
        setRequests(response.data.data.filter(r => r.status === 'APPROVED'));
      } catch (err) {
        console.error(err);
      }
    };

    fetchMasterData();
    fetchRequests();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.source_code) {
      setError('Vui lòng nhập Họ tên, Email và chọn Nguồn ứng viên');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/candidates', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/candidates');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo ứng viên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#10b981', padding: '20px 24px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Thêm Hồ sơ Ứng viên</h2>
            <p className="g-page-subtitle">Nhập thông tin ứng viên mới vào hệ thống</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
          >
            <FaArrowLeft style={{ marginRight: '6px' }}/> Quay lại
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', fontWeight: '500' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Họ và tên <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="VD: Nguyễn Văn A"
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="VD: nva@gmail.com"
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Số điện thoại</label>
              <input 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="VD: 0987654321"
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Nguồn ứng viên (Master Data) <span style={{ color: '#ef4444' }}>*</span></label>
              <select 
                name="source_code"
                value={formData.source_code}
                onChange={handleChange}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#1e293b', fontWeight: '600' }}
              >
                <option value="">-- Chọn nguồn --</option>
                {sources.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>Gắn vào Yêu cầu tuyển dụng (Job Request)</label>
              <select 
                name="recruitment_request_id"
                value={formData.recruitment_request_id}
                onChange={handleChange}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="">-- Chọn yêu cầu (Không bắt buộc) --</option>
                {requests.map(r => (
                  <option key={r.id} value={r.id}>#{r.id} - {r.position_name} ({r.department_name})</option>
                ))}
              </select>
            </div>
            
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
             <button 
              type="submit"
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}
            >
              <FaSave /> {loading ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateCreate;
