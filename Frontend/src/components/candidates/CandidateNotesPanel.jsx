import React, { useEffect, useRef, useState } from 'react';
import candidateProfileApi from '../../api/candidateProfileApi';
import { profileError } from '../../utils/candidateProfile';

export default function CandidateNotesPanel({ candidateId, canManage }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [readable, setReadable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const requestController = useRef(null);
  const writing = useRef(false);
  const count = Array.from(content).length;
  const tooLong = count > 5000;

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setReadable(false);
    setError('');
    candidateProfileApi.getNotes(candidateId, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(response.data.data)) throw new Error('Invalid note data');
      setNotes(response.data.data);
      setReadable(true);
    }).catch(err => {
      if (!controller.signal.aborted) setError(profileError(err, 'Không thể tải ghi chú. Vui lòng thử lại.'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [candidateId, attempt]);

  async function submit(event) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!canManage || !readable || writing.current || !trimmed || tooLong) return;
    writing.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    const signal = requestController.current.signal;
    try {
      const response = await candidateProfileApi.addNote(candidateId, trimmed, signal);
      if (signal.aborted) return;
      setNotes(current => [response.data.data, ...current]);
      setContent('');
      setNotice('Đã thêm ghi chú.');
    } catch (err) {
      if (signal.aborted) return;
      setError(profileError(err, 'Không thể thêm ghi chú. Nội dung được giữ lại để thử lại.'));
      if ([403, 404].includes(err.response?.status)) { setReadable(false); setNotes([]); }
    } finally {
      writing.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  return <section className="cp-card" aria-labelledby="cp-notes-title" aria-busy={loading || saving}>
    <h2 id="cp-notes-title">Ghi chú nội bộ</h2>
    <p className="cp-muted">Chỉ dành cho nhân sự có quyền truy cập hồ sơ.</p>
    {loading && <p role="status">Đang tải ghi chú...</p>}
    {error && <div className="cp-error" role="alert">{error} <button type="button" className="cp-button cp-secondary" disabled={saving} onClick={() => setAttempt(value => value + 1)}>Tải lại ghi chú</button></div>}
    {notice && <p className="cp-success" role="status">{notice}</p>}
    {!loading && readable && <>
      {canManage && <form onSubmit={submit} className="cp-note-form">
        <label htmlFor="cp-note-content">Nội dung ghi chú</label>
        <textarea id="cp-note-content" rows={5} value={content} disabled={saving} onChange={event => setContent(event.target.value)} aria-describedby="cp-note-count cp-note-limit" aria-invalid={tooLong} />
        <div className="cp-note-actions">
          <span id="cp-note-count" className={tooLong ? 'cp-error-text' : 'cp-muted'} aria-live="polite">{count}/5000 ký tự</span>
          <button className="cp-button" type="submit" disabled={saving || !content.trim() || tooLong}>{saving ? 'Đang lưu...' : 'Thêm ghi chú'}</button>
        </div>
        <p id="cp-note-limit" className={tooLong ? 'cp-error-text' : 'cp-muted'}>{tooLong ? 'Ghi chú không được vượt quá 5000 ký tự.' : 'Tối đa 5000 ký tự. Không để trống nội dung.'}</p>
      </form>}
      {notes.length === 0 ? <p className="cp-muted">Chưa có ghi chú nội bộ.</p> : <ol className="cp-notes">
        {notes.map(note => {
          const date = new Date(note.created_at);
          const validDate = !Number.isNaN(date.getTime());
          return <li key={note.id} className="cp-note">
            <div className="cp-note-meta"><strong>{note.author_name || 'Không rõ người viết'}</strong><time dateTime={validDate ? date.toISOString() : undefined}>{validDate ? date.toLocaleString('vi-VN') : 'Không rõ thời gian'}</time></div>
            <p className="cp-note-text">{note.note_content}</p>
          </li>;
        })}
      </ol>}
    </>}
  </section>;
}
