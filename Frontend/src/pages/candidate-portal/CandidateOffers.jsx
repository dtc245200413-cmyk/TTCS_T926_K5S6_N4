import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiMail } from 'react-icons/fi';

const API = 'http://localhost:5000/api/candidate-portal';

const CandidateOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` };

  const load = async () => {
    try {
      const response = await axios.get(`${API}/offers`, { headers });
      setOffers(response.data.data || []);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải thư mời.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const respond = async (offer, status) => {
    const response = status === 'DECLINED' ? window.prompt('Nhập lý do từ chối thư mời:') : '';
    if (response === null) return;
    try {
      await axios.patch(`${API}/offers/${offer.id}/respond`, { status, response }, { headers });
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể gửi phản hồi thư mời.'); }
  };

  return (
    <div className="g-page-container">
      <header className="g-page-header"><div><h1 className="g-page-title">Thư mời nhận việc</h1><p className="g-page-subtitle">Xem nội dung và phản hồi lời mời từ TechCorp</p></div></header>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {loading ? <div className="g-card">Đang tải thư mời...</div> : offers.length === 0 ? <div className="g-card" style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Chưa có thư mời nhận việc.</div> : <div style={{ display: 'grid', gap: 12 }}>{offers.map(offer => <article key={offer.id} className="g-card" style={{ padding: 0, overflow: 'hidden', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 16px', color: '#14532d', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><FiCheckCircle size={20} /><div><strong>Thư mời nhận việc</strong><div style={{ fontSize: 12 }}>{offer.job_title}</div></div></div><span className={`badge ${offer.status === 'ACCEPTED' ? 'badge-success' : offer.status === 'DECLINED' ? 'badge-error' : 'badge-warning'}`}>{offer.status === 'ACCEPTED' ? 'Đã chấp nhận' : offer.status === 'DECLINED' ? 'Đã từ chối' : 'Đang chờ phản hồi'}</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, padding: 16, fontSize: 13 }}>
          <div><span style={{ color: '#64748b' }}>Phòng ban</span><strong style={{ display: 'block', marginTop: 3 }}>{offer.department_name || '-'}</strong></div>
          <div><span style={{ color: '#64748b' }}>Mức lương</span><strong style={{ display: 'block', marginTop: 3 }}>{offer.salary_amount ? `${Number(offer.salary_amount).toLocaleString('vi-VN')} ${offer.currency || 'VND'}/tháng` : 'Theo thỏa thuận'}</strong></div>
          <div><span style={{ color: '#64748b' }}>Ngày bắt đầu</span><strong style={{ display: 'block', marginTop: 3 }}>{offer.start_date ? new Date(offer.start_date).toLocaleDateString('vi-VN') : 'Theo thỏa thuận'}</strong></div>
          <div><span style={{ color: '#64748b' }}>Hạn phản hồi</span><strong style={{ display: 'block', marginTop: 3 }}>{offer.response_deadline ? new Date(offer.response_deadline).toLocaleDateString('vi-VN') : '-'}</strong></div>
        </div>
        {offer.message && <div style={{ margin: '0 16px 12px', padding: 12, background: '#f8fafc', borderRadius: 6, color: '#475569', fontSize: 13, whiteSpace: 'pre-wrap' }}>{offer.message}</div>}
        {offer.status === 'PENDING_RESPONSE' && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '0 16px 14px' }}><button className="btn-action-delete" onClick={() => respond(offer, 'DECLINED')}>Từ chối</button><button className="g-btn-primary" onClick={() => respond(offer, 'ACCEPTED')}><FiMail /> Chấp nhận</button></div>}
      </article>)}</div>}
    </div>
  );
};

export default CandidateOffers;