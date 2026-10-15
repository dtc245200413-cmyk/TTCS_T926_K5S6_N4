import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiSearch, FiFilter, FiX, FiRefreshCw, FiCalendar, FiTag, 
  FiBriefcase, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, 
  FiExternalLink, FiPlus, FiStar, FiClock, FiCheckCircle, FiLayers,
  FiDownload, FiEye, FiFileText, FiUser
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import candidateApi from '../../api/candidateApi';
import CandidateRatingModal from '../../components/CandidateRatingModal';
import { getCandidateCvData } from '../../utils/candidateCvHelper';
import { candidateProfileAccess } from '../../utils/candidateProfile';

const CandidateList = () => {
  const { user } = useContext(AuthContext);
  const { canManage } = candidateProfileAccess(user);
  const canRate = canManage;
  const canViewRatings = candidateProfileAccess(user).canView;

  // Data states
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

  // Filter options loaded from API
  const [filterOptions, setFilterOptions] = useState({
    positions: [],
    stages: [],
    sources: [],
    tags: []
  });

  // Multi-criteria filter states (SCRUM-363)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [candidateSources, setCandidateSources] = useState([]);

  // Candidate rating states (SCRUM-129)
  const [ratingCandidate, setRatingCandidate] = useState(null);
  const [ratingSummaries, setRatingSummaries] = useState({});
  const [ratingUpdates, setRatingUpdates] = useState({});
  const [ratingNotice, setRatingNotice] = useState('');
  const [summaryAttempt, setSummaryAttempt] = useState(0);

  // Merge states (SCRUM-67)
  const [activeMerges, setActiveMerges] = useState([]);
  const [mergeError, setMergeError] = useState('');

  // CV preview modal
  const [showCvModal, setShowCvModal] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [cvData, setCvData] = useState(null);

  // Fetch candidates with all combined filters & pagination (SCRUM-364)
  const fetchCandidates = useCallback(async (pageOverride) => {
    try {
      setLoading(true);
      const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

      const params = {
        page: targetPage,
        limit: pageSize,
        search: searchTerm.trim() || undefined,
        position_id: selectedPosition || undefined,
        stage: selectedStage || undefined,
        source: selectedSource || undefined,
        tag: selectedTag || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      };

      const res = await candidateApi.getAll(params);
      const data = res.data.data;

      if (data && data.candidates) {
        setCandidates(data.candidates);
        setPagination(data.pagination || { total: data.candidates.length, page: targetPage, limit: pageSize, totalPages: 1 });
        if (data.filterOptions) {
          setFilterOptions(prev => ({
            positions: data.filterOptions.positions || prev.positions,
            stages: data.filterOptions.stages || prev.stages,
            sources: data.filterOptions.sources || prev.sources,
            tags: data.filterOptions.tags || prev.tags
          }));
        }
      } else if (Array.isArray(data)) {
        setCandidates(data);
        setPagination({ total: data.length, page: 1, limit: pageSize, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedPosition, selectedStage, selectedSource, selectedTag, fromDate, toDate]);

  const fetchMasterData = async () => {
    try {
      const response = await axiosClient.get('/master-data');
      const md = response.data.data || [];
      setRejectionReasons(md.filter(x => x.category_group === 'REJECTION_REASON'));
      setCandidateSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE'));
    } catch (err) {
      console.error('Failed to load master data', err);
    }
  };

  const fetchActiveMerges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosClient.get('/candidates/merges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveMerges(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidate merges', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchMasterData();
    if (canManage) fetchActiveMerges();
  }, [canManage]);

  // Load rating summaries in background
  useEffect(() => {
    if (!canViewRatings) return;
    const controller = new AbortController();
    let nextIndex = 0;
    setRatingSummaries({});
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
    return (
      <p className="candidate-rating-display" aria-label={`${average.toFixed(1)} trên 5 sao, ${summary.rating_count} đánh giá`}>
        <span aria-hidden="true">{'★'.repeat(filled)}{'☆'.repeat(5 - filled)}</span> {average.toFixed(1)} ({summary.rating_count} đánh giá)
      </p>
    );
  };

  const handleRatingSaved = (candidateId, data) => {
    setRatingUpdates(current => ({ ...current, [candidateId]: { average_rating: data.average_rating, rating_count: data.rating_count } }));
    setRatingCandidate(null);
    setRatingNotice('Đã lưu đánh giá thành công.');
  };

  const undoCandidateMerge = async (merge) => {
    if (!window.confirm(`Hoàn tác gộp ${merge.secondary_name} khỏi hồ sơ ${merge.primary_name}?`)) return;
    setMergeError('');
    try {
      const token = localStorage.getItem('token');
      await axiosClient.post(`/candidates/merges/${merge.id}/undo`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRatingUpdates({});
      await Promise.all([fetchCandidates(), fetchActiveMerges()]);
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
      const response = await axiosClient.get(`/candidates/${candidate.id}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const cvPath = candidate.resume_url || candidate.cv_file_path || '';
      const extension = (cvPath && cvPath.includes('.'))
        ? cvPath.substring(cvPath.lastIndexOf('.'))
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

  // Rejection submit
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
      await candidateApi.updateStatus(selectedCandidate.id, 'REJECTED', rejectReason);
      setShowRejectModal(false);
      fetchCandidates();
    } catch (error) {
      setRejectError('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  // Direct Hire
  const handleHire = async (candidate) => {
    if (window.confirm(`Bạn có chắc chắn muốn tuyển dụng ứng viên ${candidate.full_name}?`)) {
      try {
        await candidateApi.updateStatus(candidate.id, 'HIRED');
        fetchCandidates();
      } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedPosition('');
    setSelectedStage('');
    setSelectedSource('');
    setSelectedTag('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // Quick date presets
  const handleQuickDate = (preset) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      setFromDate(formatDate(today));
      setToDate(formatDate(today));
    } else if (preset === '7days') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      setFromDate(formatDate(past7));
      setToDate(formatDate(today));
    } else if (preset === '30days') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setFromDate(formatDate(past30));
      setToDate(formatDate(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDate(firstDay));
      setToDate(formatDate(today));
    }
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dbeafe', color: '#1d4ed8' }}>Mới</span>;
      case 'SCREENING':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#e0e7ff', color: '#4338ca' }}>Sàng lọc CV</span>;
      case 'INTERVIEWING':
      case 'INTERVIEW':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef3c7', color: '#d97706' }}>Phỏng vấn</span>;
      case 'OFFERED':
      case 'OFFER':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#ede9fe', color: '#6d28d9' }}>Đề nghị (Offer)</span>;
      case 'HIRED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#16a34a' }}>Đã tuyển</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>Đánh trượt</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569' }}>{status}</span>;
    }
  };

  const activeFiltersCount = [
    searchTerm,
    selectedPosition,
    selectedStage,
    selectedSource,
    selectedTag,
    fromDate,
    toDate
  ].filter(Boolean).length;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="g-page-title" style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: '700' }}>
              Quản lý Hồ sơ Ứng viên
            </h1>
            <p className="g-page-subtitle" style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Tìm kiếm đa tiêu chí theo vị trí, giai đoạn, nguồn ứng tuyển, nhãn và khoảng thời gian nộp
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {canManage && (
              <Link 
                to="/candidates/create" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' }}
              >
                <FiPlus /> Thêm Ứng viên
              </Link>
            )}
          </div>
        </div>

        {canViewRatings && ratingNotice && <div className="candidate-rating-success" role="status">{ratingNotice}</div>}

        {/* Active Merges */}
        {activeMerges.length > 0 && (
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

        {/* Search & Filter Toolbar (SCRUM-363) */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {/* Main search bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm theo họ tên, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '11px 16px 11px 42px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <FiX size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                borderRadius: '10px',
                border: showAdvancedFilters ? '1.5px solid #4f46e5' : '1.5px solid #e2e8f0',
                background: showAdvancedFilters ? '#eef2ff' : 'white',
                color: showAdvancedFilters ? '#4f46e5' : '#475569',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <FiFilter /> Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <FiRefreshCw /> Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Advanced Multi-criteria Filter Panel */}
          {showAdvancedFilters && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              
              {/* Position Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiBriefcase style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Vị trí tuyển dụng
                </label>
                <select
                  value={selectedPosition}
                  onChange={(e) => { setSelectedPosition(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">Tất cả vị trí</option>
                  {filterOptions.positions.map(p => (
                    <option key={p.position_id} value={p.position_id}>{p.position_name}</option>
                  ))}
                </select>
              </div>

              {/* Pipeline Stage Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiLayers style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Giai đoạn (Stage)
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">Tất cả giai đoạn</option>
                  {filterOptions.stages.map(s => (
                    <option key={s.stage_code} value={s.stage_code}>{s.stage_name}</option>
                  ))}
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiExternalLink style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Nguồn ứng tuyển
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">Tất cả nguồn</option>
                  {filterOptions.sources.map(src => (
                    <option key={src.code} value={src.code}>{src.name}</option>
                  ))}
                </select>
              </div>

              {/* Tag Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiTag style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Nhãn phân loại
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">Tất cả nhãn</option>
                  {filterOptions.tags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Date Range: From Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiCalendar style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Nộp từ ngày
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Date Range: To Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <FiCalendar style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Đến ngày
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

            </div>
          )}

          {/* Quick Date Presets */}
          {showAdvancedFilters && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => handleQuickDate('today')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('7days')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('30days')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
              >
                30 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate('thisMonth')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '500' }}
              >
                Tháng này
              </button>
            </div>
          )}

          {/* Active Tags Badge Display */}
          {filterOptions.tags.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Nhãn phổ biến:</span>
              {filterOptions.tags.slice(0, 8).map(tg => {
                const isSelected = selectedTag === tg;
                return (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => { setSelectedTag(isSelected ? '' : tg); setCurrentPage(1); }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? '700' : '500',
                      border: isSelected ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSelected ? '#4f46e5' : '#f1f5f9',
                      color: isSelected ? 'white' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    #{tg}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Candidate Table Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          
          {/* Header Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
              Tổng cộng: <strong style={{ color: '#1e293b' }}>{pagination.total}</strong> ứng viên
              {activeFiltersCount > 0 && <span style={{ marginLeft: '8px', color: '#4f46e5' }}>(đang lọc {activeFiltersCount} tiêu chí)</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
              <FiRefreshCw className="spin-icon" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} /> Đang tải danh sách ứng viên...
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ fontSize: '1.1rem', margin: '0 0 8px 0', color: '#334155', fontWeight: '600' }}>Không tìm thấy ứng viên phù hợp</p>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Vui lòng thay đổi từ khóa hoặc điều kiện bộ lọc của bạn.</p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Họ Tên</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Vị trí ứng tuyển</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Nguồn (Master Data)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>CV</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Trạng thái</th>
                  {canViewRatings && <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Đánh giá ứng viên</th>}
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(cand => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    
                    {/* Full name */}
                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '600' }}>
                      <Link to={`/candidates/${cand.id}`} style={{ color: '#1e293b', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700' }}>
                          {cand.full_name ? cand.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div>{cand.full_name}</div>
                          {cand.phone && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>{cand.phone}</div>}
                        </div>
                      </Link>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '16px', color: '#475569', fontSize: '0.85rem' }}>{cand.email}</td>

                    {/* Position */}
                    <td style={{ padding: '16px', color: '#475569', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{cand.position_name || 'Chưa gán vị trí'}</div>
                      {cand.department_name && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Phòng ban: {cand.department_name}</div>}
                      {cand.job_reason && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Lý do: {cand.job_reason}</div>}
                    </td>

                    {/* Source */}
                    <td style={{ padding: '16px', color: '#4f46e5', fontWeight: '600', fontSize: '0.85rem' }}>
                      {candidateSources.find(s => s.code === cand.source_code)?.name || cand.source_code || '-'}
                      {cand.tags && (
                        <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {cand.tags.split(',').map(tg => tg.trim()).filter(Boolean).map(tg => (
                            <span key={tg} style={{ padding: '1px 6px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontSize: '0.68rem' }}>#{tg}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* CV Column */}
                    <td style={{ padding: '16px' }}>
                      {cand.resume_url || cand.cv_file_path ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openCvModal(cand)}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Xem trước CV"
                          >
                            <FiEye /> Xem CV
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadResume(cand)}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Tải tệp PDF CV"
                          >
                            <FiDownload /> Tải CV
                          </button>
                        </div>
                      ) : '-'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(cand.status)}
                      {cand.sla_overdue === 1 && (
                        <span style={{ display: 'inline-block', marginLeft: 6, padding: '4px 8px', borderRadius: 20, background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>
                          Quá SLA
                        </span>
                      )}
                    </td>

                    {/* Ratings */}
                    {canViewRatings && (
                      <td className="candidate-rating-cell" style={{ padding: '16px' }}>
                        {renderRatingSummary(cand)}
                        {cand.status === 'REJECTED' ? (
                          <small className="candidate-rating-hint">Hồ sơ đã đánh trượt</small>
                        ) : canRate ? (
                          <button 
                            type="button" 
                            className="candidate-rating-button candidate-rating-primary" 
                            onClick={() => { setRatingCandidate(cand); setRatingNotice(''); }}
                          >
                            Đánh giá
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            className="candidate-rating-button" 
                            onClick={() => setRatingCandidate(cand)}
                          >
                            Xem đánh giá
                          </button>
                        )}
                      </td>
                    )}

                    {/* Action buttons */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                        {candidateProfileAccess(user).canView && (
                          <Link
                            to={`/candidates/${cand.id}`}
                            style={{
                              background: '#4f46e5', color: 'white', padding: '6px 12px',
                              borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.8rem',
                              display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                            }}
                            title="Mở hồ sơ ứng viên hợp nhất đầy đủ"
                          >
                            <FiExternalLink /> Chi tiết
                          </Link>
                        )}

                        {canManage && cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                          <>
                            {user?.roles?.some(r => ['HR_MANAGER', 'ADMIN'].includes(r.role_code)) && (
                              <button
                                type="button"
                                onClick={() => handleHire(cand)}
                                style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                              >
                                Tuyển dụng
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenReject(cand)}
                              style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                            >
                              Đánh trượt
                            </button>
                          </>
                        )}
                        {cand.status === 'REJECTED' && cand.rejection_reason_code && (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>
                            Lý do: {rejectionReasons.find(r => r.code === cand.rejection_reason_code)?.name || cand.rejection_reason_code}
                          </span>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination Controls (SCRUM-364) */}
          {!loading && candidates.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Trang <strong style={{ color: '#1e293b' }}>{pagination.page}</strong> / {pagination.totalPages} ({pagination.total} hồ sơ)
              </div>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={pagination.page <= 1}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pagination.page <= 1 ? '#f8fafc' : 'white', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', color: pagination.page <= 1 ? '#cbd5e1' : '#334155' }}
                  title="Trang đầu"
                >
                  <FiChevronsLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page <= 1}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pagination.page <= 1 ? '#f8fafc' : 'white', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', color: pagination.page <= 1 ? '#cbd5e1' : '#334155' }}
                  title="Trang trước"
                >
                  <FiChevronLeft />
                </button>

                {/* Page number buttons */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pNum = i + 1;
                  if (pagination.totalPages > 5 && pagination.page > 3) {
                    pNum = pagination.page - 3 + i;
                    if (pNum > pagination.totalPages) pNum = pagination.totalPages - (4 - i);
                  }
                  if (pNum <= 0 || pNum > pagination.totalPages) return null;
                  const isCur = pNum === pagination.page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isCur ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isCur ? '#4f46e5' : 'white',
                        color: isCur ? 'white' : '#334155',
                        fontWeight: isCur ? '700' : '500',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pagination.page >= pagination.totalPages ? '#f8fafc' : 'white', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer', color: pagination.page >= pagination.totalPages ? '#cbd5e1' : '#334155' }}
                  title="Trang sau"
                >
                  <FiChevronRight />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: pagination.page >= pagination.totalPages ? '#f8fafc' : 'white', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer', color: pagination.page >= pagination.totalPages ? '#cbd5e1' : '#334155' }}
                  title="Trang cuối"
                >
                  <FiChevronsRight />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Candidate Rating Modal */}
      {canViewRatings && ratingCandidate && (
        <CandidateRatingModal 
          key={ratingCandidate.id} 
          candidate={ratingCandidate} 
          readOnly={!canRate || ratingCandidate.status === 'REJECTED'} 
          onClose={() => setRatingCandidate(null)} 
          onSaved={handleRatingSaved} 
        />
      )}

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

            {rejectError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px' }}>{rejectError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitReject}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '600' }}
              >
                Xác nhận loại
              </button>
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '760px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '700' }}>
                  CV Ứng viên: {viewingCandidate?.full_name}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Vị trí: {viewingCandidate?.position_name || 'N/A'} - {viewingCandidate?.department_name || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCvModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
              >
                <FiX />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px', overflowY: 'auto', background: '#fdfdfd' }}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                {/* Header Information */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px'
                  }}>
                    <FiUser />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827' }}>
                      {cvData.fullName}
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', color: '#4b5563', fontSize: '13.5px' }}>
                      <span><strong>Email:</strong> {cvData.email}</span>
                      <span><strong>SĐT:</strong> {cvData.phone}</span>
                      <span><strong>Vị trí:</strong> {cvData.targetPosition}</span>
                    </div>
                  </div>
                </div>

                {/* Chi tiết sơ lược */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Ngày sinh</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.birthday}</div>
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
                        Tệp CV đính kèm
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

    </div>
  );
};

export default CandidateList;
