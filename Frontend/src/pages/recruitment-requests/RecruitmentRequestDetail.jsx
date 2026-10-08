import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

const RecruitmentRequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3000/api/recruitment-requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setRequest(response.data.data);
        } else {
          setError('Không thể tải thông tin yêu cầu.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
  }

  if (error || !request) {
    return <div style={{ padding: '24px', color: 'red', textAlign: 'center' }}>{error || 'Không tìm thấy yêu cầu.'}</div>;
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>📝 Lưu nháp</span>;
      case 'PENDING': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>⏳ Chờ duyệt</span>;
      case 'APPROVED': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>✅ Đã duyệt</span>;
      case 'REJECTED': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>❌ Từ chối</span>;
      default: return <span>{status}</span>;
    }
  };

  const handleUpdateStatus = async (status) => {
    let rejection_reason = null;
    if (status === 'REJECTED') {
      rejection_reason = window.prompt('Vui lòng nhập lý do từ chối yêu cầu này:');
      if (rejection_reason === null) return; // User cancelled
      if (!rejection_reason.trim()) {
        alert('Lý do từ chối không được để trống.');
        return;
      }
    } else {
      if (!window.confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này?')) return;
    }
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`http://localhost:3000/api/recruitment-requests/${id}/status`, 
        { status, rejection_reason }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setRequest(response.data.data);
        alert('Cập nhật trạng thái thành công.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setActionLoading(false);
    }
  };

  const isApprover = user?.roles?.some(r => r.role_code === 'APPROVER') || user?.job_title?.toLowerCase().includes('người phê duyệt');

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7fb', minHeight: 'calc(100vh - 80px)', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>←</span> Quay lại
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
             {isApprover && request.status === 'PENDING' && (
               <>
                 <button onClick={() => handleUpdateStatus('APPROVED')} disabled={actionLoading} style={{ background: '#15803d', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(21, 128, 61, 0.3)' }}>
                   ✅ Phê duyệt
                 </button>
                 <button onClick={() => handleUpdateStatus('REJECTED')} disabled={actionLoading} style={{ background: '#b91c1c', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(185, 28, 28, 0.3)' }}>
                   ❌ Từ chối
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Hero Header Card */}
        <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
          <div style={{ height: '8px', background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)' }}></div>
          <div style={{ padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ background: '#f1f5f9', color: '#4f46e5', padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                  YÊU CẦU #{request.id}
                </span>
                {getStatusBadge(request.status)}
              </div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>
                {request.position_name ? `Tuyển dụng ${request.position_name}` : 'Chưa cập nhật chức danh'}
              </h1>
              <p style={{ margin: '0', color: '#64748b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👤</span> Tạo bởi <strong>{request.created_by_name}</strong> vào ngày {new Date(request.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
            {request.status === 'DRAFT' && (
              <Link to={`/recruitment-requests/${request.id}/edit`} style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✏️ Sửa bản nháp
              </Link>
            )}
          </div>
        </div>

        {request.status === 'REJECTED' && request.rejection_reason && (
          <div style={{ background: '#fef2f2', padding: '20px 24px', borderRadius: '16px', borderLeft: '5px solid #ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#b91c1c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>❌</span> LÝ DO TỪ CHỐI
            </span>
            <span style={{ fontSize: '1.05rem', color: '#7f1d1d', lineHeight: '1.5' }}>
              {request.rejection_reason}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* General Info Card */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <span>🏢</span> Thông tin chung
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Phòng ban</span>
                <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>{request.department_name || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Số lượng cần tuyển</span>
                <span style={{ fontSize: '1.2rem', color: '#4f46e5', fontWeight: '800' }}>{request.headcount || '?'} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>người</span></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Ngày cần người (Deadline)</span>
                <span style={{ fontSize: '1rem', color: '#ef4444', fontWeight: '700' }}>{request.needed_by_date ? new Date(request.needed_by_date).toLocaleDateString('vi-VN') : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Lý do tuyển</span>
                <span style={{ fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                  <span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>{request.reason || '-'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Salary Info Card */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <span>💰</span> Thông tin Lương
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Mức lương đề xuất (VNĐ)</span>
              <div style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: '800', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                {request.proposed_salary_min ? Number(request.proposed_salary_min).toLocaleString() : '???'} <span style={{ color: '#94a3b8', fontWeight: '400' }}>-</span> {request.proposed_salary_max ? Number(request.proposed_salary_max).toLocaleString() : '???'}
              </div>
            </div>

            {request.salary_explanation && (
              <div style={{ marginTop: '10px', background: 'linear-gradient(to right, #fef2f2, #fff1f2)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '800', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '8px' }}>
                  <span>⚠️</span> Giải trình lương ngoài dải chuẩn
                </span>
                <span style={{ fontSize: '0.95rem', color: '#7f1d1d', lineHeight: '1.5' }}>{request.salary_explanation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Details Card */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> Mô tả công việc
            </h3>
            <div style={{ fontSize: '0.95rem', color: '#334155', background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', border: '1px solid #f1f5f9' }}>
              {request.job_description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật mô tả công việc...</span>}
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Yêu cầu ứng viên
            </h3>
            <div style={{ fontSize: '0.95rem', color: '#334155', background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', border: '1px solid #f1f5f9' }}>
              {request.candidate_requirements || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật yêu cầu ứng viên...</span>}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default RecruitmentRequestDetail;
