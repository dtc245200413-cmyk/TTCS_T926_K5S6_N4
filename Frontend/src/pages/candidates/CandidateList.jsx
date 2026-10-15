import React, { useState, useEffect, useContext, useCallback } from 'react';
import { FiDownload, FiSearch, FiUserPlus, FiEye, FiInfo } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateApi from '../../api/candidateApi';
import CandidateFormModal from '../../components/candidates/CandidateFormModal';
import CandidateDetailDrawer from '../../components/candidates/CandidateDetailDrawer';
import CvPreviewModal, { isOnlineUrl } from '../../components/candidates/CvPreviewModal';
import { CandidateStatusBadge, CANDIDATE_STATUS_LABELS } from '../../components/candidates/CandidateStatusBadge';

const ALLOWED_ROLES = ['RECRUITER', 'HR_MANAGER', 'ADMIN'];
const PAGE_SIZE = 10;

const DEFAULT_REJECTION_REASONS = [
  { code: 'LACK_EXPERIENCE', name: 'Thiếu kinh nghiệm / Chuyên môn' },
  { code: 'FAIL_TEST', name: 'Không đạt Bài test / Ngoại ngữ' },
  { code: 'HIGH_SALARY', name: 'Kỳ vọng lương quá cao' },
  { code: 'NOT_FIT_CULTURE', name: 'Không hợp Văn hóa / Thái độ' },
  { code: 'NO_SHOW', name: 'Bỏ lịch phỏng vấn (No-show)' },
  { code: 'WITHDRAW', name: 'Ứng viên tự rút / Nhận việc khác' },
  { code: 'CANNOT_CONTACT', name: 'Không liên lạc được' },
  { code: 'OTHER', name: 'Lý do khác (Tự viết lý do)' },
];

