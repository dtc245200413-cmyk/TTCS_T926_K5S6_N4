import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CandidateList = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/candidates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(response.data.data);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/master-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const md = response.data.data;
      setRejectionReasons(md.filter(x => x.category_group === 'REJECTION_REASON' && x.is_active));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchRejectionReasons();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dbeafe', color: '#1d4ed8' }}>Mới</span>;
      case 'INTERVIEWING': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef3c7', color: '#d97706' }}>Phỏng vấn</span>;
      case 'OFFERED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#e0e7ff', color: '#4338ca' }}>Đề nghị (Offer)</span>;
      case 'HIRED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#16a34a' }}>Đã tuyển</span>;
      case 'REJECTED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>Đánh trượt</span>;
      default: return <span>{status}</span>;
    }
  };

  const handleOpenReject = (candidate) => {
    setSelectedCandidate(candidate);
    setShowRejectModal(true);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async () => {
    if (!rejectReason) {
      setRejectError('Vui lòng chọn lý do loại hồ sơ');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/candidates/${selectedCandidate.id}/status`, {
        status: 'REJECTED',
        rejection_reason_code: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRejectModal(false);
      fetchCandidates();
    } catch (error) {
      setRejectError('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ margin: '0', fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>Quản lý Hồ sơ Ứng viên</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Theo dõi và quản lý ứng viên trên toàn hệ thống</p>
          </div>
          <Link to="/candidates/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s' }}>
            <span>+</span> Thêm Ứng viên
          </Link>
        </div>

        {/* Content */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Bạn chưa có hồ sơ ứng viên nào.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Họ Tên</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Vị trí ứng tuyển</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nguồn (Master Data)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(cand => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '600' }}>{cand.full_name}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{cand.email}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>
                      {cand.position_name ? `${cand.position_name} - ${cand.department_name}` : 'N/A'}
                    </td>
                    <td style={{ padding: '16px', color: '#4f46e5', fontWeight: '600' }}>{cand.source_code || '-'}</td>
                    <td style={{ padding: '16px' }}>{getStatusBadge(cand.status)}</td>
                    <td style={{ padding: '16px' }}>
                      {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                        <button 
                          onClick={() => handleOpenReject(cand)}
                          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                        >
                          Đánh trượt
                        </button>
                      )}
                      {cand.status === 'REJECTED' && cand.rejection_reason_code && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>Lý do: {cand.rejection_reason_code}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.2rem' }}>Đánh trượt Ứng viên</h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '16px' }}>Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Vui lòng chọn lý do từ danh mục chung.</p>
            
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Lý do loại hồ sơ <span style={{ color: '#ef4444' }}>*</span></label>
            <select 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px', outline: 'none' }}
            >
              <option value="">-- Chọn lý do --</option>
              {rejectionReasons.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
            {rejectError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{rejectError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
              <button onClick={submitReject} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Xác nhận Trượt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateList;
