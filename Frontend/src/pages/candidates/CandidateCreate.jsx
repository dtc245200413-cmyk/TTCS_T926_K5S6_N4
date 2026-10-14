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
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);

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
    if (name === 'email' || name === 'phone') setPossibleDuplicates([]);
  };

  const saveCandidate = async (primaryCandidate = null, allowDuplicate = Boolean(primaryCandidate)) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/candidates', {
        ...formData,
        allow_duplicate: allowDuplicate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const createdCandidate = response.data.data;
      if (primaryCandidate) {
        await axios.post('http://localhost:3000/api/candidates/merge', {
          primary_id: primaryCandidate.id,
          secondary_id: createdCandidate.id
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      navigate('/candidates');
    } catch (err) {
      if (err.response?.status === 409 && err.response.data.duplicates) {
        setPossibleDuplicates(err.response.data.duplicates);
        setError('Phát hiện hồ sơ trùng. Hãy so sánh trước khi tiếp tục.');
        return;
      }
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo ứng viên');
    } finally {
      setLoading(false);
    }
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
      const response = await axios.get('http://localhost:3000/api/candidates/duplicates', {
        params: { email: formData.email, phone: formData.phone },
        headers: { Authorization: `Bearer ${token}` }
      });
      const matches = response.data.data || [];
      if (matches.length) {
        setPossibleDuplicates(matches);
        return;
      }
      await saveCandidate();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kiểm tra hồ sơ trùng.');
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

        {possibleDuplicates.length > 0 && (
          <section style={{ display: 'grid', gap: 12, padding: 18, background: '#fff', border: '1px solid #fbbf24', borderRadius: 10 }}>
            <h3 style={{ margin: 0, color: '#92400e' }}>So sánh hồ sơ có thông tin trùng</h3>
            {possibleDuplicates.map(candidate => (
              <article key={candidate.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: 14, background: '#f8fafc' }}>
                  <strong>Hồ sơ hiện có #{candidate.id}</strong>
                  <p>Họ tên: {candidate.full_name}</p>
                  <p>Email: {candidate.email}</p>
                  <p>Điện thoại: {candidate.phone || 'Chưa có'}</p>
                  <p>Vị trí: {candidate.position_name || 'Chưa gắn yêu cầu'}</p>
                </div>
                <div style={{ padding: 14 }}>
                  <strong>Hồ sơ đang nhập</strong>
                  <p>Họ tên: {formData.full_name}</p>
                  <p>Email: {formData.email}</p>
                  <p>Điện thoại: {formData.phone || 'Chưa có'}</p>
                  <p>Vị trí: {requests.find(request => String(request.id) === String(formData.recruitment_request_id))?.position_name || 'Chưa gắn yêu cầu'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" disabled={loading} onClick={() => saveCandidate(candidate)} style={{ padding: '9px 12px', border: 0, borderRadius: 6, color: '#fff', background: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? 'Đang gộp...' : 'Giữ hồ sơ hiện có và gộp thông tin mới'}
                  </button>
                  <button type="button" disabled={loading} onClick={() => saveCandidate(null, true)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, color: '#334155', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Lưu riêng, không gộp
                  </button>
                </div>
              </article>
            ))}
          </section>
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