const CandidateList = () => {
  const { user } = useContext(AuthContext);
  const canAccess = Boolean(user?.roles?.some(r => ALLOWED_ROLES.includes(r.role_code)));

  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState({ search: '', source: '', status: '' });

  const [rejectionReasons, setRejectionReasons] = useState(DEFAULT_REJECTION_REASONS);
  const [candidateSources, setCandidateSources] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectMode, setRejectMode] = useState('SELECT'); // 'SELECT' | 'WRITE'
  const [rejectReasonCode, setRejectReasonCode] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [activeMerges, setActiveMerges] = useState([]);
  const [mergeError, setMergeError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [previewCandidate, setPreviewCandidate] = useState(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.source) params.source = appliedFilters.source;
      if (appliedFilters.status) params.status = appliedFilters.status;
      const res = await candidateApi.getAll(params);
      setCandidates(res.data.data.items);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.status === 403
        ? 'Bạn không có quyền xem danh sách ứng viên (403 Forbidden).'
        : err.response?.data?.message || 'Không tải được danh sách ứng viên.');
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  const fetchMasterData = async () => {
    try {
      const res = await candidateApi.getMasterData();
      const md = res.data.data || [];
      const reasons = md.filter(x => x.category_group === 'REJECTION_REASON' && (x.is_active === undefined || x.is_active));
      setRejectionReasons(reasons.length > 0 ? reasons : DEFAULT_REJECTION_REASONS);
      setCandidateSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE'));
    } catch (err) {
      console.error(err);
      setRejectionReasons(DEFAULT_REJECTION_REASONS);
    }
  };

  const fetchActiveMerges = async () => {
    try {
      const res = await candidateApi.getMerges();
      setActiveMerges(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidate merges', err);
    }
  };

  useEffect(() => {
    if (!canAccess) { setLoading(false); return; }
    fetchMasterData();
    fetchActiveMerges();
  }, [canAccess]);

  useEffect(() => {
    if (canAccess) fetchCandidates();
  }, [canAccess, fetchCandidates]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({ search: search.trim(), source: sourceFilter, status: statusFilter });
  };

  const handleReset = () => {
    setSearch('');
    setSourceFilter('');
    setStatusFilter('');
    setPage(1);
    setAppliedFilters({ search: '', source: '', status: '' });
  };

  const undoCandidateMerge = async (merge) => {
    if (!window.confirm(`Hoàn tác gộp ${merge.secondary_name} khỏi hồ sơ ${merge.primary_name}?`)) return;
    setMergeError('');
    try {
      await candidateApi.undoMerge(merge.id);
      await Promise.all([fetchCandidates(), fetchActiveMerges()]);
    } catch (err) {
      setMergeError(err.response?.data?.message || 'Không thể hoàn tác gộp hồ sơ.');
    }
  };

  const handleViewCv = (candidate) => {
    if (!candidate?.resume_url) return;
    setPreviewCandidate(candidate);
  };

  const handleOpenReject = (candidate) => {
    setSelectedCandidate(candidate);
    setShowRejectModal(true);
    setRejectMode('SELECT');
    setRejectReasonCode('');
    setCustomRejectReason('');
    setRejectError('');
  };

  const submitReject = async () => {
    let code = null;
    let reasonText = '';

    if (rejectMode === 'SELECT') {
      if (!rejectReasonCode) {
        setRejectError('Vui lòng chọn lý do từ danh mục hoặc chuyển sang tự viết lý do.');
        return;
      }
      code = rejectReasonCode;
      const matched = rejectionReasons.find(r => r.code === rejectReasonCode);
      const matchedName = matched?.name || rejectReasonCode;

      if (rejectReasonCode === 'OTHER') {
        if (!customRejectReason.trim()) {
          setRejectError('Vui lòng nhập lý do cụ thể khi chọn "Lý do khác".');
          return;
        }
        reasonText = customRejectReason.trim();
      } else {
        reasonText = customRejectReason.trim()
          ? `${matchedName}: ${customRejectReason.trim()}`
          : matchedName;
      }
    } else {
      // WRITE mode
      if (!customRejectReason.trim()) {
        setRejectError('Vui lòng viết lý do đánh trượt ứng viên.');
        return;
      }
      code = 'OTHER';
      reasonText = customRejectReason.trim();
    }

    setSubmittingReject(true);
    setRejectError('');
    try {
      await candidateApi.updateStatus(selectedCandidate.id, {
        status: 'REJECTED',
        rejection_reason_code: code,
        rejection_reason: reasonText
      });
      setShowRejectModal(false);
      fetchCandidates();
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleHire = async (candidate) => {
    if (window.confirm(`Bạn có chắc chắn muốn tuyển dụng ứng viên ${candidate.full_name}?`)) {
      try {
        await candidateApi.updateStatus(candidate.id, { status: 'HIRED' });
        fetchCandidates();
      } catch (err) {
        setError('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    setNotice('Đã thêm hồ sơ ứng viên thành công.');
    setPage(1);
    fetchCandidates();
    fetchActiveMerges();
  };

  if (!canAccess) {
    return (
      <div className="g-card" style={{ textAlign: 'center', padding: 48 }}>
        <h1 className="g-page-title">403 - Không có quyền truy cập</h1>
        <p className="g-page-subtitle">Chỉ Nhân viên tuyển dụng, Trưởng phòng Nhân sự hoặc Quản trị viên mới xem được hồ sơ ứng viên.</p>
      </div>
    );
  }

  const isHrManager = user?.roles?.some(r => r.role_code === 'HR_MANAGER');

  return (
    <div>
      <div className="g-page-header">
        <div>
          <h1 className="g-page-title">Quản lý Hồ sơ Ứng viên</h1>
          <p className="g-page-subtitle">Theo dõi và quản lý ứng viên trên toàn hệ thống</p>
        </div>
        <button type="button" className="g-btn-primary" onClick={() => setShowCreate(true)}>
          <FiUserPlus style={{ fontSize: '1.2rem' }} /> Thêm Ứng viên
        </button>
      </div>

      {notice && (
        <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#166534', borderRadius: 8, marginBottom: 16, border: '1px solid #bbf7d0' }}>{notice}</div>
      )}

      {activeMerges.length > 0 && (
        <div className="g-card" style={{ padding: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#334155' }}>Hồ sơ đã gộp gần đây</h2>
          {mergeError && <div role="alert" style={{ marginBottom: 10, color: '#b91c1c' }}>{mergeError}</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            {activeMerges.map(merge => {
              const canUndo = Number(merge.hours_since_merge) < 24;
              return (
                <div key={merge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                  <span>{merge.secondary_name} đã gộp vào {merge.primary_name} · {canUndo ? 'còn trong 24 giờ' : 'đã quá 24 giờ'}</span>
                  {canUndo && <button type="button" className="g-btn-secondary" onClick={() => undoCandidateMerge(merge)}>Hoàn tác</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="g-card" style={{ padding: '16px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="g-form-input" style={{ paddingLeft: '48px' }}
            />
          </div>
          <div style={{ flex: '0 0 190px' }}>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="g-form-input">
              <option value="">Tất cả nguồn</option>
              {candidateSources.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 190px' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="g-form-input">
              <option value="">Tất cả trạng thái</option>
              {['NEW', 'INTERVIEWING', 'OFFERED', 'HIRED', 'REJECTED'].map(s => (
                <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="g-btn-primary">Tìm kiếm</button>
            <button type="button" className="g-btn-secondary" onClick={handleReset}>Làm mới</button>
          </div>
        </form>
      </div>

      <div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Đang tải danh sách...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ Tên</th>
                  <th>Email</th>
                  <th>Vị trí ứng tuyển</th>
                  <th>Nguồn</th>
                  <th>CV</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                      <FiInfo style={{ fontSize: '3rem', marginBottom: '10px', color: '#cbd5e1' }} />
                      <div>Không tìm thấy hồ sơ ứng viên phù hợp.</div>
                    </td>
                  </tr>
                ) : candidates.map(cand => (
                  <tr key={cand.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{cand.full_name}</td>
                    <td style={{ color: '#475569' }}>
                      <div>{cand.email}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{cand.phone || ''}</div>
                    </td>
                    <td style={{ color: '#475569' }}>{cand.position_name ? `${cand.position_name} - ${cand.department_name}` : 'N/A'}</td>
                    <td style={{ color: '#4f46e5', fontWeight: 600 }}>{cand.source_name || cand.source_code || '-'}</td>
                    <td>
                      {cand.resume_url ? (
                        <button
                          type="button"
                          onClick={() => handleViewCv(cand)}
                          className="btn-action-view"
                          style={{ gap: 6 }}
                          title="Xem nội dung CV"
                        >
                          <FiEye /> Xem CV
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có CV</span>
                      )}
                    </td>
                    <td>
                      <CandidateStatusBadge status={cand.status} />
                      {cand.sla_overdue === 1 && <span className="badge badge-error" style={{ marginLeft: 6 }}>Quá SLA</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-action-view" onClick={() => setDetailId(cand.id)}><FiEye /> Xem</button>
                        {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                          <>
                            {isHrManager && <button type="button" className="btn-action-edit" onClick={() => handleHire(cand)}>Tuyển dụng</button>}
                            <button type="button" className="btn-action-delete" onClick={() => handleOpenReject(cand)}>Đánh trượt</button>
                          </>
                        )}
                        {cand.status === 'REJECTED' && (cand.rejection_reason || cand.rejection_reason_code) && (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontStyle: 'italic', marginTop: 4, maxWidth: 220, wordBreak: 'break-word', lineHeight: 1.3 }}>
                            <strong>Lý do:</strong> {cand.rejection_reason || rejectionReasons.find(r => r.code === cand.rejection_reason_code)?.name || cand.rejection_reason_code}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', color: '#475569', fontSize: '0.9rem' }}>
              <span>Tổng {pagination.total} hồ sơ · Trang {pagination.page}/{pagination.totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="g-btn-secondary" disabled={pagination.page <= 1} onClick={() => setPage(p => Math.max(p - 1, 1))}>Trước</button>
                <button type="button" className="g-btn-secondary" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: 520, width: '100%' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#1e293b' }}>Đánh trượt Ứng viên</h3>
            <p className="g-page-subtitle" style={{ marginBottom: 16 }}>
              Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Bạn có thể chọn lý do có sẵn hoặc tự viết lý do cụ thể.
            </p>

            {/* Chế độ: Chọn lý do có sẵn hoặc Tự viết lý do */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              borderRadius: 8,
              padding: 4,
              marginBottom: 16,
              gap: 4
            }}>
              <button
                type="button"
                onClick={() => { setRejectMode('SELECT'); setRejectError(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: rejectMode === 'SELECT' ? '#ffffff' : 'transparent',
                  color: rejectMode === 'SELECT' ? '#2563eb' : '#64748b',
                  boxShadow: rejectMode === 'SELECT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                📋 Chọn lý do có sẵn
              </button>
              <button
                type="button"
                onClick={() => { setRejectMode('WRITE'); setRejectError(''); }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: rejectMode === 'WRITE' ? '#ffffff' : 'transparent',
                  color: rejectMode === 'WRITE' ? '#2563eb' : '#64748b',
                  boxShadow: rejectMode === 'WRITE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                ✍️ Tự viết lý do
              </button>
            </div>

            {rejectMode === 'SELECT' ? (
              <div>
                <label className="g-form-label" style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Danh mục lý do <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={rejectReasonCode}
                  onChange={(e) => {
                    setRejectReasonCode(e.target.value);
                    setRejectError('');
                  }}
                  className="g-form-input"
                  style={{ width: '100%', marginBottom: 12 }}
                >
                  <option value="">-- Chọn lý do --</option>
                  {rejectionReasons.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>

                {(rejectReasonCode === 'OTHER' || rejectReasonCode) && (
                  <div style={{ marginTop: 8 }}>
                    <label className="g-form-label" style={{ fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>
                      {rejectReasonCode === 'OTHER' ? (
                        <>Nội dung lý do cụ thể <span style={{ color: '#ef4444' }}>*</span></>
                      ) : (
                        'Ghi chú / Chi tiết thêm (không bắt buộc)'
                      )}
                    </label>
                    <textarea
                      rows={3}
                      className="g-form-input"
                      placeholder={rejectReasonCode === 'OTHER' ? 'Nhập chi tiết lý do đánh trượt...' : 'Nhập chi tiết bổ sung nếu cần...'}
                      value={customRejectReason}
                      onChange={(e) => { setCustomRejectReason(e.target.value); setRejectError(''); }}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="g-form-label" style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Nội dung lý do đánh trượt <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  className="g-form-input"
                  placeholder="Nhập lý do đánh trượt cụ thể (Ví dụ: Không đáp ứng yêu cầu kinh nghiệm thực tế, tiếng Anh chưa đạt mức yêu cầu...)"
                  value={customRejectReason}
                  onChange={(e) => { setCustomRejectReason(e.target.value); setRejectError(''); }}
                  style={{ width: '100%', resize: 'vertical', marginBottom: 10 }}
                />

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>Gợi ý nhanh (bấm để chèn):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      'Thiếu kinh nghiệm chuyên môn',
                      'Không đạt bài test kỹ thuật',
                      'Mức lương kỳ vọng quá cao',
                      'Không phù hợp văn hóa công ty',
                      'Bỏ hẹn phỏng vấn (No-show)',
                      'Không liên lạc được',
                      'Chủ động xin rút hồ sơ'
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setCustomRejectReason(prev => prev ? `${prev}. ${tag}` : tag);
                          setRejectError('');
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 14,
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          color: '#334155',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                        onMouseLeave={(e) => e.target.style.background = '#f1f5f9'}
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {rejectError && (
              <div role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8, background: '#fef2f2', padding: '6px 10px', borderRadius: 6, border: '1px solid #fecaca' }}>
                {rejectError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                className="g-btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={submittingReject}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={submitReject}
                disabled={submittingReject}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {submittingReject ? 'Đang xử lý...' : 'Xác nhận Trượt'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CandidateFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={handleCreated} />

      {detailId && (
        <CandidateDetailDrawer candidateId={detailId} canEdit={canAccess} onClose={() => setDetailId(null)} />
      )}

      {previewCandidate && (
        <CvPreviewModal
          open={Boolean(previewCandidate)}
          onClose={() => setPreviewCandidate(null)}
          candidate={previewCandidate}
        />
      )}
    </div>
  );
};

export default CandidateList;
