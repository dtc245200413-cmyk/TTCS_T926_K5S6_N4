import React, { useEffect, useRef, useState } from 'react';
import interviewScheduleApi from '../../api/interviewScheduleApi';
import { displayTime, INTERVIEW_DURATIONS, interviewError, resolveScheduleTime, scheduleTimeFields, toLocalInput } from '../../utils/interviewSchedules';

const emptyForm = { candidate_id: '', position_id: '', interviewer_id: '', room_id: '', ...scheduleTimeFields() };
const fields = [
  ['candidate_id', 'Ứng viên', 'candidates', 'id', 'full_name'],
  ['position_id', 'Vị trí tuyển dụng', 'job_positions', 'position_id', 'position_name'],
  ['interviewer_id', 'Người phỏng vấn', 'interviewers', 'user_id', 'full_name'],
  ['room_id', 'Phòng phỏng vấn', 'rooms', 'id', 'name'],
];

// Native time inputs can show AM/PM depending on OS locale. Explicit numeric
// selectors keep the same 24-hour clock for keyboard, touch and desktop users.
function TimePicker({ name, label, value, precise, disabled, onChange }) {
  const parts = value ? value.split(':') : ['', '00', '00'];
  const units = precise ? ['Giờ', 'Phút', 'Giây'] : ['Giờ', 'Phút'];
  return <fieldset className="is-time-picker" disabled={disabled}>
    <legend>{label} *</legend>
    <div className="is-clock-fields">
      {units.map((unit, index) => <React.Fragment key={unit}>
        {index > 0 && <span aria-hidden="true">:</span>}
        <select id={`is-${name}-${index}`} aria-label={`${unit} ${label.toLowerCase()}`} value={parts[index] ?? '00'} required
          onChange={event => { const next = [...parts]; next[index] = event.target.value; onChange({ target: { name, value: next.join(':') } }); }}>
          {index === 0 && <option value="">HH</option>}
          {Array.from({ length: index === 0 ? 24 : 60 }, (_, number) => String(number).padStart(2, '0')).map(number => <option key={number} value={number}>{number}</option>)}
        </select>
      </React.Fragment>)}
    </div>
  </fieldset>;
}

