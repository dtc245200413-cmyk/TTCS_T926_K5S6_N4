import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiX, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiTrash2, 
  FiInfo, 
  FiCalendar, 
  FiUser, 
  FiClock, 
  FiFilter 
} from 'react-icons/fi';

const API_BASE = `${API_BASE_URL}/recruitment-requests`;

// Helper to get initials & colors
export const getAvatarColor = (name = '') => {
  const colors = [
    { bg: '#dbeafe', text: '#1d4ed8' }, // Blue
    { bg: '#f3e8ff', text: '#7e22ce' }, // Purple
    { bg: '#fef3c7', text: '#b45309' }, // Amber
    { bg: '#ccfbf1', text: '#0f766e' }, // Teal
    { bg: '#fee2e2', text: '#b91c1c' }, // Red
    { bg: '#e0e7ff', text: '#4338ca' }  // Indigo
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getInitials = (name = '') => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AvatarBadge = ({ name, size = 32, style = {} }) => {
  const { bg, text } = getAvatarColor(name);
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: bg,
        color: text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: size <= 28 ? '0.7rem' : '0.8rem',
        flexShrink: 0,
        ...style
      }}
    >
      {getInitials(name)}
    </div>
  );
};

// ==========================================
// 1. MODAL PHÂN CÔNG RECRUITER (Screenshot 3 - Left)
// ==========================================
export const AssignRecruiterModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [recruiters, setRecruiters] = useState([]);
  const [recruiterId, setRecruiterId] = useState('');
  const [assistantRecruiterId, setAssistantRecruiterId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecruiterId(request?.recruiter_id ? String(request.recruiter_id) : '');
      setAssistantRecruiterId(request?.assistant_recruiter_id ? String(request.assistant_recruiter_id) : '');
      setNote(request?.assignment_note || '');
      fetchRecruiters();
    }
  }, [isOpen, request]);

  const fetchRecruiters = async () => {
    setFetchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/recruiters-workload`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        const d = res.data?.data;
        setRecruiters(Array.isArray(d) ? d : (d?.recruiters || []));
      }
    } catch (err) {
      console.error('Failed to load recruiters', err);
    } finally {
      setFetchLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recruiterId) {
      alert('Vui lòng chọn Recruiter chính.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        recruiter_id: Number(recruiterId),
        assistant_recruiter_id: assistantRecruiterId ? Number(assistantRecruiterId) : null,
        assignment_note: note.trim() || null
      };
      await axios.patch(`${API_BASE}/${request.id}/assign`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Phân công recruiter thành công!');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi phân công.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContainerStyle, maxWidth: '520px' }}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            Phân công recruiter
          </h3>
          <button onClick={onClose} style={closeBtnStyle}><FiX size={20} /></button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Info Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#1e40af',
            fontSize: '0.9rem'
          }}>
            <FiInfo size={18} style={{ flexShrink: 0 }} />
            <span>Chỉ yêu cầu hợp lệ mới được phân công.</span>
          </div>

          {/* Recruiter chính */}
          <div style={{ marginBottom: '16px' }}>
            <label style={fieldLabelStyle}>
              Recruiter chính <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={recruiterId}
              onChange={(e) => setRecruiterId(e.target.value)}
              required
              style={selectInputStyle}
            >
              <option value="">-- Chọn Recruiter chính --</option>
              {(Array.isArray(recruiters) ? recruiters : []).map((rec) => (
                <option key={rec.user_id} value={rec.user_id}>
                  {rec.full_name} • Đang phụ trách {rec.active_request_count || 0} YC
                </option>
              ))}
            </select>
          </div>

          {/* Recruiter hỗ trợ */}
          <div style={{ marginBottom: '16px' }}>
            <label style={fieldLabelStyle}>
              Recruiter hỗ trợ
            </label>
            <select
              value={assistantRecruiterId}
              onChange={(e) => setAssistantRecruiterId(e.target.value)}
              style={selectInputStyle}
            >
              <option value="">-- Không có recruiter hỗ trợ --</option>
              {(Array.isArray(recruiters) ? recruiters : []).filter(r => String(r.user_id) !== String(recruiterId)).map((rec) => (
                <option key={rec.user_id} value={rec.user_id}>
                  {rec.full_name} • Đang phụ trách {rec.active_request_count || 0} YC
                </option>
              ))}
            </select>
          </div>

          {/* Ghi chú phân công */}
          <div style={{ marginBottom: '24px' }}>
            <label style={fieldLabelStyle}>
              Ghi chú phân công
            </label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Nhập ghi chú (nếu có)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={textareaStyle}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              {note.length}/500
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Hủy
            </button>
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Đang lưu...' : 'Xác nhận phân công'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. MODAL TẠM DỪNG YÊU CẦU (Screenshot 3 - Right)
// ==========================================
export const PauseRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotify(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do tạm dừng.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/${request.id}/status-action`, {
        status: 'PAUSED',
        reason: reason.trim(),
        notify_recruiter: notify
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã chuyển trạng thái yêu cầu sang Tạm dừng.');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContainerStyle, maxWidth: '520px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            Tạm dừng yêu cầu
          </h3>
          <button onClick={onClose} style={closeBtnStyle}><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Warning Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            color: '#92400e',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <FiAlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              Yêu cầu sẽ được chuyển sang trạng thái <strong>Tạm dừng</strong> và ghi lại trong lịch sử xử lý.
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '16px' }}>
            <label style={fieldLabelStyle}>
              Lý do tạm dừng <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Nhập lý do tạm dừng..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={textareaStyle}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              {reason.length}/500
            </div>
          </div>

          {/* Checkbox */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="notify-recruiter"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
            />
            <label htmlFor="notify-recruiter" style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
              Thông báo cho recruiter phụ trách
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Quay lại
            </button>
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Đang xử lý...' : 'Xác nhận tạm dừng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. MODAL ĐÓNG YÊU CẦU (Screenshot 4 - Left)
// ==========================================
export const CloseRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do đóng yêu cầu.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/${request.id}/status-action`, {
        status: 'CLOSED',
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã đóng yêu cầu tuyển dụng thành công.');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContainerStyle, maxWidth: '520px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            Đóng yêu cầu
          </h3>
          <button onClick={onClose} style={closeBtnStyle}><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Success / Info Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            color: '#166534',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <FiCheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Xác nhận đóng yêu cầu</strong><br />
              Yêu cầu sẽ được chuyển sang trạng thái <strong>Đã đóng</strong> và ghi lại trong lịch sử xử lý.
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '24px' }}>
            <label style={fieldLabelStyle}>
              Lý do đóng <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Nhập lý do đóng yêu cầu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={textareaStyle}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              {reason.length}/500
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Quay lại
            </button>
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Đang xử lý...' : 'Xác nhận đóng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 4. MODAL HỦY YÊU CẦU (Screenshot 4 - Middle)
// ==========================================
export const CancelRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do hủy yêu cầu.');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE}/${request.id}/status-action`, {
        status: 'CANCELLED',
        reason: reason.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã hủy yêu cầu tuyển dụng.');
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContainerStyle, maxWidth: '520px' }}>
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            Hủy yêu cầu
          </h3>
          <button onClick={onClose} style={closeBtnStyle}><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Danger Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <FiTrash2 size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Xác nhận hủy yêu cầu</strong><br />
              Yêu cầu sẽ được chuyển sang trạng thái <strong>Đã hủy</strong> và ghi lại trong lịch sử xử lý. Hành động này không thể hoàn tác.
            </div>
          </div>

          {/* Reason */}
          <div style={{ marginBottom: '24px' }}>
            <label style={fieldLabelStyle}>
              Lý do hủy <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Nhập lý do hủy yêu cầu..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={textareaStyle}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              {reason.length}/500
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>
              Quay lại
            </button>
            <button type="submit" disabled={loading} style={btnDangerStyle}>
              {loading ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 5. MODAL LỊCH SỬ XỬ LÝ (Screenshot 4 - Right)
// ==========================================
export const HistoryModal = ({ isOpen, onClose, requestId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen && requestId) {
      fetchLogs();
    }
  }, [isOpen, requestId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/${requestId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        const d = res.data?.data;
        setLogs(Array.isArray(d) ? d : (d?.logs || []));
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(item => {
    if (actionFilter === 'ALL') return true;
    return item.action?.toLowerCase().includes(actionFilter.toLowerCase());
  });

  const getDotColor = (action = '') => {
    const act = action.toLowerCase();
    if (act.includes('phân công') || act.includes('assign')) return '#3b82f6'; // Blue
    if (act.includes('tạm dừng') || act.includes('pause')) return '#f59e0b'; // Orange
    if (act.includes('tiếp tục') || act.includes('resume') || act.includes('đóng') || act.includes('close')) return '#10b981'; // Green
    if (act.includes('hủy') || act.includes('cancel') || act.includes('reject')) return '#ef4444'; // Red
    return '#94a3b8'; // Slate/Gray
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...modalContainerStyle, maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
            Lịch sử xử lý
          </h3>
          <button onClick={onClose} style={closeBtnStyle}><FiX size={20} /></button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ ...selectInputStyle, flex: 1 }}
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="phân công">Phân công recruiter</option>
            <option value="tạm dừng">Tạm dừng yêu cầu</option>
            <option value="tiếp tục">Tiếp tục yêu cầu</option>
            <option value="cập nhật">Cập nhật thông tin</option>
            <option value="tạo yêu cầu">Tạo yêu cầu</option>
            <option value="đóng">Đóng yêu cầu</option>
            <option value="hủy">Hủy yêu cầu</option>
          </select>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#64748b',
            fontSize: '0.875rem',
            background: '#f8fafc'
          }}>
            <FiCalendar size={16} />
            <span>Tất cả thời gian</span>
          </div>
        </div>

        {/* Timeline list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Đang tải lịch sử...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Chưa có ghi nhận lịch sử xử lý nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {filteredLogs.map((log, idx) => {
                const dotColor = getDotColor(log.action);
                const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '';
                return (
                  <div key={log.audit_log_id || idx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    {/* Time & User badge */}
                    <div style={{ width: '160px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{dateStr}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AvatarBadge name={log.user_full_name || 'Hà Đức Minh'} size={24} />
                        <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                          {log.user_full_name || 'Hà Đức Minh'}
                        </span>
                      </div>
                    </div>

                    {/* Timeline line and dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        marginTop: '4px',
                        flexShrink: 0
                      }} />
                      {idx !== filteredLogs.length - 1 && (
                        <div style={{
                          width: '2px',
                          flex: 1,
                          backgroundColor: '#e2e8f0',
                          marginTop: '4px'
                        }} />
                      )}
                    </div>

                    {/* Description */}
                    <div style={{ flex: 1, paddingBottom: '12px' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginBottom: '2px' }}>
                        {log.action}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.4' }}>
                        {log.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondaryStyle}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// STYLES
// ==========================================
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
  backdropFilter: 'blur(3px)'
};

const modalContainerStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  overflow: 'hidden'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #f1f5f9'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px'
};

const fieldLabelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '8px'
};

const selectInputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  color: '#1e293b',
  background: '#ffffff',
  outline: 'none',
  cursor: 'pointer'
};

const textareaStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  color: '#1e293b',
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box'
};

const btnSecondaryStyle = {
  background: '#ffffff',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '9px 18px',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '0.9rem',
  cursor: 'pointer'
};

const btnPrimaryStyle = {
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '9px 20px',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
};

const btnDangerStyle = {
  background: '#dc2626',
  color: '#ffffff',
  border: 'none',
  padding: '9px 20px',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
};
