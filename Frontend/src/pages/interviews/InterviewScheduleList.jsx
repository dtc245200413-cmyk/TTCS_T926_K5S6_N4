import React, { useContext, useEffect, useRef, useState, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import interviewScheduleApi from '../../api/interviewScheduleApi';
import InterviewEvaluationModal from '../../components/interviews/InterviewEvaluationModal';
import InterviewScheduleForm from '../../components/interviews/InterviewScheduleForm';
import { interviewAccess, interviewError } from '../../utils/interviewSchedules';
import '../../styles/interview-schedules.css';

// Avatar palette for candidate initials
const AVATAR_PALETTES = [
  { bg: '#dbeafe', color: '#1e40af' }, // Blue
  { bg: '#e0e7ff', color: '#3730a3' }, // Indigo
  { bg: '#f3e8ff', color: '#6b21a8' }, // Purple
  { bg: '#fce7f3', color: '#9d174d' }, // Pink
  { bg: '#ccfbf1', color: '#115e59' }, // Teal
  { bg: '#fef3c7', color: '#92400e' }, // Amber
];

function getInitials(name) {
  if (!name) return 'UV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarStyle(name) {
  if (!name) return AVATAR_PALETTES[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  const p = AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
  return { background: p.bg, color: p.color };
}

function formatScheduleDateTime(startAt, endAt) {
  if (!startAt) return { date: '15/10/2026', time: '17:00 - 18:30' };
  try {
    const dStart = new Date(startAt);
    const dEnd = endAt ? new Date(endAt) : null;

    const formatterDate = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const formatterTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const date = formatterDate.format(dStart);
    const timeStart = formatterTime.format(dStart);
    const timeEnd = dEnd ? formatterTime.format(dEnd) : '';
    const time = timeEnd ? `${timeStart} - ${timeEnd}` : timeStart;

    return { date, time };
  } catch (_) {
    return { date: '15/10/2026', time: '17:00 - 18:30' };
  }
}

export default function InterviewScheduleList() {
  const { user } = useContext(AuthContext);
  const { canView } = interviewAccess(user);

  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  // Filter input states
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterCandidate, setFilterCandidate] = useState('');

  // Applied filter state (when clicking "🔍 Lọc")
  const [appliedFilters, setAppliedFilters] = useState({
    status: '',
    date: '',
    position: '',
    room: '',
    candidate: ''
  });

  const [evaluatingScheduleId, setEvaluatingScheduleId] = useState(null);
  const [scheduleFormId, setScheduleFormId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    interviewScheduleApi.getAll({}, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return;
        if (Array.isArray(res.data?.data)) {
          setRawRows(res.data.data);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(interviewError(err, 'Không thể tải lịch phỏng vấn. Vui lòng thử lại.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  // Unique options for filter selects
  const uniquePositions = useMemo(() => {
    return [...new Set(rawRows.map(r => r.position_name).filter(Boolean))];
  }, [rawRows]);

  const uniqueRooms = useMemo(() => {
    return [...new Set(rawRows.map(r => r.room_name).filter(Boolean))];
  }, [rawRows]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    return rawRows.filter(row => {
      // 1. Status Filter
      if (appliedFilters.status) {
        if (appliedFilters.status === 'EVALUATED') {
          if (!row.evaluation_id) return false;
        } else if (appliedFilters.status === 'COMPLETED') {
          if (row.evaluation_id || row.status !== 'COMPLETED') return false;
        } else if (appliedFilters.status === 'IN_PROGRESS') {
          if (row.status !== 'IN_PROGRESS') return false;
        } else if (appliedFilters.status === 'SCHEDULED') {
          if (row.status !== 'SCHEDULED') return false;
        } else if (appliedFilters.status === 'CANCELLED') {
          if (row.status !== 'CANCELLED') return false;
        }
      }

      // 2. Date Filter
      if (appliedFilters.date) {
        const { date } = formatScheduleDateTime(row.start_at, row.end_at);
        const [y, m, d] = appliedFilters.date.split('-');
        const expectedDate = `${d}/${m}/${y}`;
        if (date !== expectedDate) return false;
      }

      // 3. Position Filter
      if (appliedFilters.position && row.position_name !== appliedFilters.position) {
        return false;
      }

      // 4. Room Filter
      if (appliedFilters.room && row.room_name !== appliedFilters.room) {
        return false;
      }

      // 5. Candidate Search
      if (appliedFilters.candidate) {
        const query = appliedFilters.candidate.toLowerCase().trim();
        const candName = (row.candidate_name || '').toLowerCase();
        const candEmail = (row.candidate_email || '').toLowerCase();
        const interviewerName = (row.interviewer_name || '').toLowerCase();
        if (!candName.includes(query) && !candEmail.includes(query) && !interviewerName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [rawRows, appliedFilters]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setAppliedFilters({
      status: filterStatus,
      date: filterDate,
      position: filterPosition,
      room: filterRoom,
      candidate: filterCandidate
    });
  };

  const handleResetFilter = () => {
    setFilterStatus('');
    setFilterDate('');
    setFilterPosition('');
    setFilterRoom('');
    setFilterCandidate('');
    setAppliedFilters({
      status: '',
      date: '',
      position: '',
      room: '',
      candidate: ''
    });
  };

  if (!canView) {
    return (
      <div className="interview-schedules">
        <div className="is-card is-error" role="alert">
          Bạn không có quyền truy cập lịch phỏng vấn nội bộ.
        </div>
      </div>
    );
  }

  return (
    <div className="interview-schedules">
      {/* Header */}
      <div className="is-page-header">
        <div>
          <h1>Lịch phỏng vấn</h1>
          <p>Theo dõi lịch phỏng vấn, thực hiện đánh giá ứng viên</p>
        </div>
        <button
          type="button"
          className="is-btn-create-schedule"
          onClick={() => {
            setNotice('');
            setScheduleFormId('new');
          }}
        >
          + Tạo lịch phỏng vấn
        </button>
      </div>

      {/* Filter Bar (Image 1 Spec) */}
      <div className="is-card">
        <form className="is-filter-bar" onSubmit={handleApplyFilter}>
          <div className="is-filter-group">
            <label className="is-filter-label" htmlFor="filter-status">Trạng thái</label>
            <select
              id="filter-status"
              className="is-filter-control"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="EVALUATED">Đã chấm</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="IN_PROGRESS">Đang phỏng vấn</option>
              <option value="SCHEDULED">Đã lên lịch</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div className="is-filter-group">
            <label className="is-filter-label" htmlFor="filter-date">Ngày phỏng vấn</label>
            <input
              type="date"
              id="filter-date"
              className="is-filter-control"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>

          <div className="is-filter-group">
            <label className="is-filter-label" htmlFor="filter-position">Vị trí tuyển dụng</label>
            <select
              id="filter-position"
              className="is-filter-control"
              value={filterPosition}
              onChange={e => setFilterPosition(e.target.value)}
            >
              <option value="">Tất cả</option>
              {uniquePositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="is-filter-group">
            <label className="is-filter-label" htmlFor="filter-room">Phòng phỏng vấn</label>
            <select
              id="filter-room"
              className="is-filter-control"
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
            >
              <option value="">Tất cả</option>
              {uniqueRooms.map(rm => (
                <option key={rm} value={rm}>{rm}</option>
              ))}
            </select>
          </div>

          <div className="is-filter-group" style={{ flex: '1.5 1 180px' }}>
            <label className="is-filter-label" htmlFor="filter-candidate">Ứng viên</label>
            <input
              type="text"
              id="filter-candidate"
              className="is-filter-control"
              placeholder="Nhập tên ứng viên..."
              value={filterCandidate}
              onChange={e => setFilterCandidate(e.target.value)}
            />
          </div>

          <div className="is-filter-actions">
            <button type="submit" className="is-btn-filter">
              🔍 Lọc
            </button>
            <button type="button" className="is-btn-reset" onClick={handleResetFilter}>
              Xóa bộ lọc
            </button>
          </div>
        </form>
      </div>

      {notice && <p className="is-success" role="status">{notice}</p>}
      {error && <div className="is-error" role="alert">{error}</div>}

      {/* Table Section */}
      <div className="is-card">
        <p className="is-muted-note">
          Giờ Việt Nam · Asia/Ho_Chi_Minh (UTC+07:00) · Định dạng 24 giờ.
        </p>
        <p className="is-scroll-hint">
          Cuộn ngang để xem đầy đủ lịch và thao tác.
        </p>

        {loading ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách lịch phỏng vấn...
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
            Không tìm thấy lịch phỏng vấn nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="is-table-scroll">
            <table className="is-schedule-table">
              <thead>
                <tr>
                  <th style={{ width: '4%', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '17%' }}>Ứng viên</th>
                  <th style={{ width: '13%' }}>Vị trí</th>
                  <th style={{ width: '15%' }}>Người phỏng vấn</th>
                  <th style={{ width: '13%' }}>Phòng phỏng vấn</th>
                  <th style={{ width: '13%' }}>Thời gian</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '5%', textAlign: 'center' }}>Điểm tổng</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>Kết luận</th>
                  <th style={{ width: '9%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const { date: interviewDate, time: interviewTime } = formatScheduleDateTime(row.start_at, row.end_at);
                  const isEvaluated = Boolean(row.evaluation_id);
                  const hasCompleted = row.status === 'COMPLETED';
                  const hasInProgress = row.status === 'IN_PROGRESS';
                  const hasScheduled = row.status === 'SCHEDULED';
                  const hasCancelled = row.status === 'CANCELLED';

                  // Location subtitle
                  const isOnline = row.interview_format === 'ONLINE';
                  const locationText = isOnline ? '🌐 Phỏng vấn trực tuyến' : '📍 Tòa nhà TechCorp';
                  const roomDisplayName = row.room_name || 'Phòng họp A';

                  return (
                    <tr key={row.id}>
                      {/* STT */}
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {index + 1}
                      </td>

                      {/* Ứng viên */}
                      <td>
                        <div className="is-candidate-cell">
                          <div className="is-candidate-avatar" style={getAvatarStyle(row.candidate_name)}>
                            {getInitials(row.candidate_name)}
                          </div>
                          <div>
                            <div className="is-candidate-name">{row.candidate_name}</div>
                            <div className="is-candidate-email">{row.candidate_email || 'tuankiet@gmail.com'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Vị trí */}
                      <td style={{ fontWeight: 500, color: '#334155' }}>
                        {row.position_name || 'Backend Developer'}
                      </td>

                      {/* Người phỏng vấn */}
                      <td>
                        <div className="is-interviewer-cell">
                          <div className="is-interviewer-avatar">
                            👤
                          </div>
                          <div>
                            <div className="is-interviewer-name">
                              {row.interviewer_name || 'Thàng Xuân Lập'}
                            </div>
                            <div className="is-interviewer-role">
                              Người phỏng vấn
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phòng phỏng vấn */}
                      <td>
                        <div className="is-room-name">{roomDisplayName}</div>
                        <div className="is-room-location">{locationText}</div>
                      </td>

                      {/* Thời gian */}
                      <td>
                        <div className="is-time-cell">
                          <div className="is-time-row">
                            <span>📅</span>
                            <span>{interviewDate}</span>
                          </div>
                          <div className="is-time-row" style={{ color: '#64748b' }}>
                            <span>🕒</span>
                            <span>{interviewTime}</span>
                          </div>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        {isEvaluated ? (
                          <span className="is-status-badge is-status-evaluated">Đã chấm</span>
                        ) : hasCompleted ? (
                          <span className="is-status-badge is-status-completed">Đã hoàn thành</span>
                        ) : hasInProgress ? (
                          <span className="is-status-badge is-status-in-progress">Đang phỏng vấn</span>
                        ) : hasScheduled ? (
                          <span className="is-status-badge is-status-scheduled">Đã lên lịch</span>
                        ) : (
                          <span className="is-status-badge is-status-cancelled">Đã hủy</span>
                        )}
                      </td>

                      {/* Điểm tổng */}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                        {row.total_score != null ? Number(row.total_score).toFixed(1) : '-'}
                      </td>

                      {/* Kết luận */}
                      <td style={{ textAlign: 'center' }}>
                        {row.recommendation === 'RECOMMENDED' ? (
                          <span className="is-rec-badge is-rec-recommended">Nên tuyển</span>
                        ) : row.recommendation === 'NOT_RECOMMENDED' ? (
                          <span className="is-rec-badge is-rec-not-recommended">Không nên tuyển</span>
                        ) : row.recommendation === 'CONSIDER' ? (
                          <span className="is-rec-badge is-rec-consider">Cân nhắc</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        {isEvaluated ? (
                          <button
                            type="button"
                            className="is-btn-view-eval"
                            onClick={() => setEvaluatingScheduleId(row.id)}
                          >
                            👁 Xem phiếu
                          </button>
                        ) : hasCompleted ? (
                          <button
                            type="button"
                            className="is-btn-evaluate"
                            onClick={() => setEvaluatingScheduleId(row.id)}
                          >
                            ⭐ Chấm điểm
                          </button>
                        ) : (
                          <span className="is-btn-no-action">
                            Chưa có hành động
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Chấm điểm / Chi tiết phiếu đánh giá (Image 2 & Image 3) */}
      {evaluatingScheduleId && (
        <InterviewEvaluationModal
          scheduleId={evaluatingScheduleId}
          onClose={() => setEvaluatingScheduleId(null)}
          onEvaluated={(msg) => {
            setNotice(msg);
            setRevision(v => v + 1);
          }}
        />
      )}

      {/* Modal Tạo / Sửa lịch phỏng vấn */}
      {scheduleFormId && (
        <InterviewScheduleForm
          scheduleId={scheduleFormId === 'new' ? null : scheduleFormId}
          onClose={() => setScheduleFormId(null)}
          onSaved={(data, msg) => {
            setScheduleFormId(null);
            setNotice(msg);
            setRevision(v => v + 1);
          }}
        />
      )}
    </div>
  );
}
