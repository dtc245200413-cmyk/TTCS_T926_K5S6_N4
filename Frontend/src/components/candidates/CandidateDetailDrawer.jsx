import React, { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiEdit2, FiX, FiEye, FiFileText } from 'react-icons/fi';
import candidateApi from '../../api/candidateApi';
import { CandidateStatusBadge, formatDateTime } from './CandidateStatusBadge';
import CvPreviewModal, { downloadCandidateCv, getFileName, isOnlineUrl, isPdfFile } from './CvPreviewModal';

const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 };
const valueStyle = { color: '#1e293b', fontWeight: 600, wordBreak: 'break-word' };
const sectionTitle = { margin: '0 0 12px', fontSize: '1rem', color: '#334155', fontWeight: 700 };

/** Drawer chi tiết ứng viên: thông tin cá nhân, CV, lịch sử ứng tuyển, ghi chú Recruiter. */
const CandidateDetailDrawer = ({ candidateId, canEdit, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await candidateApi.getById(candidateId);
      setDetail(res.data.data);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'Bạn không có quyền xem hồ sơ ứng viên này (403 Forbidden).'
        : err.response?.data?.message || 'Không tải được chi tiết ứng viên.');
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  const handleDownloadResume = async () => {
    if (!detail?.resume_url && !detail?.has_resume) return;
    setDownloading(true);
    try {
      await downloadCandidateCv(candidateId, detail.full_name, detail.resume_url);
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải CV của ứng viên.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreviewResume = () => {
    if (!detail?.resume_url) return;
    setPreviewOpen(true);
  };

  const refreshNotes = async () => {
    const res = await candidateApi.getNotes(candidateId);
    setDetail(prev => ({ ...prev, notes: res.data.data }));
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) { setNoteError('Vui lòng nhập nội dung ghi chú.'); return; }
    setSavingNote(true);
    setNoteError('');
    try {
      await candidateApi.addNote(candidateId, newNote.trim());
      setNewNote('');
      await refreshNotes();
    } catch (err) {
      setNoteError(err.response?.data?.errors?.content || err.response?.data?.message || 'Không thể thêm ghi chú.');
    } finally {
      setSavingNote(false);
    }
  };

  const saveEdit = async (noteId) => {
    if (!editingText.trim()) { setNoteError('Nội dung ghi chú không được để trống.'); return; }
    setSavingNote(true);
    setNoteError('');
    try {
      await candidateApi.updateNote(candidateId, noteId, editingText.trim());
      setEditingId(null);
      await refreshNotes();
    } catch (err) {
      setNoteError(err.response?.data?.errors?.content || err.response?.data?.message || 'Không thể cập nhật ghi chú.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 1000, justifyContent: 'flex-end', alignItems: 'stretch' }} onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 560, height: '100%', overflowY: 'auto', padding: 24, boxShadow: '-10px 0 25px rgba(0,0,0,0.15)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="g-page-title" style={{ margin: 0 }}>Hồ sơ ứng viên</h2>
          <button type="button" className="g-btn-secondary" onClick={onClose} aria-label="Đóng"><FiX /></button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Đang tải dữ liệu...</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {detail && !loading && (
          <>
            <section className="g-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={sectionTitle}>Thông tin cá nhân</h3>
                <CandidateStatusBadge status={detail.status} />
              </div>
              {detail.status === 'REJECTED' && (detail.rejection_reason || detail.rejection_reason_code) && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: 16,
                  color: '#991b1b',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Hồ sơ đã bị đánh trượt</div>
                  <div><strong>Lý do:</strong> {detail.rejection_reason || detail.rejection_reason_code}</div>
                </div>
              )}
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><div style={labelStyle}>Họ tên</div><div style={valueStyle}>{detail.full_name}</div></div>
                <div><div style={labelStyle}>Email</div><div style={valueStyle}>{detail.email}</div></div>
                <div><div style={labelStyle}>Số điện thoại</div><div style={valueStyle}>{detail.phone || '-'}</div></div>
                <div><div style={labelStyle}>Nguồn</div><div style={valueStyle}>{detail.source_name || detail.source_code || '-'}</div></div>
                <div><div style={labelStyle}>Vị trí ứng tuyển</div><div style={valueStyle}>{detail.position_name ? `${detail.position_name} - ${detail.department_name || ''}` : 'N/A'}</div></div>
                <div><div style={labelStyle}>Ngày tạo hồ sơ</div><div style={valueStyle}>{formatDateTime(detail.created_at)}</div></div>
                <div><div style={labelStyle}>Người nhập</div><div style={valueStyle}>{detail.created_by_name || 'Ứng viên tự ứng tuyển'}</div></div>
                <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                  <div style={labelStyle}>CV đính kèm</div>
                  {detail.has_resume && detail.resume_url ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                        padding: '12px 14px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        marginTop: 4
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 200px' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            flexShrink: 0
                          }}
                        >
                          <FiFileText />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: '#0f172a',
                              fontSize: '0.875rem',
                              wordBreak: 'break-all',
                              lineHeight: 1.3
                            }}
                            title={detail.resume_url}
                          >
                            {getFileName(detail.resume_url, `CV-${detail.full_name}.pdf`)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {isOnlineUrl(detail.resume_url)
                              ? 'Liên kết trực tuyến / Google Drive'
                              : (isPdfFile(detail.resume_url) ? 'Tài liệu PDF' : 'Tài liệu Word / Tệp đính kèm')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-action-view"
                          onClick={handlePreviewResume}
                          style={{ gap: 6, padding: '7px 12px' }}
                          title="Xem trước CV"
                        >
                          <FiEye /> Xem trước CV
                        </button>
                        <button
                          type="button"
                          className="btn-action-view"
                          onClick={handleDownloadResume}
                          disabled={downloading}
                          style={{
                            gap: 6,
                            padding: '7px 12px',
                            color: '#059669',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0'
                          }}
                          title="Tải CV về máy tính"
                        >
                          <FiDownload /> {downloading ? 'Đang tải...' : 'Tải CV về máy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ ...valueStyle, color: '#94a3b8', fontStyle: 'italic', fontWeight: 500, marginTop: 4 }}>
                      Chưa có CV đính kèm
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="g-card" style={{ padding: 16 }}>
              <h3 style={sectionTitle}>Lịch sử ứng tuyển</h3>
              {detail.applications.length === 0 ? (
                <div style={{ color: '#64748b' }}>
                  Chưa có đơn ứng tuyển qua cổng thông tin. Hồ sơ được thêm lúc {formatDateTime(detail.created_at)}
                  {detail.created_by_name ? ` bởi ${detail.created_by_name}` : ''}; giai đoạn hiện tại: <CandidateStatusBadge status={detail.status} />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {detail.applications.map(a => (
                    <div key={a.application_id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ color: '#1e293b' }}>{a.job_title || a.position_name || 'Vị trí không xác định'}</strong>
                        <CandidateStatusBadge status={a.status} />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                        {a.department_name || '-'} · Nộp: {formatDateTime(a.applied_at)} · Cập nhật: {formatDateTime(a.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 10 }}>
                Giai đoạn hiện tại: <CandidateStatusBadge status={detail.status} /> · Từ {formatDateTime(detail.stage_changed_at)}
              </div>
            </section>

            <section className="g-card" style={{ padding: 16 }}>
              <h3 style={sectionTitle}>Ghi chú của Recruiter ({detail.notes.length})</h3>
              {canEdit && (
                <form onSubmit={addNote} style={{ marginBottom: 16 }}>
                  <textarea
                    className="g-form-input"
                    rows={3}
                    maxLength={2000}
                    placeholder="Nhập ghi chú về ứng viên..."
                    value={newNote}
                    onChange={(e) => { setNewNote(e.target.value); setNoteError(''); }}
                    style={noteError && editingId === null ? { borderColor: '#ef4444' } : undefined}
                  />
                  {noteError && editingId === null && <div role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 4 }}>{noteError}</div>}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="submit" className="g-btn-primary" disabled={savingNote}>{savingNote && editingId === null ? 'Đang lưu...' : 'Thêm ghi chú'}</button>
                  </div>
                </form>
              )}
              {detail.notes.length === 0 ? (
                <div style={{ color: '#64748b' }}>Chưa có ghi chú nào.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {detail.notes.map(n => (
                    <div key={n.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>
                        <strong style={{ color: '#4f46e5' }}>{n.created_by_name || `User #${n.created_by}`}</strong>
                        <span>
                          {formatDateTime(n.created_at)}
                          {n.updated_at && new Date(n.updated_at) - new Date(n.created_at) > 1000 && ` · Sửa: ${formatDateTime(n.updated_at)}${n.updated_by_name ? ` bởi ${n.updated_by_name}` : ''}`}
                        </span>
                      </div>
                      {editingId === n.id ? (
                        <>
                          <textarea className="g-form-input" rows={3} maxLength={2000} value={editingText} onChange={(e) => { setEditingText(e.target.value); setNoteError(''); }} />
                          {noteError && <div role="alert" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 4 }}>{noteError}</div>}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button type="button" className="g-btn-secondary" onClick={() => { setEditingId(null); setNoteError(''); }}>Hủy</button>
                            <button type="button" className="g-btn-primary" disabled={savingNote} onClick={() => saveEdit(n.id)}>Lưu</button>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b' }}>{n.content}</div>
                          {canEdit && (
                            <button type="button" className="btn-action-edit" onClick={() => { setEditingId(n.id); setEditingText(n.content); setNoteError(''); }}>
                              <FiEdit2 /> Sửa
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </aside>
    </div>

    {previewOpen && detail && (
      <CvPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        candidate={{ id: candidateId, full_name: detail.full_name, resume_url: detail.resume_url }}
      />
    )}
  </>
  );
};

export default CandidateDetailDrawer;
