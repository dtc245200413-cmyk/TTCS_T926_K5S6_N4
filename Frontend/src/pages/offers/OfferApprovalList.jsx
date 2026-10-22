import React, { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import offerApi from '../../api/offerApi';
import {
  FiCheckCircle,
  FiXCircle,
  FiEdit3,
  FiSend,
  FiEye,
  FiClock,
  FiUser,
  FiX,
  FiInfo,
  FiFilter,
  FiSearch,
  FiFileText,
  FiAward
} from 'react-icons/fi';

export const getAvatarColor = (name = '') => {
  const colors = [
    { bg: '#dbeafe', text: '#1d4ed8' },
    { bg: '#f3e8ff', text: '#7e22ce' },
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#ccfbf1', text: '#0f766e' },
    { bg: '#fee2e2', text: '#b91c1c' },
    { bg: '#e0e7ff', text: '#4338ca' }
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getInitials = (name = '') => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const OfferApprovalList = () => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Status Filter Tabs
  const currentTab = searchParams.get('tab') || 'PENDING_APPROVAL';

  // Selected Offer & Modals
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT' | 'REQUEST_CHANGE' | 'PUBLISH'
  const [reasonInput, setReasonInput] = useState('');
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isApproverUser = Boolean(
    user?.roles?.some(r => ['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN'].includes(r.role_code)) ||
    user?.permissions?.includes('OFFER_APPROVE')
  );

  const isRecruiterUser = Boolean(
    user?.roles?.some(r => ['RECRUITER', 'HR_MANAGER', 'ADMIN'].includes(r.role_code)) ||
    user?.permissions?.includes('OFFER_CREATE')
  );

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = isApproverUser && currentTab === 'PENDING_APPROVAL'
        ? await offerApi.getApprovalInbox()
        : await offerApi.getOffers({ status: currentTab, search: searchTerm });
      const rows = response.data.data || [];
      setOffers(Array.isArray(rows) && searchTerm.trim() && isApproverUser && currentTab === 'PENDING_APPROVAL'
        ? rows.filter(o => [o.offer_code, o.candidate_name, o.job_title].some(x =>
          String(x || '').toLowerCase().includes(searchTerm.trim().toLowerCase())))
        : rows);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách Thư mời nhận việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [currentTab, isApproverUser]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOffers();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>⏳ Chờ duyệt</span>;
      case 'APPROVED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>✅ Đã duyệt</span>;
      case 'SENT':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>📬 Đã phát hành</span>;
      case 'CHANGE_REQUESTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a', whiteSpace: 'nowrap' }}>✏️ Yêu cầu sửa</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>❌ Từ chối</span>;
      case 'ACCEPTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>🎉 Đã chấp nhận</span>;
      case 'DECLINED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', whiteSpace: 'nowrap' }}>🚫 Ứng viên từ chối</span>;
      case 'EXPIRED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>⏰ Hết hạn</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569', whiteSpace: 'nowrap' }}>{status}</span>;
    }
  };

  const tabs = [
    { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
    { key: 'APPROVED', label: 'Đã duyệt' },
    { key: 'SENT', label: 'Đã phát hành' },
    { key: 'CHANGE_REQUESTED', label: 'Cần sửa' },
    { key: 'REJECTED', label: 'Từ chối' },
    { key: 'ACCEPTED', label: 'Đã nhận việc' },
    { key: 'DECLINED', label: 'Ứng viên từ chối' },
    { key: 'ALL', label: 'Tất cả' }
  ];

  const handleOpenActionModal = (offer, type) => {
    setSelectedOffer(offer);
    setActionType(type);
    setReasonInput('');
    setActionError('');
  };

  const handleOpenDetail = async (offer) => {
    try {
      const res = isApproverUser && offer.status === 'PENDING_APPROVAL'
        ? await offerApi.getApprovalDetail(offer.id)
        : await offerApi.getOfferById(offer.id);
      setSelectedOffer(res.data.data);
      setShowDetailModal(true);
    } catch (e) {
      alert('Không thể tải chi tiết Offer: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActionError('');

    // Backend validation requirement: REJECT and REQUEST_CHANGE require reason
    if (['REJECT', 'REQUEST_CHANGE'].includes(actionType) && !reasonInput.trim()) {
      setActionError(
        actionType === 'REJECT'
          ? 'Lý do từ chối là bắt buộc. Vui lòng nhập lý do cụ thể.'
          : 'Lý do yêu cầu chỉnh sửa là bắt buộc. Vui lòng nhập yêu cầu chi tiết.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (actionType === 'APPROVE') {
        await offerApi.decideAtomic(selectedOffer.id, 'APPROVED', reasonInput.trim(), selectedOffer.row_version);
        setSuccessMessage(`Đã phê duyệt Thư mời nhận việc ${selectedOffer.offer_code} thành công.`);
      } else if (actionType === 'REJECT') {
        await offerApi.decideAtomic(selectedOffer.id, 'REJECTED', reasonInput.trim(), selectedOffer.row_version);
        setSuccessMessage(`Đã từ chối Thư mời nhận việc ${selectedOffer.offer_code}.`);
      } else if (actionType === 'REQUEST_CHANGE') {
        await offerApi.decideAtomic(selectedOffer.id, 'REQUEST_CHANGE', reasonInput.trim(), selectedOffer.row_version);
        setSuccessMessage(`Đã gửi yêu cầu chỉnh sửa Thư mời nhận việc ${selectedOffer.offer_code}.`);
      } else if (actionType === 'PUBLISH') {
        await offerApi.publishOffer(selectedOffer.id);
        setSuccessMessage(`Đã phát hành Thư mời nhận việc ${selectedOffer.offer_code} tới ứng viên thành công.`);
      }

      setActionType(null);
      fetchOffers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '0 đ';
    return Number(val).toLocaleString('vi-VN') + ' VNĐ';
  };

  const formatDate = (val) => {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('vi-VN');
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white',
          padding: '20px 24px',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h1 className="g-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiAward color="#2563eb" /> Quản lý & Phê duyệt Offer
            </h1>
            <p className="g-page-subtitle">
              Danh sách Thư mời nhận việc, luồng duyệt nhiều cấp, phát hành tới ứng viên và tiếp nhận nhân viên mới (Onboarding).
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm mã offer, ứng viên, chức danh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 14px 8px 34px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  width: '280px',
                  outline: 'none'
                }}
              />
              <FiSearch style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Tìm
            </button>
          </form>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div style={{
            padding: '12px 18px',
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}>
            {successMessage}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '12px 18px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {/* Table Container */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

          {/* Tabs Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setSearchParams({ tab: t.key })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  background: currentTab === t.key ? '#2563eb' : 'white',
                  color: currentTab === t.key ? 'white' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách Offer...</div>
          ) : offers.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Không có Thư mời nhận việc nào trong danh mục này.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 1000 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Mã Offer</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Tên ứng viên</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Vị trí tuyển dụng</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Phòng ban</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Mức lương đề xuất</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Hạn phản hồi</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase' }}>Trạng thái</th>
                    <th style={{ padding: '14px 16px', color: '#475569', fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(offer => (
                    <tr
                      key={offer.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: offer.status === 'PENDING_APPROVAL' ? '#fffdf7' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#1e293b' }}>
                        {offer.offer_code}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{offer.candidate_name || 'N/A'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{offer.candidate_email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1e293b' }}>
                        {offer.job_title}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.88rem' }}>
                        {offer.department_name || '-'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#15803d' }}>
                        {formatCurrency(offer.basic_salary || offer.salary_amount)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: '0.88rem' }}>
                        {formatDate(offer.response_deadline)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(offer.status)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>

                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(offer)}
                            className="btn-action-view"
                            title="Xem chi tiết Offer & Lịch sử xử lý"
                          >
                            <FiEye style={{ marginRight: 4 }} /> Xem chi tiết
                          </button>

                          {/* BỘ NÚT HÀNH ĐỘNG CỦA NGƯỜI DUYỆT (Khi status = PENDING_APPROVAL) */}
                          {offer.can_approve === true && offer.status === 'PENDING_APPROVAL' && (
                            <>
                              {/* Nút DUYỆT (Màu xanh lá) */}
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(offer, 'APPROVE')}
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Phê duyệt Offer"
                              >
                                <FiCheckCircle size={14} /> Duyệt
                              </button>

                              {/* Nút YÊU CẦU CHỈNH SỬA (Màu cam/vàng) */}
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(offer, 'REQUEST_CHANGE')}
                                style={{
                                  background: '#d97706',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Yêu cầu điều chỉnh thông tin Offer"
                              >
                                <FiEdit3 size={14} /> Yêu cầu sửa
                              </button>

                              {/* Nút TỪ CHỐI (Màu đỏ) */}
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(offer, 'REJECT')}
                                style={{
                                  background: '#dc2626',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Từ chối Offer"
                              >
                                <FiXCircle size={14} /> Từ chối
                              </button>
                            </>
                          )}

                          {/* TIÊU CHÍ 3: Nút PHÁT HÀNH TỚI ỨNG VIÊN (Chỉ khi status = APPROVED) */}
                          {offer.can_publish === true && offer.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenActionModal(offer, 'PUBLISH')}
                              style={{
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                              }}
                              title="Chỉ Offer đã được phê duyệt mới có thể phát hành tới ứng viên"
                            >
                              <FiSend size={14} /> Phát hành tới ứng viên
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL HÀNH ĐỘNG: DUYỆT / TỪ CHỐI / YÊU CẦU SỬA / PHÁT HÀNH */}
      {actionType && selectedOffer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                {actionType === 'APPROVE' && 'Phê duyệt Offer'}
                {actionType === 'REJECT' && 'Từ chối Offer'}
                {actionType === 'REQUEST_CHANGE' && 'Yêu cầu chỉnh sửa Offer'}
                {actionType === 'PUBLISH' && 'Phát hành Offer tới Ứng viên'}
              </h3>
              <button
                type="button"
                onClick={() => setActionType(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleActionSubmit} style={{ padding: '24px' }}>

              {/* Info banner */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: actionType === 'APPROVE' ? '#f0fdf4' : (actionType === 'REJECT' ? '#fef2f2' : '#eff6ff'),
                border: `1px solid ${actionType === 'APPROVE' ? '#bbf7d0' : (actionType === 'REJECT' ? '#fecaca' : '#bfdbfe')}`,
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '20px',
                color: actionType === 'APPROVE' ? '#166534' : (actionType === 'REJECT' ? '#991b1b' : '#1e40af'),
                fontSize: '0.9rem'
              }}>
                <FiInfo size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Mã Offer: {selectedOffer.offer_code}</strong><br />
                  Ứng viên: <strong>{selectedOffer.candidate_name}</strong> - Vị trí: <strong>{selectedOffer.job_title}</strong><br />
                  Mức lương: <strong>{formatCurrency(selectedOffer.basic_salary || selectedOffer.salary_amount)}</strong>
                </div>
              </div>

              {/* Textarea lý do (BẮT BUỘC nếu Từ chối hoặc Yêu cầu sửa) */}
              {actionType !== 'PUBLISH' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                    {actionType === 'APPROVE' && 'Ghi chú phê duyệt (Tùy chọn)'}
                    {actionType === 'REJECT' && <>Lý do từ chối <span style={{ color: '#ef4444' }}>* (Bắt buộc)</span></>}
                    {actionType === 'REQUEST_CHANGE' && <>Nội dung yêu cầu chỉnh sửa <span style={{ color: '#ef4444' }}>* (Bắt buộc)</span></>}
                  </label>
                  <textarea
                    rows={4}
                    maxLength={500}
                    placeholder={
                      actionType === 'APPROVE'
                        ? 'Nhập căn cứ hoặc lời nhắn kèm theo (nếu có)...'
                        : (actionType === 'REJECT' ? 'Nhập chi tiết lý do từ chối offer này...' : 'Nhập chi tiết các điểm cần điều chỉnh (mức lương, ngày nhận việc, phúc lợi)...')
                    }
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    required={actionType === 'REJECT' || actionType === 'REQUEST_CHANGE'}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  {['REJECT', 'REQUEST_CHANGE'].includes(actionType) && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      Lý do này sẽ được lưu vào lịch sử phê duyệt và thông báo trực tiếp đến Recruiter phụ trách.
                    </div>
                  )}
                </div>
              )}

              {actionType === 'PUBLISH' && (
                <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
                  Thư mời nhận việc đã được phê duyệt. Khi phát hành, ứng viên sẽ nhận được thông báo trên Cổng ứng viên và có thể xem chi tiết để Chấp nhận hoặc Từ chối trước hạn phản hồi.
                </p>
              )}

              {actionError && (
                <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
                  {actionError}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: actionType === 'APPROVE' ? '#16a34a' : (actionType === 'REJECT' ? '#dc2626' : (actionType === 'REQUEST_CHANGE' ? '#d97706' : '#2563eb')),
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {submitting ? 'Đang xử lý...' : (
                    actionType === 'APPROVE' ? 'Xác nhận Duyệt' :
                    (actionType === 'REJECT' ? 'Xác nhận Từ chối' :
                    (actionType === 'REQUEST_CHANGE' ? 'Gửi Yêu cầu Sửa' : 'Xác nhận Phát hành'))
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER CHI TIẾT OFFER & LỊCH SỬ XỬ LÝ */}
      {showDetailModal && selectedOffer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                  CHI TIẾT THƯ MỜI NHẬN VIỆC
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0' }}>
                  {selectedOffer.offer_code} - {selectedOffer.job_title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {getStatusBadge(selectedOffer.status)}
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Thông tin ứng viên */}
              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 }}>
                  Thông tin ứng viên
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Họ tên:</span>{' '}
                    <strong style={{ color: '#0f172a' }}>{selectedOffer.candidate_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Email:</span>{' '}
                    <span style={{ color: '#0f172a' }}>{selectedOffer.candidate_email}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
                    <span style={{ color: '#0f172a' }}>{selectedOffer.candidate_phone || '-'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phòng ban:</span>{' '}
                    <span style={{ color: '#0f172a' }}>{selectedOffer.department_name || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Điều khoản Offer */}
              <div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                  Điều khoản & Mức đãi ngộ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Lương chính thức (Gross/Net)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#16a34a', marginTop: 2 }}>
                      {formatCurrency(selectedOffer.basic_salary || selectedOffer.salary_amount)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Lương thử việc ({selectedOffer.probation_period_months || 2} tháng)</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginTop: 2 }}>
                      {selectedOffer.probation_salary ? formatCurrency(selectedOffer.probation_salary) : '85% lương chính thức'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Ngày bắt đầu làm việc</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#0f172a', marginTop: 2 }}>
                      {formatDate(selectedOffer.expected_start_date || selectedOffer.start_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Hạn phản hồi Offer</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#dc2626', marginTop: 2 }}>
                      {formatDate(selectedOffer.response_deadline)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Địa điểm làm việc:</div>
                  <div style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: '500', marginTop: 2 }}>
                    {selectedOffer.work_location || 'Trụ sở chính công ty'}
                  </div>
                </div>
                {selectedOffer.benefits && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Chế độ phúc lợi:</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: 2, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                      {selectedOffer.benefits}
                    </div>
                  </div>
                )}
                {selectedOffer.message && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Thư ngỏ gửi ứng viên:</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: 2, background: '#f8fafc', padding: 10, borderRadius: 8, whiteSpace: 'pre-line' }}>
                      {selectedOffer.message}
                    </div>
                  </div>
                )}
              </div>

              {/* Phản hồi của ứng viên (nếu có) */}
              {selectedOffer.candidate_response && (
                <div style={{
                  padding: 14,
                  borderRadius: 10,
                  background: selectedOffer.status === 'ACCEPTED' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${selectedOffer.status === 'ACCEPTED' ? '#bbf7d0' : '#fecaca'}`
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: selectedOffer.status === 'ACCEPTED' ? '#166534' : '#991b1b', marginBottom: 4 }}>
                    {selectedOffer.status === 'ACCEPTED' ? 'Ứng viên đã Chấp nhận nhận việc' : 'Lý do Ứng viên từ chối Thư mời'}:
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                    "{selectedOffer.candidate_response}"
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                    Thời điểm phản hồi: {new Date(selectedOffer.responded_at || selectedOffer.updated_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              )}

              {/* TIÊU CHÍ 6: Onboarding checklist (nếu đã chấp nhận) */}
              {selectedOffer.onboarding && (
                <div style={{ padding: 16, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiCheckCircle color="#16a34a" /> Quy trình Tiếp nhận & Onboarding
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: '0.85rem' }}>
                    <div>Trạng thái: <strong>{selectedOffer.onboarding.status === 'PREPARING' ? 'Đang chuẩn bị' : selectedOffer.onboarding.status}</strong></div>
                    <div>Ngày đi làm: <strong>{formatDate(selectedOffer.onboarding.official_start_date)}</strong></div>
                    <div>HR phụ trách: <strong>{selectedOffer.onboarding.hr_in_charge_name || selectedOffer.creator_name || 'HR'}</strong></div>
                  </div>
                  {selectedOffer.onboarding.checklist_notes && (
                    <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: 8 }}>
                      Ghi chú: {selectedOffer.onboarding.checklist_notes}
                    </div>
                  )}
                </div>
              )}

              {/* TIÊU CHÍ 2: LỊCH SỬ XỬ LÝ PHÊ DUYỆT (offer_approvals) */}
              <div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 6 }}>
                  Lịch sử phê duyệt & Xử lý ({selectedOffer.approvals?.length || 0})
                </div>
                {selectedOffer.approvals && selectedOffer.approvals.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedOffer.approvals.map((appr, idx) => (
                      <div
                        key={appr.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: 12,
                          background: '#f8fafc',
                          borderRadius: 10,
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: appr.action === 'APPROVED' ? '#dcfce7' : (appr.action === 'REJECTED' ? '#fee2e2' : '#fef3c7'),
                          color: appr.action === 'APPROVED' ? '#16a34a' : (appr.action === 'REJECTED' ? '#dc2626' : '#d97706'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>
                          {getInitials(appr.approver_name || 'Approver')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                              {appr.approver_name || 'Người duyệt'} &nbsp;
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 700,
                                background: appr.action === 'APPROVED' ? '#f0fdf4' : (appr.action === 'REJECTED' ? '#fef2f2' : '#fef9c3'),
                                color: appr.action === 'APPROVED' ? '#166534' : (appr.action === 'REJECTED' ? '#991b1b' : '#a16207')
                              }}>
                                {appr.action === 'APPROVED' ? 'Đã duyệt' : (appr.action === 'REJECTED' ? 'Từ chối' : 'Yêu cầu sửa')}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              {new Date(appr.action_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          {appr.reason && (
                            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: 4, fontStyle: 'italic' }}>
                              "{appr.reason}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa có lịch sử phê duyệt cho Offer này.
                  </div>
                )}
              </div>

            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#ffffff'
            }}>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferApprovalList;
