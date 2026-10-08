import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const RecruitmentRequestList = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/recruitment-requests/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(response.data.data);
      } catch (err) {
        console.error('Failed to fetch requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569' }}>Lưu nháp</span>;
      case 'PENDING': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef3c7', color: '#d97706' }}>Chờ duyệt</span>;
      case 'APPROVED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#16a34a' }}>Đã duyệt</span>;
      case 'REJECTED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>Từ chối</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ margin: '0', fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>Quản lý Yêu cầu Tuyển dụng</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Danh sách các yêu cầu tuyển dụng do bạn tạo</p>
          </div>
          <Link to="/recruitment-requests/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s' }}>
            <span>+</span> Tạo yêu cầu mới
          </Link>
        </div>

        {/* Content */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Bạn chưa có yêu cầu tuyển dụng nào.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Mã YC</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Phòng ban</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Chức danh</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Số lượng</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ngày tạo</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '600' }}>#{req.id}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.department_name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.position_name || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{req.headcount || '-'}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{new Date(req.created_at).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '16px' }}>{getStatusBadge(req.status)}</td>
                    <td style={{ padding: '16px' }}>
                      <Link to={`/recruitment-requests/${req.id}`} style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                        Xem chi tiết
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

export default RecruitmentRequestList;
