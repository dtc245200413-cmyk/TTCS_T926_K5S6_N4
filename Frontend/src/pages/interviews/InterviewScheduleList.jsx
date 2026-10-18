import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import interviewScheduleApi from '../../api/interviewScheduleApi';
import InterviewScheduleForm from '../../components/interviews/InterviewScheduleForm';
import { displayTime, interviewAccess, interviewError, toLocalInput } from '../../utils/interviewSchedules';
import '../../styles/interview-schedules.css';

const filterFields = [
  ['candidate_id', 'Ứng viên', 'candidate_name'],
  ['interviewer_id', 'Người phỏng vấn', 'interviewer_name'],
  ['room_id', 'Phòng', 'room_name'],
];

function ScheduleTime({ value }) {
  const formatted = displayTime(value);
  const [clock, date] = formatted.split(' ');
  if (!date || formatted === 'Không rõ thời gian') return <span className="is-muted">{formatted}</span>;
  return <time dateTime={value} aria-label={`${formatted}, giờ Việt Nam`}>
    <span className="is-time-clock">{clock}</span>{' '}
    <span className="is-time-date">{date}</span>
  </time>;
}

function ScheduleContent({ canManage }) {
  const [rows, setRows] = useState([]);
  const [known, setKnown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [denied, setDenied] = useState(false);
  const [filters, setFilters] = useState({ status: '', candidate_id: '', interviewer_id: '', room_id: '', date: '' });
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const writeController = useRef(null);
  const writing = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    writeController.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRows([]);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.candidate_id) params.candidate_id = filters.candidate_id;
    if (filters.interviewer_id) params.interviewer_id = filters.interviewer_id;
    if (filters.room_id) params.room_id = filters.room_id;
    if (filters.date) {
      params.from = `${filters.date}T00:00:00+07:00`;
      params.to = `${filters.date}T23:59:59+07:00`;
    }
    interviewScheduleApi.getAll(params, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(response.data.data)) throw new Error('Invalid schedule data');
      setRows(response.data.data);
      setDenied(false);
      // Filter choices come only from schedules this user was allowed to read.
      setKnown(current => [...new Map([...current, ...response.data.data].map(row => [row.id, row])).values()]);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setError(interviewError(err, 'Không thể tải lịch phỏng vấn. Vui lòng thử lại.'));
      if (err.response?.status === 403) { setDenied(true); setKnown([]); setForm(null); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, revision]);

  async function cancel(row) {
    if (!canManage || denied || writing.current || row.status !== 'SCHEDULED') return;
    if (!window.confirm(`Hủy lịch phỏng vấn của ${row.candidate_name}?`)) return;
    writing.current = true;
    setCancelling(row.id);
    setError('');
    setNotice('');
    const signal = writeController.current.signal;
    try {
      await interviewScheduleApi.cancel(row.id, signal);
      if (signal.aborted) return;
      setRows(current => current.map(item => item.id === row.id ? { ...item, status: 'CANCELLED' } : item)
        .filter(item => !filters.status || item.status === filters.status));
      setNotice('Đã hủy lịch phỏng vấn.');
    } catch (err) {
      if (!signal.aborted) {
        setError(interviewError(err, 'Không thể hủy lịch. Vui lòng thử lại.'));
        if (err.response?.status === 403) { setDenied(true); setRows([]); setKnown([]); }
      }
    } finally {
      writing.current = false;
      if (!signal.aborted) setCancelling(null);
    }
  }

  function saved(row, message) {
    setForm(null);
    setNotice(message);
    setRevision(value => value + 1);
  }

  return <div className="interview-schedules">
    <header className="is-card is-header"><div><h1 className="g-page-title">Lịch phỏng vấn</h1><p className="g-page-subtitle">Theo dõi thời gian, người phỏng vấn và phòng phỏng vấn</p></div>
      {canManage && !denied && <button type="button" className="is-button is-create" disabled={cancelling !== null || loading} onClick={() => { setNotice(''); setForm({ id: null }); }}>+ Tạo lịch phỏng vấn</button>}
    </header>
    <section className="is-card" aria-label="Bộ lọc lịch phỏng vấn">
      <div className="is-filters">
        <label htmlFor="is-filter-status">Trạng thái<select id="is-filter-status" value={filters.status} disabled={loading || cancelling !== null} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}>
          <option value="">Tất cả trạng thái</option><option value="SCHEDULED">Đã lên lịch</option><option value="CANCELLED">Đã hủy</option>
        </select></label>
        <label htmlFor="is-filter-date">Ngày phỏng vấn<input type="date" id="is-filter-date" value={filters.date} disabled={loading || cancelling !== null} onChange={event => setFilters(current => ({ ...current, date: event.target.value }))} /></label>
        {filterFields.map(([field, label, name]) => {
          const choices = [...new Map(known.map(row => [String(row[field]), row[name]])).entries()];
          return <label key={field} htmlFor={`is-filter-${field}`}>{label}<select id={`is-filter-${field}`} value={filters[field]} disabled={loading || cancelling !== null || denied} onChange={event => setFilters(current => ({ ...current, [field]: event.target.value }))}>
            <option value="">Tất cả</option>{choices.map(([id, text]) => <option value={id} key={id}>{text || 'Chưa có tên'}</option>)}
          </select></label>;
        })}
        <button type="button" className="is-button is-secondary" disabled={loading || cancelling !== null} onClick={() => setFilters({ status: '', candidate_id: '', interviewer_id: '', room_id: '', date: '' })}>Xóa bộ lọc</button>
      </div>
    </section>
    {notice && <p className="is-success" role="status">{notice}</p>}
    {error && <div className="is-error" role="alert">{error} <button type="button" className="is-button is-secondary" disabled={loading || cancelling !== null} onClick={() => setRevision(value => value + 1)}>Tải lại lịch</button></div>}
    <section className="is-card" aria-label="Danh sách lịch phỏng vấn" aria-busy={loading}>
      {loading ? <p role="status">Đang tải lịch phỏng vấn...</p> : (filters.date ? rows.filter(r => toLocalInput(r.start_at).startsWith(filters.date)) : rows).length === 0 ? !error && <p className="is-muted">Chưa có lịch phỏng vấn phù hợp.</p> : <>
        <p className="is-muted">Giờ Việt Nam · Asia/Ho_Chi_Minh (UTC+07:00) · Định dạng 24 giờ.</p>
        <p className="is-scroll-hint" id="is-table-hint">Cuộn ngang để xem đầy đủ lịch và thao tác.</p>
        <div className="is-table-scroll" tabIndex={0} role="region" aria-label="Bảng lịch phỏng vấn" aria-describedby="is-table-hint">
          <table className="is-schedule-table">
            <colgroup>{['candidate', 'position', 'interviewer', 'room', 'start', 'end', 'status', 'actions'].map(column => <col key={column} className={`is-col-${column}`} />)}</colgroup>
            <thead><tr>{['Ứng viên', 'Vị trí', 'Người phỏng vấn', 'Phòng', 'Bắt đầu', 'Kết thúc', 'Trạng thái', 'Thao tác'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{(filters.date ? rows.filter(r => toLocalInput(r.start_at).startsWith(filters.date)) : rows).map(row => <tr key={row.id} data-schedule-id={row.id}>
              <td><span className="is-cell-text" title={row.candidate_name}>{row.candidate_name}</span></td>
              <td><span className="is-cell-text" title={row.position_name}>{row.position_name}</span></td>
              <td><span className="is-cell-text" title={row.interviewer_name}>{row.interviewer_name}</span></td>
              <td><span className="is-cell-text" title={row.room_name}>{row.room_name}</span>{Number(row.room_is_active) === 0 && <small className="is-muted"> (ngừng sử dụng)</small>}</td>
              <td><ScheduleTime value={row.start_at} /></td><td><ScheduleTime value={row.end_at} /></td>
              <td><span className={`is-badge ${row.status === 'CANCELLED' ? 'is-cancelled' : ''}`}>{row.status === 'SCHEDULED' ? 'Đã lên lịch' : row.status === 'CANCELLED' ? 'Đã hủy' : row.status}</span></td>
              <td>{canManage && !denied && row.status === 'SCHEDULED' ? <div className="is-row-actions">
                <button type="button" className="is-button is-secondary is-edit" disabled={cancelling !== null} onClick={() => { setNotice(''); setForm({ id: row.id }); }}>Sửa lịch</button>
                <button type="button" className="is-button is-danger is-cancel" disabled={cancelling !== null} onClick={() => cancel(row)}>{cancelling === row.id ? 'Đang hủy...' : 'Hủy lịch'}</button>
              </div> : <span className="is-muted">—</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </section>
    {form && canManage && !denied && <InterviewScheduleForm key={form.id ?? 'new'} scheduleId={form.id} onClose={() => setForm(null)} onSaved={saved} />}
  </div>;
}

export default function InterviewScheduleList() {
  const { user } = useContext(AuthContext);
  const { canView, canManage } = interviewAccess(user);
  if (!canView) return <div className="interview-schedules"><div className="is-card is-error" role="alert">Bạn không có quyền truy cập lịch phỏng vấn nội bộ.</div></div>;
  const identity = `${user.user_id}:${user.roles.map(role => role.role_code).sort().join(',')}`;
  return <ScheduleContent key={identity} canManage={canManage} />;
}
