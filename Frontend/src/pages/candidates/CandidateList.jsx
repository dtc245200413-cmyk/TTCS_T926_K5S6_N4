import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiSearch, FiFilter, FiX, FiRefreshCw, FiCalendar, FiTag, 
  FiBriefcase, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, 
  FiExternalLink, FiPlus, FiStar, FiClock, FiCheckCircle, FiLayers
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateApi from '../../api/candidateApi';

const CandidateList = () => {
  const { user } = useContext(AuthContext);

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

  // Initial load
  useEffect(() => {
    fetchCandidates(1);
  }, [selectedPosition, selectedStage, selectedSource, selectedTag, fromDate, toDate, pageSize]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchCandidates(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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

  // Quick Date Range Presets
  const setQuickDate = (preset) => {
    const now = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const today = formatDate(now);
      setFromDate(today);
      setToDate(today);
    } else if (preset === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      setFromDate(formatDate(sevenDaysAgo));
      setToDate(formatDate(now));
    } else if (preset === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      setFromDate(formatDate(thirtyDaysAgo));
      setToDate(formatDate(now));
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDate(firstDay));
      setToDate(formatDate(now));
    } else if (preset === 'all') {
      setFromDate('');
      setToDate('');
    }
    setCurrentPage(1);
  };

  // Status & Stage Badge Formatter
  const getStageBadge = (stage, status) => {
    const s = stage || status;
    switch (s) {
      case 'NEW':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dbeafe', color: '#1d4ed8' }}>Hồ sơ mới</span>;
      case 'SCREENING':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef3c7', color: '#b45309' }}>Sàng lọc</span>;
      case 'INTERVIEW':
      case 'INTERVIEWING':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#e0e7ff', color: '#4338ca' }}>Phỏng vấn</span>;
      case 'OFFER':
      case 'OFFERED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fae8ff', color: '#86198f' }}>Đề xuất (Offer)</span>;
      case 'HIRED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#16a34a' }}>Đã tuyển (Hired)</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>Đã loại (Rejected)</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#f1f5f9', color: '#475569' }}>{s}</span>;
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

  // Active filter count
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
        
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="g-page-title" style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: '700' }}>
              Tìm kiếm & Lọc Hồ sơ Ứng viên
            </h1>
            <p className="g-page-subtitle" style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Tìm kiếm đa tiêu chí theo vị trí, giai đoạn, nguồn ứng tuyển, nhãn và khoảng thời gian nộp
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link 
              to="/candidates/create" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' }}
            >
              <FiPlus /> Thêm Ứng viên
            </Link>
          </div>
        </div>

        {/* Filter & Search Panel (SCRUM-363) */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Main Search Row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <FiSearch style={{ position: 'absolute', left: '14px', color: '#94a3b8', fontSize: '18px' }} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo họ tên, email hoặc số điện thoại..."
                style={{
                  width: '100%', padding: '12px 40px 12px 42px', borderRadius: '10px',
                  border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none',
                  transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                  title="Xóa tìm kiếm"
                >
                  <FiX />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: showAdvancedFilters ? '#e0e7ff' : '#f8fafc',
                border: showAdvancedFilters ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                color: showAdvancedFilters ? '#4338ca' : '#475569',
                padding: '12px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
              }}
            >
              <FiFilter /> Bộ lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
                }}
                title="Xóa toàn bộ các điều kiện lọc và tìm kiếm"
              >
                <FiRefreshCw /> Đặt lại
              </button>
            )}
          </div>

          {/* Collapsible Filter Bar */}
          {showAdvancedFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              
              {/* Filter Dropdowns Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                
                {/* 1. Vị trí tuyển dụng */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiBriefcase color="#4f46e5" /> Vị trí tuyển dụng
                  </label>
                  <select
                    value={selectedPosition}
                    onChange={(e) => { setSelectedPosition(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="">-- Tất cả vị trí --</option>
                    {filterOptions.positions.map(pos => (
                      <option key={pos.position_id} value={pos.position_id}>
                        {pos.position_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Giai đoạn Kanban (Pipeline Stage) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiLayers color="#0284c7" /> Giai đoạn (Pipeline)
                  </label>
                  <select
                    value={selectedStage}
                    onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="">-- Tất cả giai đoạn --</option>
                    <option value="NEW">Hồ sơ mới (NEW)</option>
                    <option value="SCREENING">Sàng lọc hồ sơ (SCREENING)</option>
                    <option value="INTERVIEW">Phỏng vấn (INTERVIEW)</option>
                    <option value="OFFER">Đề xuất Offer (OFFER)</option>
                    <option value="HIRED">Đã nhận việc (HIRED)</option>
                    <option value="REJECTED">Đã loại (REJECTED)</option>
                  </select>
                </div>

                {/* 3. Nguồn ứng tuyển */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiExternalLink color="#10b981" /> Nguồn ứng tuyển
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="">-- Tất cả nguồn --</option>
                    {filterOptions.sources.map(src => (
                      <option key={src.code} value={src.code}>
                        {src.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Nhãn phân loại (Tags) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiTag color="#f59e0b" /> Nhãn phân loại (Tag)
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                  >
                    <option value="">-- Tất cả nhãn --</option>
                    {filterOptions.tags.map((t, idx) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Khoảng ngày nộp: Từ ngày */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiCalendar color="#6366f1" /> Từ ngày nộp
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                {/* 6. Khoảng ngày nộp: Đến ngày */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    <FiCalendar color="#6366f1" /> Đến ngày nộp
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

              </div>

              {/* Quick Date Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Chọn nhanh thời gian:</span>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'today', label: 'Hôm nay' },
                  { id: '7days', label: '7 ngày qua' },
                  { id: '30days', label: '30 ngày qua' },
                  { id: 'month', label: 'Tháng này' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setQuickDate(preset.id)}
                    style={{
                      background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569',
                      padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* Active Filter Chips / Badges */}
          {activeFiltersCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Đang lọc theo:</span>
              
              {searchTerm && (
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Từ khóa: "{searchTerm}" <FiX style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}

              {selectedPosition && (
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Vị trí: {filterOptions.positions.find(p => String(p.position_id) === String(selectedPosition))?.position_name || selectedPosition}
                  <FiX style={{ cursor: 'pointer' }} onClick={() => setSelectedPosition('')} />
                </span>
              )}

              {selectedStage && (
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Giai đoạn: {selectedStage} <FiX style={{ cursor: 'pointer' }} onClick={() => setSelectedStage('')} />
                </span>
              )}

              {selectedSource && (
                <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Nguồn: {filterOptions.sources.find(s => s.code === selectedSource)?.name || selectedSource}
                  <FiX style={{ cursor: 'pointer' }} onClick={() => setSelectedSource('')} />
                </span>
              )}

              {selectedTag && (
                <span style={{ background: '#fae8ff', color: '#86198f', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Nhãn: #{selectedTag} <FiX style={{ cursor: 'pointer' }} onClick={() => setSelectedTag('')} />
                </span>
              )}

              {(fromDate || toDate) && (
                <span style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Thời gian: {fromDate || '...'} ➔ {toDate || '...'}
                  <FiX style={{ cursor: 'pointer' }} onClick={() => { setFromDate(''); setToDate(''); }} />
                </span>
              )}

              <button
                onClick={handleResetFilters}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', marginLeft: '4px' }}
              >
                Xóa tất cả
              </button>
            </div>
          )}

        </div>

        {/* Results Stats Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <div style={{ color: '#475569', fontSize: '0.95rem' }}>
            Tìm thấy <strong style={{ color: '#1e293b', fontSize: '1.05rem' }}>{pagination.total}</strong> hồ sơ ứng viên phù hợp
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Hiển thị mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
            >
              <option value={5}>5 hồ sơ</option>
              <option value={10}>10 hồ sơ</option>
              <option value={20}>20 hồ sơ</option>
              <option value={50}>50 hồ sơ</option>
            </select>
          </div>
        </div>

        {/* Candidate Table Results */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>⏳ Đang tìm kiếm và lọc hồ sơ...</div>
              <p style={{ fontSize: '0.85rem' }}>Vui lòng đợi hệ thống truy xuất dữ liệu</p>
            </div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <FiSearch size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Không tìm thấy hồ sơ nào</h3>
              <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 16px', color: '#64748b' }}>
                Không có ứng viên nào khớp với toàn bộ các tiêu chí tìm kiếm hoặc bộ lọc bạn đã chọn.
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  Xóa toàn bộ bộ lọc
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ứng viên</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Vị trí & Phòng ban</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Giai đoạn (Pipeline)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nguồn</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nhãn & Kỹ năng</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ngày nộp</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(cand => {
                  const tagList = cand.tags ? cand.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

                  return (
                    <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      
                      {/* Candidate Column */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1rem', flexShrink: 0
                          }}>
                            {cand.full_name ? cand.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <Link 
                              to={`/candidates/${cand.id}`}
                              style={{ color: '#1e293b', fontWeight: '700', textDecoration: 'none', fontSize: '0.95rem', display: 'inline-block' }}
                              title="Bấm để mở Hồ sơ ứng viên hợp nhất (SCRUM-187)"
                            >
                              {cand.full_name}
                            </Link>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{cand.email}</div>
                            {cand.phone && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{cand.phone}</div>
                            )}
                            {cand.total_applications > 1 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#f5f3ff', color: '#6d28d9', padding: '2px 6px', borderRadius: '6px', border: '1px solid #ddd6fe', display: 'inline-block', marginTop: '2px' }}>
                                ⚡ {cand.total_applications} lần ứng tuyển
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position & Department */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>
                          {cand.position_name || 'Chưa gán vị trí'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {cand.department_name || 'N/A'}
                        </div>
                      </td>

                      {/* Pipeline Stage */}
                      <td style={{ padding: '16px' }}>
                        {getStageBadge(cand.current_stage, cand.status)}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#4f46e5', background: '#f5f3ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e0e7ff' }}>
                          {filterOptions.sources.find(s => s.code === cand.source_code)?.name || cand.source_code || 'Chưa rõ'}
                        </span>
                      </td>

                      {/* Tags */}
                      <td style={{ padding: '16px', maxWidth: '200px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tagList.length > 0 ? (
                            tagList.slice(0, 3).map((tg, idx) => (
                              <span key={idx} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                #{tg}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>Không có nhãn</span>
                          )}
                          {tagList.length > 3 && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>+{tagList.length - 3}</span>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '16px', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiClock size={12} />
                          {new Date(cand.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          
                          {/* Mở trang chi tiết hợp nhất (Requirement: mở được trang chi tiết) */}
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

                          {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                            <>
                              {user?.roles?.some(r => r.role_code === 'HR_MANAGER' || r.role_code === 'ADMIN') && (
                                <button 
                                  onClick={() => handleHire(cand)}
                                  style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                                  title="Tuyển dụng ứng viên này"
                                >
                                  Tuyển
                                </button>
                              )}
                              <button 
                                onClick={() => handleOpenReject(cand)}
                                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                                title="Đánh trượt ứng viên"
                              >
                                Loại
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination Controls (SCRUM-364) */}
          {!loading && candidates.length > 0 && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Hiển thị <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> - <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> trong tổng số <strong>{pagination.total}</strong> ứng viên
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* First Page */}
                <button
                  onClick={() => { setCurrentPage(1); fetchCandidates(1); }}
                  disabled={pagination.page <= 1}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: pagination.page <= 1 ? '#f8fafc' : 'white',
                    color: pagination.page <= 1 ? '#cbd5e1' : '#475569',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Trang đầu"
                >
                  <FiChevronsLeft />
                </button>

                {/* Prev Page */}
                <button
                  onClick={() => { const p = pagination.page - 1; setCurrentPage(p); fetchCandidates(p); }}
                  disabled={pagination.page <= 1}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: pagination.page <= 1 ? '#f8fafc' : 'white',
                    color: pagination.page <= 1 ? '#cbd5e1' : '#475569',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                  title="Trang trước"
                >
                  <FiChevronLeft />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => {
                  const isActive = pNum === pagination.page;
                  return (
                    <button
                      key={pNum}
                      onClick={() => { setCurrentPage(pNum); fetchCandidates(pNum); }}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        border: isActive ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isActive ? '#4f46e5' : 'white',
                        color: isActive ? 'white' : '#475569',
                        fontWeight: isActive ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Next Page */}
                <button
                  onClick={() => { const p = pagination.page + 1; setCurrentPage(p); fetchCandidates(p); }}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: pagination.page >= pagination.totalPages ? '#f8fafc' : 'white',
                    color: pagination.page >= pagination.totalPages ? '#cbd5e1' : '#475569',
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Trang sau"
                >
                  <FiChevronRight />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => { const p = pagination.totalPages; setCurrentPage(p); fetchCandidates(p); }}
                  disabled={pagination.page >= pagination.totalPages}
                  style={{
                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: pagination.page >= pagination.totalPages ? '#f8fafc' : 'white',
                    color: pagination.page >= pagination.totalPages ? '#cbd5e1' : '#475569',
                    cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                  }}
                  title="Trang cuối"
                >
                  <FiChevronsRight />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.2rem' }}>Đánh trượt Ứng viên</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
              Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Vui lòng chọn lý do loại hồ sơ từ danh mục:
            </p>
            
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Lý do loại hồ sơ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px', outline: 'none', fontSize: '0.85rem' }}
            >
              <option value="">-- Chọn lý do --</option>
              <option value="NOT_MATCH_SKILL">Không phù hợp kỹ năng</option>
              <option value="HIGH_SALARY">Lương vượt ngân sách</option>
              <option value="CULTURE_FIT">Không phù hợp văn hóa</option>
            </select>
            {rejectError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{rejectError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => setShowRejectModal(false)} 
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Hủy
              </button>
              <button 
                onClick={submitReject} 
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '600' }}
              >
                Xác nhận Trượt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CandidateList;