export default function InterviewScheduleForm({ scheduleId, onClose, onSaved }) {
  const editing = scheduleId != null;
  const [form, setForm] = useState(emptyForm);
  const [options, setOptions] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef(null);
  const writing = useRef(false);
  const dialogRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setDenied(false);
    setError('');
    Promise.all([
      interviewScheduleApi.getOptions(controller.signal),
      editing ? interviewScheduleApi.getById(scheduleId, controller.signal) : Promise.resolve(null),
    ]).then(([choices, detail]) => {
      if (controller.signal.aborted) return;
      const data = choices.data.data;
      if (!fields.every(([, , group]) => Array.isArray(data?.[group]))) throw new Error('Invalid options');
      const schedule = detail?.data.data;
      if (editing && (!schedule || schedule.status !== 'SCHEDULED')) {
        setDenied(true);
        setError('Lịch đã hủy hoặc không còn khả dụng để chỉnh sửa.');
        return;
      }
      setOptions(data);
      setExisting(schedule || null);
      setForm(schedule ? {
        candidate_id: String(schedule.candidate_id), position_id: String(schedule.position_id),
        interviewer_id: String(schedule.interviewer_id), room_id: String(schedule.room_id),
        ...scheduleTimeFields(schedule),
      } : emptyForm);
    }).catch(err => {
      if (!controller.signal.aborted) { setOptions(null); setError(interviewError(err, 'Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.')); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scheduleId, editing, attempt]);

  function change(event) {
    const { name, value } = event.target;
    setForm(current => {
      if (name === 'duration' && value === 'custom') {
        const end = resolveScheduleTime(current).end;
        const [end_date, end_time] = end ? toLocalInput(end).split('T') : [current.interview_date, current.start_time];
        return { ...current, duration: value, end_date, end_time };
      }
      return { ...current, [name]: value };
    });
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    if (writing.current || loading || !options || denied) return;
    for (const [field, label, group, key] of fields) {
      if (!form[field]) { setError(`Vui lòng chọn ${label.toLowerCase()}.`); return; }
      if (!(editing && field === 'candidate_id') && !options[group].some(item => String(item[key]) === form[field])) {
        setError(`${label} không còn khả dụng. Vui lòng chọn lại.`); return;
      }
    }
    const { start, end, error: timeError } = resolveScheduleTime(form);
    if (timeError) { setError(timeError); return; }
    const data = { position_id: Number(form.position_id), interviewer_id: Number(form.interviewer_id),
      room_id: Number(form.room_id), start_at: start, end_at: end };
    if (!editing) data.candidate_id = Number(form.candidate_id);
    writing.current = true;
    setSaving(true);
    setError('');
    const signal = controllerRef.current.signal;
    try {
      const response = editing ? await interviewScheduleApi.update(scheduleId, data, signal) : await interviewScheduleApi.create(data, signal);
      if (!signal.aborted) onSaved(response.data.data, editing ? 'Đã cập nhật lịch phỏng vấn.' : 'Đã tạo lịch phỏng vấn.');
    } catch (err) {
      if (!signal.aborted) {
        setError(interviewError(err, 'Không thể lưu lịch. Vui lòng thử lại.'));
        if (err.response?.status === 403) setDenied(true);
      }
    } finally {
      writing.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  function keyboard(event) {
    if (event.key === 'Escape' && !writing.current) { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]')];
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current || document.activeElement === errorRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  const previewEnd = resolveScheduleTime(form).end;

  return <div className="is-modal-backdrop">
    <div className="is-modal" role="dialog" aria-modal="true" aria-labelledby="is-form-title" aria-busy={loading || saving} tabIndex={-1} ref={dialogRef} onKeyDown={keyboard}>
      <div className="is-header"><h2 id="is-form-title">{editing ? 'Sửa / đổi lịch phỏng vấn' : 'Tạo lịch phỏng vấn'}</h2>
        <button type="button" className="is-button is-secondary" aria-label="Đóng form" disabled={saving} onClick={onClose}>Đóng</button></div>
      <p className="is-muted">Chọn người tham gia, phòng và thời gian phỏng vấn.</p>
      {loading && <p role="status">Đang tải dữ liệu đặt lịch...</p>}
      {error && <div className="is-error" role="alert" tabIndex={-1} ref={errorRef}>{error}
        {!loading && !options && <button type="button" className="is-button is-secondary" onClick={() => setAttempt(value => value + 1)}>Thử tải lại</button>}
      </div>}
      {!loading && options && !denied && <form noValidate onSubmit={submit}>
        <div className="is-form-grid">
          {fields.map(([field, label, group, key, name]) => {
            const missingCurrent = editing && form[field] && !options[group].some(item => String(item[key]) === form[field]);
            const oldNames = { candidate_id: existing?.candidate_name, position_id: existing?.position_name, interviewer_id: existing?.interviewer_name, room_id: existing?.room_name };
            return <label key={field} htmlFor={`is-${field}`}><span>{label} *</span>
              <select id={`is-${field}`} name={field} value={form[field]} onChange={change} required disabled={saving || (editing && field === 'candidate_id')}>
                <option value="">-- Chọn {label.toLowerCase()} --</option>
                {missingCurrent && <option value={form[field]} disabled={field !== 'candidate_id'}>{oldNames[field] || 'Giá trị hiện tại'}{field !== 'candidate_id' ? ' (không còn khả dụng)' : ''}</option>}
                {options[group].map(item => <option key={item[key]} value={item[key]}>{item[name]}{field === 'interviewer_id' && item.employee_code ? ` (${item.employee_code})` : ''}</option>)}
              </select>
            </label>;
          })}
        </div>
        <section className="is-time-section" aria-labelledby="is-time-heading">
          <div className="is-header"><h3 id="is-time-heading">Thời gian phỏng vấn</h3><span className="is-time-zone">Giờ Việt Nam · UTC+07:00</span></div>
          <p className="is-muted" id="is-time-help">Định dạng 24 giờ · Asia/Ho_Chi_Minh. Giờ kết thúc được tính theo thời lượng bạn chọn.</p>
          <div className="is-time-grid" aria-describedby="is-time-help">
            <label htmlFor="is-interview_date"><span>Ngày phỏng vấn *</span><input id="is-interview_date" type="date" name="interview_date" min="1000-01-01" max="9999-12-31" value={form.interview_date} onChange={change} required disabled={saving} /></label>
            <TimePicker name="start_time" label="Giờ bắt đầu" value={form.start_time} precise={form.duration === 'custom' || (form.start_time && !form.start_time.endsWith(':00'))} disabled={saving} onChange={change} />
            <label htmlFor="is-duration"><span>Thời lượng *</span><select id="is-duration" name="duration" value={form.duration} onChange={change} disabled={saving}>
              {INTERVIEW_DURATIONS.map(minutes => <option key={minutes} value={minutes}>{minutes} phút</option>)}
              <option value="custom">Tùy chỉnh</option>
            </select></label>
          </div>
          {form.duration === 'custom' && <div className="is-custom-time">
            <p className="is-muted">Chọn thời điểm kết thúc chính xác đến giây. Lịch có thời lượng khác được giữ nguyên khi mở lại.</p>
            <div className="is-form-grid">
              <label htmlFor="is-end_date"><span>Ngày kết thúc *</span><input id="is-end_date" type="date" name="end_date" min="1000-01-01" max="9999-12-31" value={form.end_date} onChange={change} required disabled={saving} /></label>
              <TimePicker name="end_time" label="Giờ kết thúc" value={form.end_time} precise disabled={saving} onChange={change} />
            </div>
          </div>}
          <div className="is-end-preview" role="status" aria-live="polite" aria-atomic="true">
            <span>Kết thúc dự kiến</span>
            <strong>{previewEnd ? displayTime(previewEnd) : '—'}</strong>
            <small>{previewEnd ? 'Giờ Việt Nam (UTC+07:00)' : 'Chọn ngày, giờ bắt đầu và thời lượng hợp lệ.'}</small>
          </div>
        </section>
        <div className="is-form-actions"><button type="button" className="is-button is-secondary" disabled={saving} onClick={onClose}>Đóng</button>
          <button type="submit" className="is-button" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Tạo lịch'}</button></div>
      </form>}
    </div>
  </div>;
}
