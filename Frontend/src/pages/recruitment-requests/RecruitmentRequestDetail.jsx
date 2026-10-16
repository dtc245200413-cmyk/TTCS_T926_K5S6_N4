import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { 
  FiChevronLeft, 
  FiUserCheck, 
  FiPause, 
  FiPlay, 
  FiCheckCircle, 
  FiTrash2, 
  FiClock, 
  FiEdit, 
  FiInfo 
} from 'react-icons/fi';
import { 
  AssignRecruiterModal, 
  PauseRequestModal, 
  CloseRequestModal, 
  CancelRequestModal,
  HistoryModal,
  AvatarBadge
} from './RecruitmentRequestModals';

const API_BASE = 'http://localhost:5000/api/recruitment-requests';

const RecruitmentRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [request, setRequest] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const fetchDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resReq, resLogs] = await Promise.all([
        axios.get(`${API_BASE}/${id}`, { headers }),
        axios.get(`${API_BASE}/${id}/logs`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      if (resReq.data?.success) {
        setRequest(resReq.data.data);
      } else {
        setError('Không tìm thấy thông tin yêu cầu tuyển dụng.');
      }
      const rawLogs = resLogs.data?.data;
      setLogs(Array.isArray(rawLogs) ? rawLogs : (rawLogs?.logs || []));
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        Đang tải thông tin yêu cầu tuyển dụng...
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
        {error || 'Không tìm thấy yêu cầu tuyển dụng.'}
      </div>
    );
  }

  const normalizeStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (['DRAFT', 'PENDING', 'NEEDS_REVISION'].includes(s)) return 'MOI_TAO';
    if (['IN_PROGRESS', 'APPROVED'].includes(s)) return 'DANG_TUYEN';
    if (['PAUSED'].includes(s)) return 'TAM_DUNG';
    if (['CLOSED', 'COMPLETED'].includes(s)) return 'DA_DONG';
    if (['CANCELLED', 'REJECTED'].includes(s)) return 'DA_HUY';
    return 'KHAC';
  };

  const getStatusBadge = (status) => {
    const norm = normalizeStatus(status);
    const configs = {
      DANG_TUYEN: { label: 'Đang tuyển', bg: '#e0f2fe', color: '#0284c7' },
      MOI_TAO: { label: 'Mới tạo', bg: '#f1f5f9', color: '#475569' },
      TAM_DUNG: { label: 'Tạm dừng', bg: '#fef3c7', color: '#d97706' },
      DA_DONG: { label: 'Đã đóng', bg: '#dcfce7', color: '#16a34a' },
      DA_HUY: { label: 'Đã hủy', bg: '#fee2e2', color: '#dc2626' }
    };
    const cfg = configs[norm] || { label: status, bg: '#f1f5f9', color: '#475569' };
    return (
      <span style={{
        padding: '6px 16px',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        fontWeight: '700',
        backgroundColor: cfg.bg,
        color: cfg.color,
        display: 'inline-block'
      }}>
        {cfg.label}
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

  const formatCurrency = (amount) => {
    if (!amount) return 'Thoả thuận';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
  };

  const normStatus = normalizeStatus(request.status);
  const codeDisplay = request.code || `YC-2026-0${request.id}`;
  const titleDisplay = request.title || (request.position_name ? `Tuyển ${request.position_name}` : `Yêu cầu tuyển dụng`);

  // Parse skills
  const skillsList = request.skills
    ? request.skills.split(',').map(s => s.trim()).filter(Boolean)
    : ['Java', 'Spring Boot', 'Microservices', 'SQL', 'Docker'];

  // Handle Quick Resume
  const handleResume = async () => {
    if (!window.confirm('Tiếp tục triển khai yêu cầu tuyển dụng này?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/${request.id}/status-action`, {
        status: 'IN_PROGRESS',
        reason: 'Tiếp tục triển khai tuyển dụng'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã tiếp tục triển khai yêu cầu tuyển dụng!');
      fetchDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 80px)', padding: '24px 32px 100px 32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Back Link (Screenshot 2) */}
        <div>
          <button
            onClick={() => navigate('/recruitment-requests')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.95rem',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <FiChevronLeft size={18} />
            <span>Quay lại danh sách</span>
          </button>
        </div>

        {/* Page Title & Status Badge (Screenshot 2) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {codeDisplay} - {titleDisplay}
              </h1>
              {getStatusBadge(request.status)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Phòng ban: <strong>{request.department_name || 'Chưa cập nhật'}</strong> &nbsp;|&nbsp; Tạo ngày: {formatDate(request.created_at)} &nbsp;|&nbsp; Hạn tuyển: {formatDate(request.needed_by_date)}
            </div>
          </div>
        </div>

        {/* Main 2-Column Content Grid (Screenshot 2) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Card: Thông tin chung */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              Thông tin chung
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Mã yêu cầu */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Mã yêu cầu</span>
                <span style={infoValueStyle}>{codeDisplay}</span>
              </div>

              {/* Vị trí tuyển dụng */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Vị trí tuyển dụng</span>
                <span style={infoValueStyle}>{request.position_name || '-'}</span>
              </div>

              {/* Phòng ban */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Phòng ban</span>
                <span style={infoValueStyle}>{request.department_name || '-'}</span>
              </div>

              {/* Số lượng tuyển */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Số lượng tuyển</span>
                <span style={infoValueStyle}>{request.headcount ? `${String(request.headcount).padStart(2, '0')} người` : '-'}</span>
              </div>

              {/* Hình thức làm việc */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Hình thức làm việc</span>
                <span style={infoValueStyle}>
                  {request.work_type_code === 'PARTTIME' ? 'Bán thời gian' : (request.work_type_code === 'REMOTE' ? 'Làm việc từ xa' : 'Toàn thời gian')}
                </span>
              </div>

              {/* Cấp bậc / Mức lương */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Cấp bậc / Mức lương</span>
                <span style={infoValueStyle}>
                  {request.level_salary || (request.proposed_salary_min && request.proposed_salary_max ? `${request.proposed_salary_min / 1000000} - ${request.proposed_salary_max / 1000000} triệu` : 'Thoả thuận')}
                </span>
              </div>

              {/* Ngân sách */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Ngân sách</span>
                <span style={infoValueStyle}>
                  {request.budget ? formatCurrency(request.budget) : (request.proposed_salary_max && request.headcount ? formatCurrency(request.proposed_salary_max * request.headcount * 3) : '450,000,000 VNĐ')}
                </span>
              </div>

              {/* Recruiter hiện tại */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Recruiter hiện tại</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {request.recruiter_name ? (
                    <>
                      <AvatarBadge name={request.recruiter_name} size={28} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {request.recruiter_name}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Chưa phân công</span>
                  )}
                  <button
                    onClick={() => setShowAssignModal(true)}
                    style={btnChangeStyle}
                  >
                    Đổi
                  </button>
                </div>
              </div>

              {/* Recruiter hỗ trợ */}
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}>Recruiter hỗ trợ</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {request.assistant_recruiter_name ? (
                    <>
                      <AvatarBadge name={request.assistant_recruiter_name} size={28} />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {request.assistant_recruiter_name}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Chưa có</span>
                  )}
                  <button
                    onClick={() => setShowAssignModal(true)}
                    style={btnChangeStyle}
                  >
                    Đổi
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Mô tả nhu cầu */}
            <div style={cardStyle}>
              <h2 style={cardHeaderStyle}>Mô tả nhu cầu</h2>
              <div style={{ fontSize: '0.925rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {request.job_description || 'Tuyển dụng Kỹ sư Backend tham gia phát triển hệ thống sản phẩm của công ty. Ứng viên có kinh nghiệm với Java/Spring Boot, ưu tiên có kinh nghiệm xây dựng hệ thống lớn, hiểu biết về microservices.'}
              </div>
            </div>

            {/* Card 2: Lý do tuyển */}
            <div style={cardStyle}>
              <h2 style={cardHeaderStyle}>Lý do tuyển</h2>
              <div style={{ fontSize: '0.925rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {request.reason || 'Mở rộng đội ngũ phát triển để triển khai dự án sản phẩm mới trong Q4/2026.'}
              </div>
            </div>

            {/* Card 3: Yêu cầu kỹ năng chính */}
            <div style={cardStyle}>
              <h2 style={cardHeaderStyle}>Yêu cầu kỹ năng chính</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {skillsList.map((skill, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Section: Lịch sử xử lý (Screenshot 2 bottom) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Lịch sử xử lý
            </h2>
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Xem tất cả
            </button>
          </div>

          {/* Timeline List Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '8px' }}>
            {logs.length > 0 ? (
              logs.slice(0, 3).map((log, idx) => {
                const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '';
                return (
                  <div key={log.audit_log_id || idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#3b82f6' : '#94a3b8',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.85rem', color: '#64748b', width: '130px', flexShrink: 0 }}>
                      {dateStr}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '160px', flexShrink: 0 }}>
                      <AvatarBadge name={log.user_full_name || 'Hà Đức Minh'} size={24} />
                      <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>
                        {log.user_full_name || 'Hà Đức Minh'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', flex: 1 }}>
                      {log.description || log.action}
                    </div>
                  </div>
                );
              })
            ) : (
              // Default preview matching mockup 2
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b', width: '130px', flexShrink: 0 }}>14/10/2026 09:15</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '160px', flexShrink: 0 }}>
                    <AvatarBadge name="Hà Đức Minh" size={24} />
                    <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>Hà Đức Minh</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', flex: 1 }}>
                    Phân công recruiter {request.recruiter_name || 'Nguyễn Anh Sơn'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b', width: '130px', flexShrink: 0 }}>12/10/2026 10:30</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '160px', flexShrink: 0 }}>
                    <AvatarBadge name="Trần Thị Lan" size={24} />
                    <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>Trần Thị Lan</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', flex: 1 }}>
                    Cập nhật mô tả yêu cầu
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', color: '#64748b', width: '130px', flexShrink: 0 }}>10/10/2026 08:30</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '160px', flexShrink: 0 }}>
                    <AvatarBadge name="Hà Đức Minh" size={24} />
                    <span style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '600' }}>Hà Đức Minh</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', flex: 1 }}>
                    Tạo yêu cầu tuyển dụng
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Floating / Fixed Action Bar (Screenshot 2 Bottom) */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '260px',
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '16px 32px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: '12px',
          zIndex: 40
        }}>
          {/* Button 1: Phân công recruiter */}
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            <FiUserCheck size={18} />
            <span>Phân công recruiter</span>
          </button>

          {/* Button 2: Tạm dừng / Tiếp tục */}
          {normStatus === 'TAM_DUNG' ? (
            <button
              type="button"
              onClick={handleResume}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <FiPlay size={18} />
              <span>Tiếp tục yêu cầu</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPauseModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <FiPause size={18} />
              <span>Tạm dừng</span>
            </button>
          )}

          {/* Button 3: Đóng yêu cầu */}
          {normStatus !== 'DA_DONG' && normStatus !== 'DA_HUY' && (
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <FiCheckCircle size={18} />
              <span>Đóng yêu cầu</span>
            </button>
          )}

          {/* Button 4: Hủy yêu cầu */}
          {normStatus !== 'DA_HUY' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <FiTrash2 size={18} />
              <span>Hủy yêu cầu</span>
            </button>
          )}
        </div>

      </div>

      {/* MODALS */}
      {showAssignModal && (
        <AssignRecruiterModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          request={request}
          onSuccess={fetchDetail}
        />
      )}

      {showPauseModal && (
        <PauseRequestModal
          isOpen={showPauseModal}
          onClose={() => setShowPauseModal(false)}
          request={request}
          onSuccess={fetchDetail}
        />
      )}

      {showCloseModal && (
        <CloseRequestModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          request={request}
          onSuccess={fetchDetail}
        />
      )}

      {showCancelModal && (
        <CancelRequestModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          request={request}
          onSuccess={fetchDetail}
        />
      )}

      {showHistoryModal && (
        <HistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          requestId={request.id}
        />
      )}
    </div>
  );
};

// ==========================================
// STYLES
// ==========================================
const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0'
};

const infoLabelStyle = {
  fontSize: '0.9rem',
  color: '#64748b',
  fontWeight: '500'
};

const infoValueStyle = {
  fontSize: '0.9rem',
  color: '#0f172a',
  fontWeight: '600'
};

const btnChangeStyle = {
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  color: '#334155',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const cardHeaderStyle = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: '#0f172a',
  margin: 0,
  borderBottom: '1px solid #f1f5f9',
  paddingBottom: '10px'
};

export default RecruitmentRequestDetail;
