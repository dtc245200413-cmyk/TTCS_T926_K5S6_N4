import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { FaFileAlt, FaHourglassHalf, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaUser, FaEdit, FaBuilding, FaMoneyBillWave, FaExclamationTriangle, FaClipboardList, FaBullseye } from 'react-icons/fa';

const RecruitmentRequestDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [request, setRequest] = useState(null);
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [reasonModal, setReasonModal] = useState(null); // 'REJECTED' | 'NEEDS_REVISION' | null
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [response, stepsResponse] = await Promise.all([
          axios.get(`http://localhost:3000/api/recruitment-requests/${id}`, { headers }),
          axios.get(`http://localhost:3000/api/approval-workflows/requests/${id}/steps`, { headers })
        ]);
        if (response.data.success) {
          setRequest(response.data.data);
        } else {
          setError('Không thể tải thông tin yêu cầu.');
        }
        if (stepsResponse.data.success) {
          setApprovalSteps(stepsResponse.data.data || []);
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
      case 'DRAFT': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}><FaFileAlt /> Lưu nháp</span>;
      case 'PENDING': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '6px' }}><FaHourglassHalf /> Chờ duyệt</span>;
      case 'APPROVED': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}><FaCheckCircle /> Đã duyệt</span>;
      case 'NEEDS_REVISION': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', gap: '6px' }}><FaEdit /> Cần bổ sung</span>;
      case 'REJECTED': return <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}><FaTimesCircle /> Từ chối</span>;
      default: return <span>{status}</span>;
    }
  };

  const handleUpdateStatus = async (status, reason = null) => {
    const rejection_reason = reason ? reason.trim() : null;
    if (status === 'APPROVED' && !window.confirm('Bạn có chắc chắn muốn phê duyệt yêu cầu này?')) return;
    if (status !== 'APPROVED' && !rejection_reason) {
      alert('Vui lòng nhập lý do.');
      return;
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
        const token = localStorage.getItem('token');
        const stepsResponse = await axios.get(
          `http://localhost:3000/api/approval-workflows/requests/${id}/steps`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (stepsResponse.data.success) {
          setApprovalSteps(stepsResponse.data.data || []);
        }
        setReasonModal(null);
        setReasonText('');
        alert('Cập nhật trạng thái thành công.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentApprovalStep = approvalSteps.find(step => step.status === 'PENDING');
  const userRoleCodes = user?.roles?.map(role => role.role_code) || [];
  const canApprove = request.status === 'PENDING' &&
    currentApprovalStep &&
    userRoleCodes.includes('APPROVER');

  const isCreator = user && (user.user_id === request.created_by || user.id === request.created_by);

  return (
    <div style={{ padding: '30px', minHeight: 'calc(100vh - 80px)', backgroundColor: '#f8fafc', backgroundSize: '20px 20px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            <FaArrowLeft /> Quay lại
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
             {canApprove && (
               <>
                 <button onClick={() => handleUpdateStatus('APPROVED')} disabled={actionLoading} style={{ background: '#15803d', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(21, 128, 61, 0.3)' }}>
                   Phê duyệt
                 </button>
                 <button onClick={() => { setReasonText(''); setReasonModal('NEEDS_REVISION'); }} disabled={actionLoading} style={{ background: '#ea580c', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' }}>
                   Yêu cầu bổ sung
                 </button>
                 <button onClick={() => { setReasonText(''); setReasonModal('REJECTED'); }} disabled={actionLoading} style={{ background: '#b91c1c', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(185, 28, 28, 0.3)' }}>
                   Từ chối
                 </button>
               </>
             )}
             {request.status === 'PENDING' && currentApprovalStep && !canApprove && (
               <span style={{ alignSelf: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                 Đang chờ duyệt: {currentApprovalStep.step_name || currentApprovalStep.approver_role_name}
               </span>
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
              <h1 className="g-page-title">
                {request.position_name ? `Tuyển dụng ${request.position_name}` : 'Chưa cập nhật chức danh'}
              </h1>
              <p className="g-page-subtitle">
                <span><FaUser /></span> Tạo bởi <strong>{request.created_by_name}</strong> vào ngày {new Date(request.created_at).toLocaleString('vi-VN')}
              </p>
            </div>
            {isCreator && request.status === 'DRAFT' && (
              <Link to={`/recruitment-requests/${request.id}/edit`} style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaEdit /> Sửa bản nháp
              </Link>
            )}
            {isCreator && request.status === 'NEEDS_REVISION' && (
              <Link to={`/recruitment-requests/${request.id}/edit`} style={{ background: '#eab308', color: '#78350f', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaEdit /> Chỉnh sửa & Gửi duyệt lại
              </Link>
            )}
          </div>
        </div>

        {(request.status === 'REJECTED' || request.status === 'NEEDS_REVISION') && request.rejection_reason && (
          <div style={{ background: request.status === 'REJECTED' ? '#fef2f2' : '#fff7ed', padding: '20px 24px', borderRadius: '16px', borderLeft: `5px solid ${request.status === 'REJECTED' ? '#ef4444' : '#ea580c'}`, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: request.status === 'REJECTED' ? '#b91c1c' : '#c2410c', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{request.status === 'REJECTED' ? <FaTimesCircle /> : <FaEdit />}</span> {request.status === 'REJECTED' ? 'LÝ DO TỪ CHỐI' : 'YÊU CẦU BỔ SUNG'}
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
              <span><FaBuilding /></span> Thông tin chung
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
              <span><FaMoneyBillWave /></span> Thông tin Lương
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
                  <span><FaExclamationTriangle style={{ color: '#d97706' }} /></span> Giải trình lương ngoài dải chuẩn
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
              <span><FaClipboardList /></span> Mô tả công việc
            </h3>
            <div style={{ fontSize: '0.95rem', color: '#334155', background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', border: '1px solid #f1f5f9' }}>
              {request.job_description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật mô tả công việc...</span>}
            </div>
          </div>

          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span><FaBullseye /></span> Yêu cầu ứng viên
            </h3>
            <div style={{ fontSize: '0.95rem', color: '#334155', background: '#f8fafc', padding: '20px', borderRadius: '12px', lineHeight: '1.7', whiteSpace: 'pre-wrap', border: '1px solid #f1f5f9' }}>
              {request.candidate_requirements || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật yêu cầu ứng viên...</span>}
            </div>
          </div>

        </div>

        {/* Approval History */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: '800' }}>Lịch sử phê duyệt</h3>
          {approvalSteps.filter(s => s.acted_at || s.status === 'PENDING').length === 0 ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có lịch sử xử lý.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {approvalSteps.filter(s => s.acted_at || s.status === 'PENDING').map(s => {
                const meta = {
                  APPROVED: { label: 'Đã duyệt', color: '#15803d', bg: '#f0fdf4' },
                  REJECTED: { label: 'Từ chối', color: '#b91c1c', bg: '#fef2f2' },
                  NEEDS_REVISION: { label: 'Yêu cầu bổ sung', color: '#c2410c', bg: '#fff7ed' },
                  PENDING: { label: 'Đang chờ duyệt', color: '#b45309', bg: '#fffbeb' }
                }[s.status] || { label: s.status, color: '#475569', bg: '#f1f5f9' };
                return (
                  <div key={s.id} style={{ background: meta.bg, borderLeft: `4px solid ${meta.color}`, padding: '14px 18px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ color: meta.color }}>{meta.label} — {s.step_name || s.approver_role_name}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{s.acted_at ? new Date(s.acted_at).toLocaleString('vi-VN') : ''}</span>
                    </div>
                    {s.acted_by_name && <div style={{ color: '#475569', fontSize: '0.9rem', marginTop: '4px' }}>Người duyệt: <strong>{s.acted_by_name}</strong></div>}
                    {s.comment && <div style={{ color: '#334155', marginTop: '4px' }}>Lý do/ghi chú: {s.comment}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {reasonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '480px', maxWidth: '92vw', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#1e293b' }}>{reasonModal === 'REJECTED' ? 'Từ chối yêu cầu' : 'Yêu cầu bổ sung thông tin'}</h3>
            <textarea
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              placeholder={reasonModal === 'REJECTED' ? 'Nhập lý do từ chối (bắt buộc)...' : 'Nhập nội dung cần bổ sung (bắt buộc)...'}
              rows={4}
              style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setReasonModal(null)} disabled={actionLoading} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Hủy</button>
              <button
                onClick={() => handleUpdateStatus(reasonModal, reasonText)}
                disabled={actionLoading || !reasonText.trim()}
                style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', color: 'white', fontWeight: 700, cursor: reasonText.trim() ? 'pointer' : 'not-allowed', opacity: reasonText.trim() ? 1 : 0.6, background: reasonModal === 'REJECTED' ? '#b91c1c' : '#ea580c' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentRequestDetail;
