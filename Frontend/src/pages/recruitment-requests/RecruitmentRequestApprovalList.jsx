import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const RecruitmentRequestApprovalList = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/recruitment-requests/approvals', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(response.data.data);
      } catch (err) {
        console.error('Failed to fetch approval requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>⏳ Chờ duyệt</span>;
      case 'APPROVED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>✅ Đã duyệt</span>;
      case 'REJECTED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>❌ Từ chối</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="g-page-title">Duyệt Yêu cầu Tuyển dụng</h1>
            <p className="g-page-subtitle">Danh sách các yêu cầu đang chờ bạn phê duyệt</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Không có yêu cầu nào cần duyệt.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Mã YC</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Người Tạo</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Phòng ban</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Chức danh</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', background: req.status === 'PENDING' ? '#fffdf7' : 'transparent' }}>
                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '600' }}>#{req.id}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.created_by_name}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.department_name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.position_name || '-'}</td>
                    <td style={{ padding: '16px' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '16px' }}>
                      <Link to={`/recruitment-requests/${req.id}`} className="btn-action-view">
                        Xem / Duyệt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

export default RecruitmentRequestApprovalList;
