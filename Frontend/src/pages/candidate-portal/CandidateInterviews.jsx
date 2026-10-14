import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCalendar, FiCheck, FiMapPin, FiVideo } from 'react-icons/fi';

const API = 'http://localhost:5000/api/candidate-portal';
const interviewStatus = { SCHEDULED: ['Chờ xác nhận', 'badge-warning'], CONFIRMED: ['Đã xác nhận', 'badge-success'], RESCHEDULE_REQUESTED: ['Đã đề xuất đổi lịch', 'badge-info'], DECLINED: ['Đã từ chối', 'badge-error'], COMPLETED: ['Đã hoàn thành', 'badge-info'] };

const CandidateInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const headers = { Authorization: `Bearer ${localStorage.getItem('candidate_token')}` };

  const load = async () => {
    try {
      const response = await axios.get(`${API}/interviews`, { headers });
      setInterviews(response.data.data || []);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể tải lịch phỏng vấn.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const respond = async (interview, status) => {
    const response = status === 'RESCHEDULE_REQUESTED' || status === 'DECLINED'
      ? window.prompt(status === 'DECLINED' ? 'Nhập lý do từ chối:' : 'Nhập khung giờ bạn muốn đề xuất:')
      : '';
    if (response === null) return;
    setBusyId(interview.id);
    setError('');
    try {
      await axios.patch(`${API}/interviews/${interview.id}/respond`, { status, response }, { headers });
      await load();
    } catch (requestError) { setError(requestError.response?.data?.message || 'Không thể gửi phản hồi lịch.'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="g-page-container">
      <header className="g-page-header"><div><h1 className="g-page-title">Lịch phỏng vấn</h1><p className="g-page-subtitle">Xem lịch và phản hồi lời mời phỏng vấn</p></div></header>
      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {loading ? <div className="g-card">Đang tải lịch...</div> : interviews.length === 0 ? <div className="g-card" style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Chưa có lịch phỏng vấn được sắp xếp.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>{interviews.map(interview => {
          const [statusName, badgeClass] = interviewStatus[interview.status] || [interview.status, 'badge-info'];
          const canRespond = ['SCHEDULED', 'RESCHEDULE_REQUESTED'].includes(interview.status);
          return <article key={interview.id} className="g-card" style={{ padding: 16, margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}><div><h2 style={{ margin: 0, fontSize: 17 }}>Phỏng vấn vị trí: {interview.job_title}</h2><span className={`badge ${badgeClass}`} style={{ display: 'inline-block', marginTop: 7 }}>{statusName}</span></div><FiCalendar size={20} color="#2563eb" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginTop: 14, color: '#475569', fontSize: 13 }}>
              <div><strong>Thời gian</strong><div>{new Date(interview.starts_at).toLocaleString('vi-VN')}{interview.ends_at ? ` – ${new Date(interview.ends_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}</div></div>
              <div><strong>Hình thức</strong><div>{interview.mode === 'ONLINE' ? 'Trực tuyến' : 'Trực tiếp tại văn phòng'}</div></div>
              <div><strong>Địa điểm</strong><div>{interview.location || (interview.mode === 'ONLINE' ? 'Link họp bên dưới' : '-')}</div></div>
              <div><strong>Người phỏng vấn</strong><div>{interview.interviewer_name || 'Bộ phận tuyển dụng'}</div></div>
            </div>
            {interview.notes && <p style={{ margin: '12px 0 0', color: '#475569', fontSize: 13 }}><strong>Ghi chú:</strong> {interview.notes}</p>}
            {interview.meeting_url && <a href={interview.meeting_url} target="_blank" rel="noreferrer" className="g-btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }}><FiVideo /> Mở phòng phỏng vấn</a>}
            {canRespond && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
              <button className="g-btn-secondary" disabled={busyId === interview.id} onClick={() => respond(interview, 'RESCHEDULE_REQUESTED')}>Đề xuất đổi lịch</button>
              <button className="btn-action-delete" disabled={busyId === interview.id} onClick={() => respond(interview, 'DECLINED')}>Từ chối</button>
              <button className="g-btn-primary" disabled={busyId === interview.id} onClick={() => respond(interview, 'CONFIRMED')}><FiCheck /> Xác nhận tham gia</button>
            </div>}
          </article>;
        })}</div>
      )}
    </div>
  );
};

export default CandidateInterviews;