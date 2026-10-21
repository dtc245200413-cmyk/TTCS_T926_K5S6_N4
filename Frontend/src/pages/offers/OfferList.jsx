import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import offerApi, { ELIGIBILITY_PENDING, offerErrorMessage } from '../../api/offerApi';
import { canEditOffer, canUseOfferDrafts } from './offerFormModel';
import { AuthContext } from '../../context/AuthContext';
import {
  FiFileText,
  FiCheck,
  FiX,
  FiEdit,
  FiSend,
  FiEye,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiUser,
  FiCalendar,
  FiBriefcase
} from 'react-icons/fi';
import '../../styles/global.css';

const OfferList = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const detailRequest = useRef(0);
  const submitLock = useRef(false);
  const [creationAvailable, setCreationAvailable] = useState(false);
  const [creationReason, setCreationReason] = useState(ELIGIBILITY_PENDING);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [actionModal, setActionModal] = useState({ open: false, type: '', offerId: null });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const roleCodes = user?.roles?.map(r => r.role_code) || [];
  const isApprover = roleCodes.some(r => ['APPROVER', 'DIRECTOR', 'HR_MANAGER', 'ADMIN'].includes(r));

  useEffect(() => {
    let active = true;
    setCreationAvailable(false);
    setCreationReason(ELIGIBILITY_PENDING);
    if (canUseOfferDrafts(user)) {
      offerApi.getCreationOptions().then(options => {
        if (active) {
          setCreationAvailable(options.eligible === true &&
            options.applications?.some(application => application.eligible === true));
          setCreationReason(options.reason || ELIGIBILITY_PENDING);
        }
      }).catch(error => { if (active) setCreationReason(offerErrorMessage(error)); });
    }
    return () => { active = false; };
  }, [user]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;
      const res = await axiosClient.get('/offers', { params });
      if (res.data?.success) {
        setOffers(res.data.data || []);
      }
    } catch (err) {
      setOffers([]);
      setSelectedOffer(null);
      setMessage({ text: offerErrorMessage(err), type: 'error' });
      console.error('Lỗi tải danh sách Offer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  useEffect(() => {
    setSelectedOffer(null);
    if (id) handleViewDetail(id);
    return () => { ++detailRequest.current; };
  }, [id]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOffers();
  };

  const handleViewDetail = async (offerId) => {
    const request = ++detailRequest.current;
    setSelectedOffer(null);
    try {
      const res = await offerApi.getById(offerId);
      if (request === detailRequest.current && res.data?.success && String(res.data.data?.id) === String(offerId)) {
        setSelectedOffer(res.data.data);
      }
    } catch (err) {
      if (request === detailRequest.current) setMessage({ text: offerErrorMessage(err), type: 'error' });
    }
  };

  const handleSubmitForApproval = async (offerId) => {
    if (submitLock.current) return;
    if (!window.confirm('Bạn có chắc chắn muốn gửi Offer này cho Người duyệt?')) return;
    submitLock.current = true;
    setMessage({ text: '', type: '' });
    try {
      setSubmitting(true);
      const res = await offerApi.submit(offerId);
      if (res.data?.success) {
        setMessage({ text: 'Gửi duyệt Offer thành công! Người duyệt đã nhận được thông báo.', type: 'success' });
        fetchOffers();
        if (selectedOffer?.id === offerId) handleViewDetail(offerId);
      }
    } catch (err) {
      setMessage({ text: offerErrorMessage(err), type: 'error' });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const handleProcessApproval = async () => {
    if (['REJECTED', 'REQUEST_CHANGE'].includes(actionModal.type) && !reason.trim()) {
      alert('Vui lòng nhập lý do/yêu cầu cụ thể');
      return;
    }

    try {
      setSubmitting(true);
      const res = await axiosClient.post(`/offers/${actionModal.offerId}/process-approval`, {
        action: actionModal.type,
        reason: reason.trim()
      });
      if (res.data?.success) {
        setMessage({
          text: `Đã xử lý Offer thành công (${actionModal.type === 'APPROVED' ? 'Phê duyệt' : actionModal.type === 'REJECTED' ? 'Từ chối' : 'Yêu cầu sửa'})! Recruiter phụ trách đã nhận được thông báo.`,
          type: 'success'
        });
        setActionModal({ open: false, type: '', offerId: null });
        setReason('');
        fetchOffers();
        if (selectedOffer?.id === actionModal.offerId) handleViewDetail(actionModal.offerId);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Lỗi khi xử lý phê duyệt Offer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#f1f5f9', color: '#475569' }}>Lưu nháp</span>;
      case 'PENDING_APPROVAL':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#fef3c7', color: '#b45309' }}>Chờ phê duyệt</span>;
      case 'APPROVED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#d1fae5', color: '#065f46' }}>Đã phê duyệt</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#fee2e2', color: '#991b1b' }}>Bị từ chối</span>;
      case 'CHANGE_REQUESTED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#ffedd5', color: '#c2410c' }}>Yêu cầu chỉnh sửa</span>;
      case 'SENT':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#e0e7ff', color: '#3730a3' }}>Đã phát hành</span>;
      case 'ACCEPTED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#bbf7d0', color: '#14532d' }}>Ứng viên chấp nhận</span>;
      case 'DECLINED':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#fecdd3', color: '#881337' }}>Ứng viên từ chối</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', background: '#f1f5f9', color: '#64748b' }}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="g-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiFileText color="#4f46e5" size={26} /> Quản lý Thư mời nhận việc (Offer)
          </h1>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Quy trình soạn thảo, gửi duyệt và phê duyệt Offer với thông báo tự động cho Người duyệt & Recruiter
          </p>
        </div>
        {canUseOfferDrafts(user) && (creationAvailable
          ? <Link to="/offers/new">Soạn Offer</Link>
          : <p role="status" style={{ color: '#64748b', fontSize: '0.85rem' }}>{creationReason}</p>)}
      </div>

      {/* Thông báo thao tác */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Bộ lọc & Tìm kiếm */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: '', label: 'Tất cả' },
            { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'CHANGE_REQUESTED', label: 'Yêu cầu sửa' },
            { key: 'REJECTED', label: 'Từ chối' },
            { key: 'ACCEPTED', label: 'Đã nhận việc' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: statusFilter === tab.key ? '600' : '500',
                background: statusFilter === tab.key ? '#4f46e5' : '#f1f5f9',
                color: statusFilter === tab.key ? 'white' : '#475569',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Tìm theo ứng viên, mã offer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              width: '240px'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#4f46e5',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Bảng danh sách Offer */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Đang tải danh sách Offer...</div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <FiFileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Không tìm thấy Thư mời nhận việc nào phù hợp</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '600' }}>
                  <th style={{ padding: '14px 18px' }}>Mã Offer</th>
                  <th style={{ padding: '14px 18px' }}>Ứng viên</th>
                  <th style={{ padding: '14px 18px' }}>Vị trí & Phòng ban</th>
                  <th style={{ padding: '14px 18px' }}>Mức lương chính thức</th>
                  <th style={{ padding: '14px 18px' }}>Trạng thái</th>
                  <th style={{ padding: '14px 18px' }}>Người tạo</th>
                  <th style={{ padding: '14px 18px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#0f172a' }}>
                      {offer.offer_code}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{offer.candidate_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{offer.candidate_email}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ color: '#0f172a' }}>{offer.job_title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{offer.department_name}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#0f172a' }}>
                      {Number(offer.basic_salary).toLocaleString('vi-VN')} {offer.currency || 'VND'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {getStatusBadge(offer.status)}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      {offer.creator_name || 'Hệ thống'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate(`/offers/${offer.id}`)}
                          style={{
                            padding: '5px 10px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#334155'
                          }}
                        >
                          <FiEye size={14} /> Chi tiết
                        </button>
                        {canEditOffer(user, offer) && <Link to={`/offers/${offer.id}/edit`} style={{ padding: '5px 10px' }}>
                          Chỉnh sửa nháp
                        </Link>}

                        {/* Quyền Người duyệt: Khi offer ở trạng thái PENDING_APPROVAL */}
                        {isApprover && offer.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => setActionModal({ open: true, type: 'APPROVED', offerId: offer.id })}
                              style={{
                                padding: '5px 10px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'white',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <FiCheck size={14} /> Duyệt
                            </button>
                            <button
                              onClick={() => setActionModal({ open: true, type: 'REQUEST_CHANGE', offerId: offer.id })}
                              style={{
                                padding: '5px 10px',
                                background: '#f97316',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'white',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <FiEdit size={14} /> Sửa
                            </button>
                            <button
                              onClick={() => setActionModal({ open: true, type: 'REJECTED', offerId: offer.id })}
                              style={{
                                padding: '5px 10px',
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'white',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <FiX size={14} /> Từ chối
                            </button>
                          </>
                        )}

                        {/* Quyền Recruiter: Gửi duyệt khi ở trạng thái DRAFT hoặc CHANGE_REQUESTED */}
                        {canEditOffer(user, offer) && (
                          <button
                            onClick={() => handleSubmitForApproval(offer.id)}
                            disabled={submitting}
                            style={{
                              padding: '5px 10px',
                              background: '#4f46e5',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: 'white',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FiSend size={14} /> Gửi duyệt
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

      {/* Modal Chi tiết Offer */}
      {selectedOffer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', maxWidth: '700px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                  Chi tiết Offer: {selectedOffer.offer_code}
                </h2>
                <div style={{ marginTop: '6px' }}>{getStatusBadge(selectedOffer.status)}</div>
              </div>
              <button
                onClick={() => { setSelectedOffer(null); navigate('/offers'); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Ứng viên</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedOffer.candidate_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>{selectedOffer.candidate_email}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Vị trí & Phòng ban</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{selectedOffer.job_title}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>{selectedOffer.department_name}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Lương chính thức</div>
                <div style={{ fontWeight: '700', color: '#059669', fontSize: '1.1rem' }}>
                  {Number(selectedOffer.basic_salary).toLocaleString('vi-VN')} {selectedOffer.currency || 'VND'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Lương thử việc</div>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>
                  {selectedOffer.probation_salary ? `${Number(selectedOffer.probation_salary).toLocaleString('vi-VN')} VND` : 'Theo thỏa thuận'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Ngày nhận việc dự kiến</div>
                <div style={{ fontWeight: '500', color: '#0f172a' }}>
                  {selectedOffer.expected_start_date ? new Date(selectedOffer.expected_start_date).toLocaleDateString('vi-VN') : '---'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Hạn phản hồi</div>
                <div style={{ fontWeight: '500', color: '#0f172a' }}>
                  {selectedOffer.response_deadline ? new Date(selectedOffer.response_deadline).toLocaleDateString('vi-VN') : '---'}
                </div>
              </div>
            </div>

            {selectedOffer.work_location && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Địa điểm làm việc</div>
                <div style={{ fontSize: '0.9rem', color: '#334155' }}>{selectedOffer.work_location}</div>
              </div>
            )}

            {selectedOffer.benefits && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Chế độ đãi ngộ & Phúc lợi</div>
                <div style={{ fontSize: '0.9rem', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                  {selectedOffer.benefits}
                </div>
              </div>
            )}

            {/* Lịch sử phê duyệt */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 12px 0' }}>
                Lịch sử phê duyệt
              </h3>
              {(!selectedOffer.approvals || selectedOffer.approvals.length === 0) ? (
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Chưa có lịch sử phê duyệt</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOffer.approvals.map(app => (
                    <div key={app.id} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.85rem' }}>{app.approver_name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(app.action_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: app.action === 'APPROVED' ? '#059669' : '#dc2626', fontWeight: '500' }}>
                        Hành động: {app.action === 'APPROVED' ? 'Phê duyệt' : app.action === 'REJECTED' ? 'Từ chối' : 'Yêu cầu chỉnh sửa'}
                      </div>
                      {app.reason && (
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                          Lý do/Ghi chú: {app.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {canEditOffer(user, selectedOffer) && <Link to={`/offers/${selectedOffer.id}/edit`}>Chỉnh sửa nháp</Link>}
              <button
                onClick={() => { setSelectedOffer(null); navigate('/offers'); }}
                style={{ padding: '8px 18px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '500' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xử lý phê duyệt (Duyệt, Từ chối, Yêu cầu sửa) */}
      {actionModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'white', borderRadius: '14px', maxWidth: '500px', width: '100%',
            padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', color: '#0f172a' }}>
              {actionModal.type === 'APPROVED' && 'Xác nhận Phê duyệt Offer'}
              {actionModal.type === 'REJECTED' && 'Từ chối Phê duyệt Offer'}
              {actionModal.type === 'REQUEST_CHANGE' && 'Yêu cầu chỉnh sửa Offer'}
            </h3>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b' }}>
              {actionModal.type === 'APPROVED'
                ? 'Offer sẽ được chuyển sang trạng thái Đã phê duyệt và thông báo tự động tới Recruiter phụ trách.'
                : 'Vui lòng cung cấp lý do hoặc các điểm cần chỉnh sửa để Recruiter nắm thông tin.'
              }
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                {actionModal.type === 'APPROVED' ? 'Ghi chú phê duyệt (tùy chọn):' : 'Lý do / Hướng dẫn chỉnh sửa (*):'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder={actionModal.type === 'APPROVED' ? 'Ví dụ: Đã kiểm tra mức lương phù hợp khung ngân sách...' : 'Ví dụ: Mức lương đề xuất vượt dải lương quy định, cần giảm 2 triệu...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setActionModal({ open: false, type: '', offerId: null })}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
              >
                Hủy
              </button>
              <button
                onClick={handleProcessApproval}
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  background: actionModal.type === 'APPROVED' ? '#10b981' : actionModal.type === 'REJECTED' ? '#ef4444' : '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferList;
