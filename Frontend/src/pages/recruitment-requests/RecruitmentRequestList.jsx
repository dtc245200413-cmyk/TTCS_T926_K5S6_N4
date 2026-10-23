import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { 
  FiSearch, 
  FiPlus, 
  FiRotateCw, 
  FiCalendar, 
  FiMoreHorizontal, 
  FiChevronDown,
  FiUserCheck,
  FiPauseCircle,
  FiPlayCircle,
  FiCheckCircle,
  FiTrash2,
  FiEye
} from 'react-icons/fi';
import { 
  AssignRecruiterModal, 
  PauseRequestModal, 
  CloseRequestModal, 
  CancelRequestModal,
  AvatarBadge
} from './RecruitmentRequestModals';

const API_BASE = `${API_BASE_URL}/recruitment-requests`;

const RecruitmentRequestList = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [recruiterFilter, setRecruiterFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Modals state
  const [selectedReq, setSelectedReq] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [reqsRes, deptsRes, recsRes] = await Promise.all([
        axios.get(`${API_BASE}/my`, { headers }),
        axios.get(`${API_BASE_URL}/departments`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/recruiters-workload`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      const rawReqs = reqsRes.data?.data;
      setRequests(Array.isArray(rawReqs) ? rawReqs : (rawReqs?.requests || []));

      const rawDepts = deptsRes.data?.data;
      setDepartments(Array.isArray(rawDepts) ? rawDepts : (rawDepts?.departments || []));

      const rawRecs = recsRes.data?.data;
      setRecruiters(Array.isArray(rawRecs) ? rawRecs : (rawRecs?.recruiters || []));
    } catch (err) {
      console.error('Failed to load recruitment requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Close action menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const normalizeStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (['DRAFT', 'PENDING', 'NEEDS_REVISION'].includes(s)) return 'MOI_TAO';
    if (['IN_PROGRESS', 'APPROVED'].includes(s)) return 'DANG_TUYEN';
    if (['PAUSED'].includes(s)) return 'TAM_DUNG';
    if (['CLOSED', 'COMPLETED'].includes(s)) return 'DA_DONG';
    if (['CANCELLED', 'REJECTED'].includes(s)) return 'DA_HUY';
    return 'KHAC';
  };

  const getStatusLabel = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'DANG_TUYEN': return 'Đang tuyển';
      case 'MOI_TAO': return 'Mới tạo';
      case 'TAM_DUNG': return 'Tạm dừng';
      case 'DA_DONG': return 'Đã đóng';
      case 'DA_HUY': return 'Đã hủy';
      default: return status || 'Khác';
    }
  };

  const getStatusBadge = (status) => {
    const norm = normalizeStatus(status);
    const label = getStatusLabel(status);

    const configs = {
      DANG_TUYEN: { bg: '#e0f2fe', color: '#0284c7' }, // Blue
      MOI_TAO: { bg: '#f1f5f9', color: '#475569' },    // Gray
      TAM_DUNG: { bg: '#fef3c7', color: '#d97706' },   // Amber
      DA_DONG: { bg: '#dcfce7', color: '#16a34a' },    // Green
      DA_HUY: { bg: '#fee2e2', color: '#dc2626' }      // Red
    };

    const cfg = configs[norm] || { bg: '#f1f5f9', color: '#475569' };

    return (
      <span style={{
        padding: '5px 14px',
        borderRadius: '9999px',
        fontSize: '0.825rem',
        fontWeight: '600',
        backgroundColor: cfg.bg,
        color: cfg.color,
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // Status counts for tabs
  const tabCounts = useMemo(() => {
    const counts = {
      ALL: requests.length,
      MOI_TAO: 0,
      DANG_TUYEN: 0,
      TAM_DUNG: 0,
      DA_DONG: 0,
      DA_HUY: 0
    };
    requests.forEach(r => {
      const norm = normalizeStatus(r.status);
      if (counts[norm] !== undefined) counts[norm]++;
    });
    return counts;
  }, [requests]);

  // Handle Quick Resume
  const handleResume = async (req) => {
    if (!window.confirm(`Tiếp tục triển khai yêu cầu tuyển dụng ${req.code || req.id}?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/${req.id}/status-action`, {
        status: 'IN_PROGRESS',
        reason: 'Tiếp tục triển khai tuyển dụng'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã tiếp tục triển khai yêu cầu tuyển dụng!');
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDepartmentFilter('ALL');
    setRecruiterFilter('ALL');
    setDateFilter('');
    setActiveTab('ALL');
    fetchAllData();
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const norm = normalizeStatus(req.status);

      // Tab filter
      if (activeTab !== 'ALL' && norm !== activeTab) return false;

      // Dropdown status filter
      if (statusFilter !== 'ALL' && norm !== statusFilter) return false;

      // Department filter
      if (departmentFilter !== 'ALL' && String(req.department_id) !== String(departmentFilter)) return false;

      // Recruiter filter
      if (recruiterFilter !== 'ALL' && String(req.recruiter_id) !== String(recruiterFilter)) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const code = (req.code || `YC-2026-0${req.id}`).toLowerCase();
        const title = (req.title || req.position_name || '').toLowerCase();
        const pos = (req.position_name || '').toLowerCase();
        const dept = (req.department_name || '').toLowerCase();
        if (!code.includes(term) && !title.includes(term) && !pos.includes(term) && !dept.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [requests, activeTab, statusFilter, departmentFilter, recruiterFilter, searchTerm, sortOrder]);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Top Header Row (Screenshot 1) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Yêu cầu tuyển dụng
            </h1>
          </div>
          <Link
            to="/recruitment-requests/create"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'background-color 0.2s'
            }}
          >
            <FiPlus size={18} />
            <span>Tạo yêu cầu mới</span>
          </Link>
        </div>

        {/* Filter Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Search Row */}
          <div style={{ position: 'relative' }}>
            <FiSearch size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tiêu đề, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.95rem',
                color: '#1e293b',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Controls Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) 120px',
            gap: '16px',
            alignItems: 'flex-end'
          }}>
            {/* Trạng thái */}
            <div>
              <label style={filterLabelStyle}>Trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="ALL">Tất cả</option>
                <option value="MOI_TAO">Mới tạo</option>
                <option value="DANG_TUYEN">Đang tuyển</option>
                <option value="TAM_DUNG">Tạm dừng</option>
                <option value="DA_DONG">Đã đóng</option>
                <option value="DA_HUY">Đã hủy</option>
              </select>
            </div>

            {/* Phòng ban */}
            <div>
              <label style={filterLabelStyle}>Phòng ban</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="ALL">Tất cả</option>
                {(Array.isArray(departments) ? departments : []).map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recruiter */}
            <div>
              <label style={filterLabelStyle}>Recruiter</label>
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                style={filterSelectStyle}
              >
                <option value="ALL">Tất cả</option>
                {(Array.isArray(recruiters) ? recruiters : []).map((r) => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Thời gian */}
            <div>
              <label style={filterLabelStyle}>Thời gian</label>
              <div style={{ position: 'relative' }}>
                <FiCalendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  style={{
                    ...filterSelectStyle,
                    paddingLeft: '36px'
                  }}
                />
              </div>
            </div>

            {/* Refresh Button */}
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <FiRotateCw size={15} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Tabs (Screenshot 1) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: `Tất cả (${tabCounts.ALL})` },
            { id: 'MOI_TAO', label: `Mới tạo (${tabCounts.MOI_TAO})` },
            { id: 'DANG_TUYEN', label: `Đang tuyển (${tabCounts.DANG_TUYEN})` },
            { id: 'TAM_DUNG', label: `Tạm dừng (${tabCounts.TAM_DUNG})` },
            { id: 'DA_DONG', label: `Đã đóng (${tabCounts.DA_DONG})` },
            { id: 'DA_HUY', label: `Đã hủy (${tabCounts.DA_HUY})` }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? '700' : '500',
                  border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
                  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                  color: isActive ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table Card (Screenshot 1) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              Đang tải danh sách yêu cầu tuyển dụng...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              Không tìm thấy yêu cầu tuyển dụng nào phù hợp với bộ lọc.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <th style={thStyle}>Mã YC</th>
                    <th style={thStyle}>Tiêu đề yêu cầu</th>
                    <th style={thStyle}>Vị trí</th>
                    <th style={thStyle}>Phòng ban</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thStyle}>Recruiter phụ trách</th>
                    <th
                      style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Ngày tạo</span>
                        <FiChevronDown size={14} style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }} />
                      </div>
                    </th>
                    <th style={thStyle}>Hạn tuyển</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(req => {
                    const norm = normalizeStatus(req.status);
                    const codeDisplay = req.code || `YC-2026-0${req.id}`;
                    const titleDisplay = req.title || (req.position_name ? `Tuyển ${req.position_name}` : `Yêu cầu #${req.id}`);
                    const recruiterName = req.recruiter_name;

                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                        {/* Mã YC */}
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#1e293b' }}>
                          {codeDisplay}
                        </td>

                        {/* Tiêu đề */}
                        <td style={{ ...tdStyle, fontWeight: '600', color: '#1e293b' }}>
                          <Link
                            to={`/recruitment-requests/${req.id}`}
                            style={{ textDecoration: 'none', color: '#0f172a' }}
                          >
                            {titleDisplay}
                          </Link>
                        </td>

                        {/* Vị trí */}
                        <td style={{ ...tdStyle, color: '#475569' }}>
                          {req.position_name || '-'}
                        </td>

                        {/* Phòng ban */}
                        <td style={{ ...tdStyle, color: '#475569' }}>
                          {req.department_name || '-'}
                        </td>

                        {/* Trạng thái */}
                        <td style={tdStyle}>
                          {getStatusBadge(req.status)}
                        </td>

                        {/* Recruiter phụ trách */}
                        <td style={tdStyle}>
                          {recruiterName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AvatarBadge name={recruiterName} size={28} />
                              <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}>
                                {recruiterName}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa phân công</span>
                          )}
                        </td>

                        {/* Ngày tạo */}
                        <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.875rem' }}>
                          {formatDate(req.created_at)}
                        </td>

                        {/* Hạn tuyển */}
                        <td style={{ ...tdStyle, color: '#64748b', fontSize: '0.875rem' }}>
                          {formatDate(req.needed_by_date)}
                        </td>

                        {/* Thao tác (Screenshot 1) */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative' }}>
                            {/* Xem Button */}
                            <Link
                              to={`/recruitment-requests/${req.id}`}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              Xem
                            </Link>

                            {/* Specific Action Button by status */}
                            {norm === 'DANG_TUYEN' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedReq(req); setShowPauseModal(true); }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#334155',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Tạm dừng
                              </button>
                            )}

                            {norm === 'MOI_TAO' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedReq(req); setShowAssignModal(true); }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Phân công
                              </button>
                            )}

                            {norm === 'TAM_DUNG' && (
                              <button
                                type="button"
                                onClick={() => handleResume(req)}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  border: '1px solid #bfdbfe',
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Tiếp tục
                              </button>
                            )}

                            {/* More Actions Dropdown (...) */}
                            <div className="action-menu-container" style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setActionMenuOpenId(actionMenuOpenId === req.id ? null : req.id)}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FiMoreHorizontal size={16} />
                              </button>

                              {actionMenuOpenId === req.id && (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: '6px',
                                  background: '#ffffff',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                  border: '1px solid #e2e8f0',
                                  width: '180px',
                                  zIndex: 50,
                                  padding: '6px 0',
                                  textAlign: 'left'
                                }}>
                                  <button
                                    onClick={() => { setSelectedReq(req); setShowAssignModal(true); setActionMenuOpenId(null); }}
                                    style={menuItemStyle}
                                  >
                                    <FiUserCheck size={15} color="#2563eb" /> Phân công recruiter
                                  </button>

                                  {norm === 'DANG_TUYEN' && (
                                    <button
                                      onClick={() => { setSelectedReq(req); setShowPauseModal(true); setActionMenuOpenId(null); }}
                                      style={menuItemStyle}
                                    >
                                      <FiPauseCircle size={15} color="#d97706" /> Tạm dừng yêu cầu
                                    </button>
                                  )}

                                  {norm === 'TAM_DUNG' && (
                                    <button
                                      onClick={() => { handleResume(req); setActionMenuOpenId(null); }}
                                      style={menuItemStyle}
                                    >
                                      <FiPlayCircle size={15} color="#16a34a" /> Tiếp tục yêu cầu
                                    </button>
                                  )}

                                  {norm !== 'DA_DONG' && norm !== 'DA_HUY' && (
                                    <button
                                      onClick={() => { setSelectedReq(req); setShowCloseModal(true); setActionMenuOpenId(null); }}
                                      style={menuItemStyle}
                                    >
                                      <FiCheckCircle size={15} color="#16a34a" /> Đóng yêu cầu
                                    </button>
                                  )}

                                  {norm !== 'DA_HUY' && (
                                    <button
                                      onClick={() => { setSelectedReq(req); setShowCancelModal(true); setActionMenuOpenId(null); }}
                                      style={{ ...menuItemStyle, color: '#dc2626' }}
                                    >
                                      <FiTrash2 size={15} color="#dc2626" /> Hủy yêu cầu
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODALS */}
      {showAssignModal && selectedReq && (
        <AssignRecruiterModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          request={selectedReq}
          onSuccess={fetchAllData}
        />
      )}

      {showPauseModal && selectedReq && (
        <PauseRequestModal
          isOpen={showPauseModal}
          onClose={() => setShowPauseModal(false)}
          request={selectedReq}
          onSuccess={fetchAllData}
        />
      )}

      {showCloseModal && selectedReq && (
        <CloseRequestModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          request={selectedReq}
          onSuccess={fetchAllData}
        />
      )}

      {showCancelModal && selectedReq && (
        <CancelRequestModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          request={selectedReq}
          onSuccess={fetchAllData}
        />
      )}
    </div>
  );
};

// ==========================================
// STYLES
// ==========================================
const filterLabelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '6px'
};

const filterSelectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  color: '#1e293b',
  background: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box'
};

const thStyle = {
  padding: '14px 16px',
  fontSize: '0.8rem',
  fontWeight: '700',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const tdStyle = {
  padding: '16px',
  fontSize: '0.9rem',
  verticalAlign: 'middle'
};

const menuItemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 16px',
  border: 'none',
  background: 'none',
  fontSize: '0.875rem',
  color: '#334155',
  cursor: 'pointer',
  textAlign: 'left'
};

export default RecruitmentRequestList;
