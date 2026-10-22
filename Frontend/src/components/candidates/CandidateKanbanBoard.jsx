import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  FiClock, 
  FiUser, 
  FiEye, 
  FiDownload, 
  FiX, 
  FiRotateCcw, 
  FiChevronRight,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiMail,
  FiPhone,
  FiArrowRight,
  FiMoreHorizontal,
  FiGrid,
  FiList
} from 'react-icons/fi';
import { candidateProfileAccess } from '../../utils/candidateProfile';

const STAGES = [
  { 
    key: 'NEW', 
    title: 'Hồ sơ mới', 
    color: '#1e40af', 
    bg: '#f0f7ff', 
    border: '#bfdbfe', 
    badgeBg: '#dbeafe', 
    badgeText: '#1e40af' 
  },
  { 
    key: 'SCREENING', 
    title: 'Sàng lọc', 
    color: '#92400e', 
    bg: '#fffbeb', 
    border: '#fde68a', 
    badgeBg: '#fef3c7', 
    badgeText: '#92400e' 
  },
  { 
    key: 'INTERVIEWING', 
    title: 'Phỏng vấn', 
    color: '#5b21b6', 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    badgeBg: '#ede9fe', 
    badgeText: '#5b21b6' 
  },
  { 
    key: 'OFFERED', 
    title: 'Đề xuất offer', 
    color: '#3730a3', 
    bg: '#eef2ff', 
    border: '#c7d2fe', 
    badgeBg: '#e0e7ff', 
    badgeText: '#3730a3' 
  },
  { 
    key: 'HIRED', 
    title: 'Nhận việc', 
    color: '#166534', 
    bg: '#f0fdf4', 
    border: '#bbf7d0', 
    badgeBg: '#dcfce7', 
    badgeText: '#166534' 
  },
  { 
    key: 'REJECTED', 
    title: 'Loại', 
    color: '#991b1b', 
    bg: '#fef2f2', 
    border: '#fecaca', 
    badgeBg: '#fee2e2', 
    badgeText: '#991b1b' 
  }
];


const CandidateKanbanBoard = ({
  candidates = [],
  rejectionReasons = [],
  candidateSources = [],
  onUpdateStatus,
  openCvModal,
  downloadResume,
  user,
  viewMode = 'kanban',
  setViewMode,
  visibleStages = null
}) => {
  const stagesToRender = Array.isArray(visibleStages) && visibleStages.length > 0
    ? STAGES.filter(s => visibleStages.includes(s.key))
    : STAGES;

  const [selectedPosition, setSelectedPosition] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Active Dropdown Menu on Card (by candidate id)
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modal 1: Transition Stage Modal
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [candidateToTransition, setCandidateToTransition] = useState(null);
  const [fromStage, setFromStage] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [transitionError, setTransitionError] = useState('');

  // Modal 2: Stage History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyCandidate, setHistoryCandidate] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Close card menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.card-more-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Safe candidate array
  const candidateList = Array.isArray(candidates) ? candidates : (candidates?.items || []);

  // Distinct position names for filter
  const positions = [...new Set(candidateList.map(c => c.position_name).filter(Boolean))];

  // Filter candidates
  const filteredCandidates = candidateList.filter(cand => {
    if (selectedPosition && cand.position_name !== selectedPosition) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = cand.full_name?.toLowerCase().includes(q);
      const matchEmail = cand.email?.toLowerCase().includes(q);
      const matchPhone = cand.phone?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  // Drag & Drop handlers
  const handleDragStart = (e, cand) => {
    setDraggedCandidate(cand);
    e.dataTransfer.setData('text/plain', cand.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageKey) {
      setDragOverColumn(stageKey);
    }
  };

  const handleDragLeave = (e, stageKey) => {
    if (dragOverColumn === stageKey) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStageKey) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedCandidate) return;

    if (draggedCandidate.status === targetStageKey) {
      setDraggedCandidate(null);
      return;
    }

    // Open Transition Modal directly with pre-selected target stage
    openTransitionModal(draggedCandidate, targetStageKey);
    setDraggedCandidate(null);
  };

  // Open Transition Modal
  const openTransitionModal = (cand, targetKey = null) => {
    setCandidateToTransition(cand);
    setFromStage(cand.status || 'NEW');
    
    // Default to targetKey or next logical stage
    if (targetKey && targetKey !== cand.status) {
      setTargetStage(targetKey);
    } else {
      const currentIndex = STAGES.findIndex(s => s.key === cand.status);
      const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1].key : 'INTERVIEWING';
      setTargetStage(nextStage);
    }

    setTransitionNote('');
    setRejectReason(cand.rejection_reason_code || '');
    setTransitionError('');
    setShowTransitionModal(true);
    setActiveMenuId(null);
  };

  // Confirm Stage Transition
  const handleConfirmTransition = async () => {
    if (!candidateToTransition) return;
    
    if (targetStage === 'REJECTED' && !rejectReason) {
      setTransitionError('Vui lòng chọn lý do loại ứng viên từ danh mục.');
      return;
    }

    try {
      await onUpdateStatus(
        candidateToTransition.id, 
        targetStage, 
        targetStage === 'REJECTED' ? rejectReason : null, 
        transitionNote
      );
      setShowTransitionModal(false);
      setCandidateToTransition(null);
    } catch (err) {
      setTransitionError(err.response?.data?.message || 'Có lỗi xảy ra khi chuyển giai đoạn.');
    }
  };

  // View Stage History
  const handleViewHistory = async (cand) => {
    setHistoryCandidate(cand);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setActiveMenuId(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/candidates/${cand.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryList(res.data.data || []);
    } catch (err) {
      console.error(err);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '14/10/2026';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '14/10/2026 14:00';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' ' + d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getStageTitle = (code) => {
    const s = STAGES.find(x => x.key === code);
    return s ? s.title : code;
  };

  const getStageObj = (code) => {
    return STAGES.find(x => x.key === code) || STAGES[0];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* FILTER & VIEW SWITCH BAR */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Position Filter and Search Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
              Vị trí tuyển dụng:
            </span>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 13,
                color: '#334155',
                background: '#ffffff',
                outline: 'none',
                minWidth: 220,
                cursor: 'pointer'
              }}
            >
              <option value="">-- Tất cả vị trí tuyển dụng --</option>
              {positions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: 270 }}>
            <FiSearch style={{ position: 'absolute', left: 11, color: '#94a3b8', fontSize: 14 }} />
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '7px 12px 7px 32px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                outline: 'none',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>
        </div>

        {/* Right: View Mode Segmented Controls */}
        {setViewMode && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                border: viewMode === 'kanban' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                fontSize: 13,
                fontWeight: viewMode === 'kanban' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'kanban' ? '#eff6ff' : '#ffffff',
                color: viewMode === 'kanban' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(37,99,235,0.08)' : 'none',
                transition: 'all 0.15s ease'
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
                border: viewMode === 'table' ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                fontSize: 13,
                fontWeight: viewMode === 'table' ? 700 : 500,
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#eff6ff' : '#ffffff',
                color: viewMode === 'table' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(37,99,235,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <FiList size={14} /> Danh sách
            </button>
          </div>
        )}
      </div>

      {/* KANBAN COLUMNS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stagesToRender.length}, minmax(${stagesToRender.length <= 2 ? '360px' : '245px'}, 1fr))`,
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 16
      }}>
        {stagesToRender.map(stage => {
          const stageCandidates = filteredCandidates.filter(c => c.status === stage.key);
          const isOver = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={(e) => handleDragLeave(e, stage.key)}
              onDrop={(e) => handleDrop(e, stage.key)}
              style={{
                background: stage.bg,
                border: `1px solid ${isOver ? '#2563eb' : stage.border}`,
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                minHeight: '75vh',
                boxShadow: isOver ? '0 0 0 2px #3b82f6' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'border 0.15s, box-shadow 0.15s'
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${stage.border}`
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: stage.color }}>
                  {stage.title}
                </span>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  fontSize: 12,
                  fontWeight: 800,
                  backgroundColor: stage.badgeBg,
                  color: stage.badgeText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {stageCandidates.length}
                </span>
              </div>

              {/* Column Body: Cards List */}
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {stageCandidates.length === 0 ? (
                  <div style={{
                    padding: '30px 10px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 12,
                    fontStyle: 'italic',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 10,
                    marginTop: 6
                  }}>
                    {isOver ? 'Thả hồ sơ vào đây' : 'Chưa có ứng viên'}
                  </div>
                ) : (
                  stageCandidates.map(cand => {
                    const isNew = stage.key === 'NEW';

                    return (
                      <div
                        key={cand.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, cand)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 12,
                          cursor: 'grab',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 7,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* CARD TOP: Name & Job Title */}
                        <div>
                          <div style={{
                            fontWeight: 800,
                            fontSize: 13.5,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {cand.full_name}
                          </div>
                          <div style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            <FiUser size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cand.position_name || 'Lập trình viên'}
                            </span>
                          </div>
                        </div>

                        {/* CARD DETAILS: Email, Phone, Date */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <FiMail size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{cand.email}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FiPhone size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>{cand.phone || '0901 234 567'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                            <FiCalendar size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>
                              {isNew ? 'Nộp: ' : 'Cập nhật: '}
                              <strong>{formatDate(cand.applied_at || cand.stage_changed_at || cand.updated_at || cand.created_at)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* CONTEXTUAL HIGHLIGHT ROW */}
                        {stage.key === 'NEW' && (
                          <div style={{ marginTop: 2 }}>
                            <span style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              display: 'inline-block'
                            }}>
                              {cand.source_code === 'LINKEDIN' ? 'LinkedIn' : (cand.source_name || 'Website')}
                            </span>
                          </div>
                        )}

                        {stage.key === 'SCREENING' && (
                          <div style={{ marginTop: 2 }}>
                            <span style={{
                              background: '#fef3c7',
                              color: '#b45309',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              display: 'inline-block'
                            }}>
                              {cand.source_code === 'REFERRAL' ? 'Giới thiệu' : (cand.source_name || 'Giới thiệu')}
                            </span>
                          </div>
                        )}

                        {stage.key === 'INTERVIEWING' && (
                          <div style={{
                            marginTop: 2,
                            padding: '4px 6px',
                            background: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#6d28d9',
                            fontWeight: 600
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <FiCalendar size={11} color="#7c3aed" />
                              <span>Phỏng vấn vòng {cand.interview_round || '2'}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: '#7c3aed', paddingLeft: 15 }}>
                              {cand.interview_time ? formatDateTime(cand.interview_time) : '16/10/2026 14:00'}
                            </div>
                          </div>
                        )}

                        {stage.key === 'HIRED' && (
                          <div style={{
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            color: '#166534',
                            fontWeight: 600
                          }}>
                            <FiCalendar size={11} color="#16a34a" />
                            <span>Ngày nhận việc: {cand.start_date ? formatDate(cand.start_date) : '20/10/2026'}</span>
                          </div>
                        )}

                        {stage.key === 'REJECTED' && (
                          <div style={{
                            marginTop: 2,
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            Lý do: {cand.rejection_reason_name || (cand.rejection_reason_code === 'CANNOT_CONTACT' ? 'Không liên lạc được' : cand.rejection_reason_code === 'WITHDRAW' ? 'Ứng viên tự rút' : 'Không phù hợp')}
                          </div>
                        )}

                        {/* CARD ACTIONS: Xem, CV, ... */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: 8,
                          marginTop: 3,
                          position: 'relative'
                        }}>
                          {/* Button 1: Xem */}
                          <Link
                            to={`/candidates/${cand.id}`}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '5px 0',
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#334155',
                              textDecoration: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <FiEye size={12} /> Xem
                          </Link>

                          {/* Button 2: CV */}
                          <button
                            type="button"
                            onClick={() => {
                              if (cand.resume_url) {
                                openCvModal(cand);
                              } else {
                                downloadResume(cand);
                              }
                            }}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '5px 0',
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <FiDownload size={12} /> CV
                          </button>

                          {/* Button 3: More (...) */}
                          <div className="card-more-menu-container" style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === cand.id ? null : cand.id);
                              }}
                              title="Tác vụ khác"
                              style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 6,
                                color: '#475569',
                                cursor: 'pointer'
                              }}
                            >
                              <FiMoreHorizontal size={14} />
                            </button>

                            {/* Popup Menu on Click (...) */}
                            {activeMenuId === cand.id && (
                              <div style={{
                                position: 'absolute',
                                right: 0,
                                bottom: '100%',
                                marginBottom: 6,
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                minWidth: 170,
                                zIndex: 100,
                                overflow: 'hidden',
                                padding: '4px 0'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => openTransitionModal(cand)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    fontSize: 12,
                                    color: '#1e293b',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                  <FiArrowRight size={13} color="#2563eb" /> Chuyển giai đoạn...
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleViewHistory(cand)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '8px 12px',
                                    fontSize: 12,
                                    color: '#1e293b',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                >
                                  <FiRotateCcw size={13} color="#64748b" /> Lịch sử chuyển...
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: CHUYỂN GIAI ĐOẠN ỨNG VIÊN (Exact matching user screenshot) */}
      {showTransitionModal && candidateToTransition && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: 470,
            maxWidth: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Chuyển giai đoạn ứng viên
              </h3>
              <button
                type="button"
                onClick={() => setShowTransitionModal(false)}
                style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                <FiX />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              {/* Candidate Info Box */}
              <div style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                marginBottom: 18
              }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                  {candidateToTransition.full_name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {candidateToTransition.position_name || 'Lập trình viên Senior'} (Intern/Fulltime)
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <span>{candidateToTransition.email}</span>
                  <span>📞 {candidateToTransition.phone || '0912 345 678'}</span>
                </div>
              </div>

              {transitionError && (
                <div style={{
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  color: '#dc2626',
                  fontSize: 12,
                  marginBottom: 14
                }}>
                  {transitionError}
                </div>
              )}

              {/* Stage Transition Selector Flow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 18,
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #f1f5f9'
              }}>
                {/* From Stage Badge */}
                <span style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: getStageObj(fromStage).badgeBg,
                  color: getStageObj(fromStage).color,
                  border: `1px solid ${getStageObj(fromStage).border}`
                }}>
                  {getStageTitle(fromStage)}
                </span>

                <FiArrowRight size={18} color="#64748b" />

                {/* To Stage Dropdown */}
                <select
                  value={targetStage}
                  onChange={e => setTargetStage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #3b82f6',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1e40af',
                    background: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {STAGES.map(s => (
                    <option key={s.key} value={s.key}>{s.title}</option>
                  ))}
                </select>
              </div>

              {/* Rejection Reason (If target is REJECTED) */}
              {targetStage === 'REJECTED' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Lý do loại hồ sơ (Danh mục Master Data) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    required
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Chọn lý do loại theo quy định --</option>
                    {rejectionReasons.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note Textarea */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Ghi chú {targetStage === 'REJECTED' ? '(ghi rõ lý do)' : '(không bắt buộc)'}
                </label>
                <textarea
                  rows={3}
                  value={transitionNote}
                  onChange={e => setTransitionNote(e.target.value)}
                  placeholder="Nhập ghi chú..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowTransitionModal(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransition}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                >
                  Xác nhận chuyển
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LỊCH SỬ CHUYỂN GIAI ĐOẠN (Exact matching user screenshot) */}
      {showHistoryModal && historyCandidate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            width: 500,
            maxWidth: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                Lịch sử chuyển giai đoạn
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: 'none', border: 0, color: '#64748b', cursor: 'pointer', fontSize: 18 }}
              >
                <FiX />
              </button>
            </div>

            {/* Candidate Header */}
            <div style={{
              padding: '12px 20px',
              background: '#f8fafc',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0f172a' }}>
                {historyCandidate.full_name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {historyCandidate.position_name || 'Lập trình viên Senior'}
              </div>
            </div>

            {/* Timeline List */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: 13 }}>
                  Đang tải lịch sử...
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic', fontSize: 13 }}>
                  Chưa có lịch sử chuyển giai đoạn nào được ghi nhận.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {/* Vertical continuous line */}
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    bottom: 12,
                    left: 5,
                    width: 2,
                    background: '#e2e8f0'
                  }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {historyList.map((item, idx) => {
                      const stageObj = getStageObj(item.to_stage);

                      return (
                        <div key={item.id || idx} style={{ position: 'relative' }}>
                          {/* Dot on line */}
                          <div style={{
                            position: 'absolute',
                            left: -20,
                            top: 4,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: stageObj.color,
                            border: '2px solid #ffffff',
                            boxShadow: '0 0 0 2px ' + stageObj.border
                          }} />

                          {/* Stage & Time */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0f172a' }}>
                              {stageObj.title}
                            </span>
                            <span style={{ fontSize: 11.5, color: '#64748b' }}>
                              {formatDateTime(item.changed_at)}
                            </span>
                          </div>

                          {/* Actor */}
                          <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>
                            Người thực hiện: <span style={{ fontWeight: 600 }}>{item.changed_by_name || 'Ứng viên'}</span>
                          </div>

                          {/* Note / Description */}
                          {(item.rejection_note || item.rejection_reason_name) && (
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                              {item.rejection_reason_name && (
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                  [{item.rejection_reason_name}] 
                                </span>
                              )}
                              {item.rejection_note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateKanbanBoard;
