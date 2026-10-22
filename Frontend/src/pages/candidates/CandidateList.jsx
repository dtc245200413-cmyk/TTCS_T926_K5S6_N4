import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { FiDownload, FiEye, FiX, FiFileText, FiUser, FiGrid, FiList, FiUsers, FiStar, FiClock } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateApi from '../../api/candidateApi';
import CandidateRatingModal from '../../components/CandidateRatingModal';
import { getCandidateCvData } from '../../utils/candidateCvHelper';
import { candidateProfileAccess } from '../../utils/candidateProfile';
import CandidateKanbanBoard from '../../components/candidates/CandidateKanbanBoard';

const CandidateList = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const stageParam = searchParams.get('stage');
  const viewParam = searchParams.get('view');
  const isOfferOnboarding = stageParam === 'OFFER';
  const isEvaluatedView = viewParam === 'evaluated';
  const isInterviewer = Boolean(
    user?.roles?.some(r => 
      r.role_code === 'INTERVIEWER' || 
      r.role_code === 'NGUOI_PHONG_VAN' || 
      (r.role_name && r.role_name.toLowerCase().includes('phỏng vấn')) ||
      (r.role_name && r.role_name.toLowerCase().includes('interviewer'))
    ) || 
    user?.job_title?.toLowerCase().includes('phỏng vấn') || 
    user?.job_title?.toLowerCase().includes('interviewer') || 
    user?.company_email === 'dtc245200571@ictu.edu.vn'
  );

  const { canManage } = candidateProfileAccess(user);
  const canRate = canManage;
  const canViewRatings = candidateProfileAccess(user).canView;

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [candidateSources, setCandidateSources] = useState([]);
  const [activeMerges, setActiveMerges] = useState([]);
  const [mergeError, setMergeError] = useState('');
  const [showCvModal, setShowCvModal] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [cvData, setCvData] = useState(null);

  // Candidate rating states (SCRUM-129)
  const [ratingCandidate, setRatingCandidate] = useState(null);
  const [ratingSummaries, setRatingSummaries] = useState({});
  const [ratingUpdates, setRatingUpdates] = useState({});
  const [ratingNotice, setRatingNotice] = useState('');
  const [summaryAttempt, setSummaryAttempt] = useState(0);

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = response.data?.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      setCandidates(list);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/master-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const md = response.data.data;
      setRejectionReasons(md.filter(x => x.category_group === 'REJECTION_REASON'));
      setCandidateSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveMerges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/candidates/merges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveMerges(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidate merges', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchRejectionReasons();
    fetchActiveMerges();
  }, []);

  // Background rating fetch
  useEffect(() => {
    if (!canViewRatings || !candidates.length) return;
    const controller = new AbortController();
    candidates.forEach(async (candidate) => {
      try {
        const response = await candidateApi.getRatings(candidate.id, controller.signal);
        const { average_rating, rating_count } = response.data.data;
        setRatingSummaries(current => ({ ...current, [candidate.id]: { average_rating, rating_count } }));
      } catch (error) {
        if (!controller.signal.aborted) {
          setRatingSummaries(current => ({ ...current, [candidate.id]: { error: error.response?.data?.message || 'Không thể tải điểm đánh giá.' } }));
        }
      }
    });
    return () => controller.abort();
  }, [candidates, canViewRatings, user?.user_id, summaryAttempt]);

  const renderRatingSummary = candidate => {
    const summary = ratingUpdates[candidate.id] || ratingSummaries[candidate.id];
    if (!summary) return <span style={{ color: '#94a3b8', fontSize: 12 }}>Đang tải...</span>;
    if (summary.error) {
      return (
        <div style={{ fontSize: 12, color: '#ef4444' }}>
          <span>{summary.error}</span>{' '}
          <button type="button" onClick={() => setSummaryAttempt(value => value + 1)} style={{ textDecoration: 'underline', background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', fontSize: 11 }}>Tải lại</button>
        </div>
      );
    }
    if (!summary.rating_count || summary.average_rating == null) {
      return <span style={{ color: '#94a3b8', fontSize: 12 }}>Chưa có đánh giá</span>;
    }
    const average = Number(summary.average_rating);
    const filled = Math.min(5, Math.max(0, Math.round(average)));
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <span style={{ color: '#f59e0b' }}>{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{average.toFixed(1)}</span>
        <span style={{ color: '#64748b' }}>({summary.rating_count})</span>
      </div>
    );
  };

  const handleRatingSaved = (candidateId, data) => {
    setRatingUpdates(current => ({
      ...current,
      [candidateId]: { average_rating: data.average_rating, rating_count: data.rating_count }
    }));
    setRatingCandidate(null);
    setRatingNotice('Đã lưu đánh giá thành công.');
    setTimeout(() => setRatingNotice(''), 4000);
  };

  const undoCandidateMerge = async (merge) => {
    if (!window.confirm(`Hoàn tác gộp ${merge.secondary_name} khỏi hồ sơ ${merge.primary_name}?`)) return;
    setMergeError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/candidates/merges/${merge.id}/undo`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setMergeError(err.response?.data?.message || 'Không thể hoàn tác gộp hồ sơ.');
    }
  };

  const openCvModal = (candidate) => {
    setViewingCandidate(candidate);
    setCvData(getCandidateCvData(candidate));
    setShowCvModal(true);
  };

  const downloadResume = async (candidate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/candidates/${candidate.id}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const extension = (candidate.resume_url && candidate.resume_url.includes('.')) 
        ? candidate.resume_url.substring(candidate.resume_url.lastIndexOf('.')) 
        : '.pdf';
      anchor.download = `CV-${candidate.full_name || candidate.id}${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      alert('Không thể tải CV của ứng viên: ' + (error.response?.data?.message || error.message || 'Lỗi tải tệp'));
    }
  };

  const getStatusBadge = (status) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      lineHeight: 1.2
    };

    switch (status) {
      case 'NEW':
        return <span style={{ ...baseStyle, background: '#dbeafe', color: '#1d4ed8' }}>Mới</span>;
      case 'SCREENING':
        return <span style={{ ...baseStyle, background: '#f3e8ff', color: '#7e22ce' }}>Sàng lọc</span>;
      case 'INTERVIEW':
      case 'INTERVIEWING':
        return <span style={{ ...baseStyle, background: '#fef3c7', color: '#d97706' }}>Phỏng vấn</span>;
      case 'OFFER':
      case 'OFFERED':
        return <span style={{ ...baseStyle, background: '#e0e7ff', color: '#4338ca' }}>Đề nghị (Offer)</span>;
      case 'HIRED':
        return <span style={{ ...baseStyle, background: '#dcfce7', color: '#16a34a' }}>Đã tuyển</span>;
      case 'REJECTED':
        return <span style={{ ...baseStyle, background: '#fee2e2', color: '#dc2626' }}>Đánh trượt</span>;
      default:
        return <span style={{ ...baseStyle, background: '#f1f5f9', color: '#475569' }}>{status}</span>;
    }
  };

  const handleOpenReject = (candidate) => {
    setSelectedCandidate(candidate);
    setShowRejectModal(true);
    setRejectReason('');
    setRejectNote('');
    setRejectError('');
  };

  const handleUpdateCandidateStatus = async (candidateId, newStatus, rejectionReasonCode = null, rejectionNoteParam = null) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/candidates/${candidateId}/status`, {
        status: newStatus,
        rejection_reason_code: rejectionReasonCode,
        rejection_note: rejectionNoteParam
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCandidates();
    } catch (error) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const submitReject = async () => {
    if (!rejectReason) {
      setRejectError('Vui lòng chọn lý do loại hồ sơ');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/candidates/${selectedCandidate.id}/status`, {
        status: 'REJECTED',
        rejection_reason_code: rejectReason,
        rejection_note: rejectNote
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
        const token = localStorage.getItem('token');
        await axios.put(`${API_BASE_URL}/candidates/${candidate.id}/status`, {
          status: 'HIRED'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCandidates();
      } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }
  };

  const displayedCandidates = isOfferOnboarding
    ? candidates.filter(c => c.status === 'OFFERED' || c.status === 'HIRED' || c.status === 'OFFER')
    : (isEvaluatedView
      ? candidates.filter(c => ['INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'].includes(c.status) || (ratingSummaries[c.id]?.rating_count > 0))
      : candidates);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff',
          padding: '16px 24px',
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: isOfferOnboarding ? '#4338ca' : (isEvaluatedView ? '#059669' : '#2563eb'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: 22,
              boxShadow: isOfferOnboarding ? '0 4px 10px rgba(67,56,202,0.25)' : '0 4px 10px rgba(37,99,235,0.25)'
            }}>
              {isOfferOnboarding ? <FiFileText /> : (isEvaluatedView ? <FiClock /> : <FiUsers />)}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isOfferOnboarding 
                  ? 'Quản lý Offer & Onboarding' 
                  : (isEvaluatedView 
                      ? 'Lịch sử Đánh giá Ứng viên' 
                      : (isInterviewer ? 'Phiếu đánh giá Ứng viên' : 'Quản lý Hồ sơ Ứng viên'))}
              </h1>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>
                {isOfferOnboarding 
                  ? 'Theo dõi quy trình gửi thư mời nhận việc (Offer), phản hồi và tiến độ tiếp nhận nhân viên mới (Onboarding)' 
                  : (isEvaluatedView
                      ? 'Danh sách ứng viên đã hoàn tất đánh giá và cho điểm phỏng vấn'
                      : (isInterviewer 
                          ? 'Đánh giá năng lực và phản hồi kết quả phỏng vấn ứng viên'
                          : 'Theo dõi tiến độ tuyển dụng qua bảng Pipeline Kanban hoặc danh sách chi tiết'))}
              </p>
            </div>
          </div>

          {!isOfferOnboarding && !isInterviewer && (
            <Link
              to="/candidates/create"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#2563eb',
                color: '#ffffff',
                padding: '9px 18px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 13,
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                transition: 'background 0.15s ease'
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Thêm ứng viên
            </Link>
          )}
        </div>

        {activeMerges.length > 0 && !isOfferOnboarding && (
          <section style={{ padding: 18, background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#334155' }}>Hồ sơ đã gộp gần đây</h2>
            {mergeError && <div role="alert" style={{ marginBottom: 10, color: '#b91c1c' }}>{mergeError}</div>}
            <div style={{ display: 'grid', gap: 8 }}>
              {activeMerges.map(merge => {
                const canUndo = Number(merge.hours_since_merge) < 24;
                return (
                  <div key={merge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                    <span>{merge.secondary_name} đã gộp vào {merge.primary_name} · {canUndo ? 'còn trong 24 giờ' : 'đã quá 24 giờ'}</span>
                    {canUndo && <button type="button" onClick={() => undoCandidateMerge(merge)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Hoàn tác</button>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Content Area */}
        {loading ? (
          <div style={{ background: '#fff', padding: '40px', textAlign: 'center', color: '#64748b', borderRadius: 16 }}>
            Đang tải dữ liệu hồ sơ ứng viên...
          </div>
        ) : viewMode === 'kanban' ? (
          <CandidateKanbanBoard
            candidates={displayedCandidates}
            rejectionReasons={rejectionReasons}
            candidateSources={candidateSources}
            onUpdateStatus={handleUpdateCandidateStatus}
            openCvModal={openCvModal}
            downloadResume={downloadResume}
            user={user}
            viewMode={viewMode}
            setViewMode={setViewMode}
            visibleStages={isOfferOnboarding ? ['OFFERED', 'HIRED'] : null}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* View Mode Switcher bar in Table View */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    color: '#64748b'
                  }}
                >
                  <FiGrid size={14} /> Pipeline Kanban
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: '1px solid #3b82f6',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb'
                  }}
                >
                  <FiList size={14} /> Danh sách
                </button>
              </div>
            </div>

            {canViewRatings && ratingNotice && (
              <div style={{ padding: '10px 14px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 8, fontSize: 13 }}>
                {ratingNotice}
              </div>
            )}

            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              {displayedCandidates.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {isOfferOnboarding ? 'Chưa có ứng viên nào ở giai đoạn Đề xuất Offer hoặc Nhận việc.' : 'Bạn chưa có hồ sơ ứng viên nào.'}
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '920px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Họ Tên</th>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Email</th>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Vị trí ứng tuyển</th>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nguồn</th>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>CV</th>
                        {canViewRatings && <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Đánh giá</th>}
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '120px' }}>Trạng thái</th>
                        <th style={{ padding: '12px 14px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '220px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedCandidates.map(cand => (
                        <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 12px', color: '#1e293b', fontWeight: '600' }}>{cand.full_name}</td>
                          <td style={{ padding: '14px 12px', color: '#475569' }}>{cand.email}</td>
                          <td style={{ padding: '14px 12px', color: '#475569' }}>
                            {cand.position_name ? `${cand.position_name} - ${cand.department_name}` : 'N/A'}
                          </td>
                          <td style={{ padding: '14px 12px', color: '#4f46e5', fontWeight: '600' }}>
                            {candidateSources.find(s => s.code === cand.source_code)?.name || cand.source_code || '-'}
                          </td>
                          <td style={{ padding: '14px 12px' }}>
                            {cand.resume_url ? (
                              <button 
                                type="button" 
                                onClick={() => openCvModal(cand)} 
                                className="btn-action-view"
                                style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                                title="Xem trước CV"
                              >
                                <FiEye /> Xem CV
                              </button>
                            ) : '-'}
                          </td>
                          {canViewRatings && (
                            <td style={{ padding: '14px 12px' }}>
                              {renderRatingSummary(cand)}
                            </td>
                          )}
                          <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                            {getStatusBadge(cand.status)}
                            {cand.sla_overdue === 1 && <span style={{ display: 'inline-block', marginLeft: 6, padding: '4px 8px', borderRadius: 20, background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Quá SLA</span>}
                          </td>
                          <td style={{ padding: '14px 12px', minWidth: '220px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {candidateProfileAccess(user).canView && (
                                <Link to={`/candidates/${cand.id}`} style={{ color: '#4f46e5', fontWeight: '600', textDecoration: 'none', whiteSpace: 'nowrap' }}>Xem hồ sơ</Link>
                              )}
                              <Link
                                to={`/candidate-evaluations/${cand.id}`}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #c7d2fe',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  textDecoration: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Đánh giá & Duyệt
                              </Link>
                              {canViewRatings && (
                                <button
                                  type="button"
                                  onClick={() => setRatingCandidate(cand)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: cand.status === 'REJECTED' ? '1px solid #e2e8f0' : '1px solid #fde68a',
                                    background: cand.status === 'REJECTED' ? '#f8fafc' : '#fefce8',
                                    color: cand.status === 'REJECTED' ? '#64748b' : '#b45309',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={cand.status === 'REJECTED' ? 'Xem điểm đánh giá (Hồ sơ đã bị đánh trượt)' : 'Đánh giá ứng viên'}
                                >
                                  <FiStar size={12} /> {canRate && cand.status !== 'REJECTED' ? 'Đánh giá' : 'Xem điểm'}
                                </button>
                              )}
                              {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                                <>
                                  {user?.roles?.some(r => r.role_code === 'HR_MANAGER') && (
                                    <button 
                                      onClick={() => handleHire(cand)}
                                      style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                    >
                                      Tuyển dụng
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleOpenReject(cand)}
                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                  >
                                    Đánh trượt
                                  </button>
                                </>
                              )}
                              {cand.status === 'REJECTED' && cand.rejection_reason_code && (
                                <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic', display: 'block', width: '100%', marginTop: '2px' }}>
                                  Lý do: {rejectionReasons.find(r => r.code === cand.rejection_reason_code)?.name || cand.rejection_reason_code}
                                </span>
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
        )}

      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '1.2rem', fontWeight: 800 }}>Đánh trượt Ứng viên</h3>
            <p className="g-page-subtitle" style={{ margin: '0 0 16px' }}>Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Vui lòng chọn lý do từ danh mục chung.</p>
            
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Lý do loại hồ sơ <span style={{ color: '#ef4444' }}>*</span></label>
            <select 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', outline: 'none' }}
            >
              <option value="">-- Chọn lý do --</option>
              {rejectionReasons.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Ghi chú chi tiết (Tùy chọn)</label>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Ghi chú chi tiết lý do loại..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px', outline: 'none', resize: 'vertical' }}
            />

            {rejectError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{rejectError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
              <button onClick={submitReject} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Xác nhận Trượt</button>
            </div>
          </div>
        </div>
      )}

      {/* CV Preview Modal */}
      {showCvModal && cvData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '820px',
            maxWidth: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>
                XEM TRƯỚC HỒ SƠ ỨNG VIÊN
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => downloadResume(viewingCandidate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <FiDownload /> Tải xuống PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '740px', margin: '0 auto', fontFamily: 'inherit' }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', color: '#4b5563', textTransform: 'uppercase', marginBottom: '8px' }}>
                  TECHCORP / HỒ SƠ ỨNG VIÊN
                </div>

                {/* Candidate Name & Avatar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0, lineHeight: 1.2 }}>
                      {cvData.fullName}
                    </h1>
                    <div style={{ fontSize: '15px', color: '#4b5563', marginTop: '6px' }}>
                      Ứng tuyển: {cvData.appliedPosition}
                    </div>
                  </div>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '1.5px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    <FiUser />
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0 22px 0' }} />

                {/* 4-Item Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '40px', rowGap: '18px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Email</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Số điện thoại</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Địa chỉ</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.address}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Kinh nghiệm</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.experience}</div>
                  </div>
                </div>

                {/* Giới thiệu bản thân */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Giới thiệu bản thân
                </h3>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                  {cvData.bio}
                </p>

                {/* Học vấn */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Học vấn
                </h3>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                  {cvData.educationSchool}
                </div>
                <div style={{ fontSize: '13.5px', color: '#6b7280' }}>
                  {cvData.educationMajor}
                </div>

                {/* Kỹ năng chuyên môn */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Kỹ năng chuyên môn
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {cvData.skills.map(s => (
                    <span key={s} style={{
                      display: 'inline-block',
                      padding: '6px 16px',
                      borderRadius: '9999px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      color: '#374151',
                      fontSize: '13.5px',
                      fontWeight: '500'
                    }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Kinh nghiệm làm việc */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Kinh nghiệm làm việc
                </h3>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                  {cvData.jobTitle}
                </div>
                <div style={{ fontSize: '13.5px', color: '#6b7280', marginBottom: '6px' }}>
                  {cvData.jobPeriod}
                </div>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  {cvData.jobDesc}
                </p>

                {/* Dự án tiêu biểu */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Dự án tiêu biểu
                </h3>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                  {cvData.projectDesc}
                </p>

                {/* Attachment Card */}
                <div style={{
                  marginTop: '32px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', fontSize: '20px' }}>
                      <FiFileText />
                    </div>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>
                        {cvData.attachmentFileName}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                        Tệp CV đính kèm (minh họa)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      type="button"
                      onClick={() => downloadResume(viewingCandidate)}
                      title="Tải CV"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#374151',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <FiDownload />
                    </button>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      color: '#4b5563',
                      fontSize: '12px',
                      fontWeight: '600',
                      letterSpacing: '0.04em'
                    }}>
                      PDF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setShowCvModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => downloadResume(viewingCandidate)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiDownload /> Tải xuống tệp PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Rating Modal */}
      {ratingCandidate && (
        <CandidateRatingModal
          candidate={ratingCandidate}
          canRate={canRate}
          readOnly={!canRate}
          onClose={() => setRatingCandidate(null)}
          onSaved={(candidateId, data) => handleRatingSaved(candidateId, data)}
          onRatingSaved={data => handleRatingSaved(ratingCandidate.id, data)}
        />
      )}
    </div>
  );
};

export default CandidateList;
