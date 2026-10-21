import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FiCheckCircle, 
  FiMail, 
  FiCalendar, 
  FiDollarSign, 
  FiMapPin, 
  FiClock, 
  FiAlertCircle, 
  FiX, 
  FiGift,
  FiFileText
} from 'react-icons/fi';

const API = 'http://localhost:5000/api/candidate-portal';

const CandidateOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Accept Confirmation Modal State
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('candidate_token')}`
  });

  const load = async () => {
    try {
      setError('');
      const response = await axios.get(`${API}/offers`, { headers: getHeaders() });
      setOffers(response.data.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải thư mời nhận việc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDeclineModal = (offer) => {
    setSelectedOffer(offer);
    setDeclineReason('');
    setDeclineError('');
    setDeclineModalOpen(true);
  };

  const closeDeclineModal = () => {
    setDeclineModalOpen(false);
    setSelectedOffer(null);
    setDeclineReason('');
    setDeclineError('');
  };

  const openAcceptModal = (offer) => {
    setSelectedOffer(offer);
    setAcceptModalOpen(true);
  };

  const closeAcceptModal = () => {
    setAcceptModalOpen(false);
    setSelectedOffer(null);
  };

  const handleDeclineSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmedReason = declineReason.trim();
    if (!trimmedReason) {
      setDeclineError('Vui lòng nhập lý do từ chối thư mời nhận việc.');
      return;
    }

    setSubmitting(true);
    setDeclineError('');
    try {
      await axios.patch(
        `${API}/offers/${selectedOffer.id}/respond`,
        { status: 'DECLINED', response: trimmedReason },
        { headers: getHeaders() }
      );
      closeDeclineModal();
      setSuccessMsg('Đã gửi phản hồi từ chối thư mời nhận việc.');
      await load();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setDeclineError(err.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await axios.patch(
        `${API}/offers/${selectedOffer.id}/respond`,
        { status: 'ACCEPTED', response: 'Đồng ý nhận việc theo đúng các điều khoản trong Thư mời.' },
        { headers: getHeaders() }
      );
      closeAcceptModal();
      setSuccessMsg('Chúc mừng bạn! Bạn đã chấp nhận Thư mời nhận việc thành công. Bộ phận Nhân sự sẽ sớm liên hệ để bắt đầu quy trình Onboarding.');
      await load();
      setTimeout(() => setSuccessMsg(''), 7000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể chấp nhận thư mời. Vui lòng thử lại.');
      closeAcceptModal();
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (offer) => {
    const isExpired = offer.is_expired || offer.status === 'EXPIRED';
    if (offer.status === 'ACCEPTED') {
      return <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Đã chấp nhận</span>;
    }
    if (offer.status === 'DECLINED') {
      return <span className="badge badge-error" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Đã từ chối</span>;
    }
    if (isExpired) {
      return <span className="badge badge-error" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fee2e2', color: '#991b1b' }}>Đã hết hạn phản hồi</span>;
    }
    return <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fef3c7', color: '#92400e' }}>Chờ bạn phản hồi</span>;
  };

  return (
    <div className="g-page-container">
      <header className="g-page-header">
        <div>
          <h1 className="g-page-title">Thư mời nhận việc (Offers)</h1>
          <p className="g-page-subtitle">Xem nội dung và phản hồi thư mời làm việc chính thức từ công ty</p>
        </div>
      </header>

      {error && (
        <div role="alert" className="alert alert-error" style={{ marginBottom: 16 }}>
          <FiAlertCircle style={{ marginRight: 8, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div role="alert" className="alert alert-success" style={{ marginBottom: 16, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
          <FiCheckCircle style={{ marginRight: 8, flexShrink: 0, fontSize: 18 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="g-card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Đang tải danh sách thư mời...
        </div>
      ) : offers.length === 0 ? (
        <div className="g-card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          <FiFileText size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px', color: '#334155' }}>Chưa có thư mời nhận việc nào</h3>
          <p style={{ margin: 0 }}>Khi nhà tuyển dụng hoàn tất đánh giá và phê duyệt đề xuất tuyển dụng, thư mời chính thức sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {offers.map(offer => {
            const isSentPending = offer.status === 'SENT' && !offer.is_expired;
            const isExpired = offer.is_expired || offer.status === 'EXPIRED';

            return (
              <article key={offer.id} className="g-card" style={{ padding: 0, overflow: 'hidden', margin: 0, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                {/* Header Banner */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  background: offer.status === 'ACCEPTED' ? '#f0fdf4' : offer.status === 'DECLINED' ? '#fef2f2' : '#f8fafc', 
                  borderBottom: '1px solid #e2e8f0' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 8, 
                      background: offer.status === 'ACCEPTED' ? '#dcfce7' : '#e0e7ff', 
                      color: offer.status === 'ACCEPTED' ? '#16a34a' : '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FiMail size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                        {offer.job_title}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Mã thư mời: <strong>{offer.offer_code}</strong>
                        {offer.department_name && <span> • Phòng ban: {offer.department_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(offer)}
                  </div>
                </div>

                {/* Offer Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '20px', fontSize: 14 }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiDollarSign /> Mức lương chính thức
                    </span>
                    <strong style={{ display: 'block', marginTop: 4, color: '#0f172a', fontSize: '1.05rem' }}>
                      {offer.salary_amount ? `${Number(offer.salary_amount).toLocaleString('vi-VN')} ${offer.currency || 'VND'}/tháng` : 'Theo thỏa thuận'}
                    </strong>
                    {offer.probation_salary && (
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        Thử việc (85%): {Number(offer.probation_salary).toLocaleString('vi-VN')} {offer.currency || 'VND'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiCalendar /> Ngày dự kiến nhận việc
                    </span>
                    <strong style={{ display: 'block', marginTop: 4, color: '#0f172a' }}>
                      {offer.start_date ? new Date(offer.start_date).toLocaleDateString('vi-VN') : 'Theo thỏa thuận'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiClock /> Hạn phản hồi
                    </span>
                    <strong style={{ display: 'block', marginTop: 4, color: isExpired ? '#dc2626' : '#0f172a' }}>
                      {offer.response_deadline ? new Date(offer.response_deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                      {isExpired && <span style={{ marginLeft: 6, fontSize: 12, color: '#dc2626' }}>(Đã quá hạn)</span>}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FiMapPin /> Địa điểm làm việc
                    </span>
                    <strong style={{ display: 'block', marginTop: 4, color: '#0f172a' }}>
                      {offer.work_location || 'Văn phòng chính'}
                    </strong>
                  </div>
                </div>

                {/* Benefits */}
                {offer.benefits && (
                  <div style={{ margin: '0 20px 16px', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #edf2f7' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiGift style={{ color: '#4f46e5' }} /> Chế độ đãi ngộ & Phúc lợi:
                    </div>
                    <div style={{ color: '#475569', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {offer.benefits}
                    </div>
                  </div>
                )}

                {/* Message */}
                {offer.message && (
                  <div style={{ margin: '0 20px 16px', padding: '12px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
                      Lời nhắn từ nhà tuyển dụng:
                    </div>
                    <div style={{ color: '#1e3a8a', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {offer.message}
                    </div>
                  </div>
                )}

                {/* Response Information if already answered */}
                {offer.candidate_response && (
                  <div style={{ 
                    margin: '0 20px 16px', 
                    padding: '12px 16px', 
                    background: offer.status === 'ACCEPTED' ? '#f0fdf4' : '#fef2f2', 
                    borderRadius: 8, 
                    border: `1px solid ${offer.status === 'ACCEPTED' ? '#bbf7d0' : '#fecaca'}` 
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: offer.status === 'ACCEPTED' ? '#166534' : '#991b1b', marginBottom: 4 }}>
                      Phản hồi của bạn {offer.responded_at ? `(${new Date(offer.responded_at).toLocaleString('vi-VN')})` : ''}:
                    </div>
                    <div style={{ color: offer.status === 'ACCEPTED' ? '#14532d' : '#7f1d1d', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                      {offer.candidate_response}
                    </div>
                  </div>
                )}

                {/* Expired alert if expired */}
                {isExpired && offer.status !== 'ACCEPTED' && offer.status !== 'DECLINED' && (
                  <div style={{ margin: '0 20px 16px', padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #fecaca' }}>
                    <FiAlertCircle size={18} /> <strong>Offer đã hết hạn:</strong> Thư mời nhận việc này đã hết hạn phản hồi vào ngày {new Date(offer.response_deadline).toLocaleDateString('vi-VN')}. Hệ thống đã vô hiệu hóa chức năng phản hồi.
                  </div>
                )}

                {/* Action Buttons: Khi offer đang chờ phản hồi */}
                {isSentPending && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '14px 20px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #e2e8f0' 
                  }}>
                    <button
                      type="button"
                      onClick={() => openDeclineModal(offer)}
                      style={{
                        padding: '9px 18px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      Từ chối Offer
                    </button>
                    <button
                      type="button"
                      onClick={() => openAcceptModal(offer)}
                      style={{
                        padding: '9px 20px',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                      }}
                    >
                      <FiCheckCircle size={18} /> Chấp nhận Offer
                    </button>
                  </div>
                )}

                {/* Khi offer ĐÃ HẾT HẠN: Vô hiệu hóa nút và báo "Offer đã hết hạn" */}
                {isExpired && offer.status !== 'ACCEPTED' && offer.status !== 'DECLINED' && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '14px 20px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #e2e8f0' 
                  }}>
                    <button
                      disabled
                      title="Offer đã hết hạn phản hồi"
                      style={{
                        padding: '9px 18px',
                        background: '#f1f5f9',
                        color: '#94a3b8',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'not-allowed'
                      }}
                    >
                      Từ chối Offer
                    </button>
                    <button
                      disabled
                      title="Offer đã hết hạn phản hồi"
                      style={{
                        padding: '9px 20px',
                        background: '#e2e8f0',
                        color: '#94a3b8',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'not-allowed'
                      }}
                    >
                      Chấp nhận Offer
                    </button>
                  </div>
                )}

                {/* Khi offer ĐÃ ĐƯỢC PHẢN HỒI TRƯỚC ĐÓ: Khóa nút, hiển thị trạng thái đã phản hồi */}
                {(offer.status === 'ACCEPTED' || offer.status === 'DECLINED') && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 20px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #e2e8f0',
                    fontSize: 13,
                    color: '#64748b'
                  }}>
                    <span>Trạng thái: <strong>{offer.status === 'ACCEPTED' ? 'Đã chấp nhận Offer' : 'Đã từ chối Offer'}</strong> (Đã khóa phản hồi)</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL TỪ CHỐI THƯ MỜI (Bắt buộc nhập lý do) */}
      {declineModalOpen && selectedOffer && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: 520, padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiAlertCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Từ chối thư mời nhận việc</h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{selectedOffer.job_title} ({selectedOffer.offer_code})</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeDeclineModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleDeclineSubmit}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 12px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
                  Bạn có chắc chắn muốn từ chối thư mời nhận việc này? Vui lòng cung cấp lý do để nhà tuyển dụng ghi nhận kết quả phản hồi.
                </p>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 6 }}>
                  Lý do từ chối <span style={{ color: '#dc2626' }}>* (Bắt buộc)</span>:
                </label>
                <textarea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => {
                    setDeclineReason(e.target.value);
                    if (declineError) setDeclineError('');
                  }}
                  placeholder="Ví dụ: Đã nhận được offer khác phù hợp hơn với định hướng cá nhân / Mức đãi ngộ chưa đạt kỳ vọng..."
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: `1px solid ${declineError ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: 14,
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
                {declineError && (
                  <div style={{ color: '#dc2626', fontSize: 13, marginTop: 4 }}>
                    {declineError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={closeDeclineModal}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#dc2626',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHẤP NHẬN THƯ MỜI */}
      {acceptModalOpen && selectedOffer && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: 500, padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Xác nhận nhận việc</h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{selectedOffer.job_title}</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={closeAcceptModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20 }}
              >
                <FiX />
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Bạn sắp xác nhận chấp nhận Thư mời nhận việc cho vị trí <strong>{selectedOffer.job_title}</strong>.
              </p>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569' }}>
                <div>• Mức lương: <strong>{Number(selectedOffer.salary_amount || selectedOffer.basic_salary || 0).toLocaleString('vi-VN')} {selectedOffer.currency || 'VND'}/tháng</strong></div>
                <div style={{ marginTop: 4 }}>• Ngày bắt đầu làm việc dự kiến: <strong>{selectedOffer.start_date ? new Date(selectedOffer.start_date).toLocaleDateString('vi-VN') : 'Theo thông báo của HR'}</strong></div>
                <div style={{ marginTop: 4 }}>• Địa điểm: <strong>{selectedOffer.work_location || 'Văn phòng chính'}</strong></div>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: 13, color: '#059669', fontWeight: 500 }}>
                Sau khi xác nhận, hồ sơ của bạn sẽ chuyển sang quy trình Onboarding và bộ phận Nhân sự sẽ chuẩn bị đón tiếp bạn vào ngày làm việc đầu tiên!
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
              <button
                type="button"
                onClick={closeAcceptModal}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Xem lại
              </button>
              <button
                type="button"
                onClick={handleAcceptSubmit}
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#16a34a',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <FiCheckCircle size={16} /> {submitting ? 'Đang xác nhận...' : 'Đồng ý nhận việc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateOffers;