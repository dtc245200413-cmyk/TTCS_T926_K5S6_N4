import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import candidateApi from '../../api/candidateApi';
import CandidateRatingModal from '../../components/CandidateRatingModal';

const CandidateList = () => {
  const { user } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [candidateSources, setCandidateSources] = useState([]);
  const [ratingCandidate, setRatingCandidate] = useState(null);
  const [ratingSummaries, setRatingSummaries] = useState({});
  const [ratingUpdates, setRatingUpdates] = useState({});
  const [ratingNotice, setRatingNotice] = useState('');
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const canRate = user?.roles?.some(role => ['RECRUITER', 'HR_MANAGER', 'ADMIN'].includes(role.role_code));
  const canViewRatings = canRate || user?.roles?.some(role => role.role_code === 'HIRING_MANAGER');

  const fetchCandidates = async () => {
    try {
      const response = await candidateApi.getAll();
      setCandidates(response.data.data);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const response = await axiosClient.get('/master-data');
      const md = response.data.data;
      setRejectionReasons(md.filter(x => x.category_group === 'REJECTION_REASON'));
      setCandidateSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchRejectionReasons();
  }, []);

  useEffect(() => {
    if (!canViewRatings) return;
    const controller = new AbortController();
    let nextIndex = 0;
    setRatingSummaries({});
    // Existing API exposes ratings per candidate only. Bound concurrent requests.
    const loadSummaries = async () => {
      while (!controller.signal.aborted && nextIndex < candidates.length) {
        const candidate = candidates[nextIndex++];
        try {
          const response = await candidateApi.getRatings(candidate.id, controller.signal);
          if (!controller.signal.aborted) {
            const { average_rating, rating_count } = response.data.data;
            setRatingSummaries(current => ({ ...current, [candidate.id]: { average_rating, rating_count } }));
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            setRatingSummaries(current => ({ ...current, [candidate.id]: { error: error.response?.data?.message || 'Không thể tải điểm đánh giá.' } }));
          }
        }
      }
    };
    for (let i = 0; i < Math.min(4, candidates.length); i++) loadSummaries();
    return () => controller.abort();
  }, [candidates, canViewRatings, user?.user_id, summaryAttempt]);

  const renderRatingSummary = candidate => {
    // A response from an older list request must not overwrite a newly saved score.
    const summary = ratingUpdates[candidate.id] || ratingSummaries[candidate.id];
    if (!summary) return <span role="status">Đang tải điểm...</span>;
    if (summary.error) return (
      <div className="candidate-rating-error">
        <p>{summary.error}</p>
        <button type="button" className="candidate-rating-button" onClick={() => setSummaryAttempt(value => value + 1)}>Tải lại điểm</button>
      </div>
    );
    if (!summary.rating_count || summary.average_rating == null) return <p>Chưa có đánh giá</p>;
    const average = Number(summary.average_rating);
    const filled = Math.max(0, Math.min(5, Math.round(average)));
    return <p className="candidate-rating-display" aria-label={`${average.toFixed(1)} trên 5 sao, ${summary.rating_count} đánh giá`}>
      <span aria-hidden="true">{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span> {average.toFixed(1)} ({summary.rating_count} đánh giá)
    </p>;
  };

  const handleRatingSaved = (candidateId, data) => {
    setRatingUpdates(current => ({ ...current, [candidateId]: { average_rating: data.average_rating, rating_count: data.rating_count } }));
    setRatingCandidate(null);
    setRatingNotice('Đã lưu đánh giá thành công.');
  };

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
      await candidateApi.updateStatus(selectedCandidate.id, {
        status: 'REJECTED',
        rejection_reason_code: rejectReason
      });
      setShowRejectModal(false);
      fetchCandidates();
    } catch (error) {
      setRejectError('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleHire = async (candidate) => {
    if (window.confirm(`Bạn có chắc chắn muốn tuyển dụng ứng viên ${candidate.full_name}?`)) {
      try {
        await candidateApi.updateStatus(candidate.id, {
          status: 'HIRED'
        });
        fetchCandidates();
      } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="g-page-title">Quản lý Hồ sơ Ứng viên</h1>
            <p className="g-page-subtitle">Theo dõi và quản lý ứng viên trên toàn hệ thống</p>
          </div>
          <Link to="/candidates/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s' }}>
            <span>+</span> Thêm Ứng viên
          </Link>
        </div>

        {canViewRatings && ratingNotice && <div className="candidate-rating-success" role="status">{ratingNotice}</div>}
        {/* Content */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
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
                  {canViewRatings && <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Đánh giá ứng viên</th>}
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
                    <td style={{ padding: '16px', color: '#4f46e5', fontWeight: '600' }}>
                      {candidateSources.find(s => s.code === cand.source_code)?.name || cand.source_code || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>{getStatusBadge(cand.status)}</td>
                    {canViewRatings && <td className="candidate-rating-cell" style={{ padding: '16px' }}>
                      {renderRatingSummary(cand)}
                      {cand.status === 'REJECTED'
                        ? <small className="candidate-rating-hint">Hồ sơ đã đánh trượt</small>
                        : canRate && <button type="button" className="candidate-rating-button candidate-rating-primary" onClick={() => { setRatingCandidate(cand); setRatingNotice(''); }}>Đánh giá</button>}
                    </td>}
                    <td style={{ padding: '16px' }}>
                      {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {user?.roles?.some(r => r.role_code === 'HR_MANAGER') && (
                            <button 
                              onClick={() => handleHire(cand)}
                              style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                            >
                              Tuyển dụng
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenReject(cand)}
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                          >
                            Đánh trượt
                          </button>
                        </div>
                      )}
                      {cand.status === 'REJECTED' && cand.rejection_reason_code && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>
                          Lý do: {rejectionReasons.find(r => r.code === cand.rejection_reason_code)?.name || cand.rejection_reason_code}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {canRate && ratingCandidate && <CandidateRatingModal key={ratingCandidate.id} candidate={ratingCandidate} onClose={() => setRatingCandidate(null)} onSaved={handleRatingSaved} />}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.2rem' }}>Đánh trượt Ứng viên</h3>
            <p className="g-page-subtitle">Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Vui lòng chọn lý do từ danh mục chung.</p>
            
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
