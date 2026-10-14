import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiDownload, FiEye, FiX, FiFileText, FiUser } from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import { getCandidateCvData } from '../../utils/candidateCvHelper';

const CandidateList = () => {
  const { user } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [candidateSources, setCandidateSources] = useState([]);
  const [activeMerges, setActiveMerges] = useState([]);
  const [mergeError, setMergeError] = useState('');
  const [showCvModal, setShowCvModal] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [cvData, setCvData] = useState(null);

  const fetchCandidates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/candidates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(response.data.data);
    } catch (err) {
      console.error('Failed to fetch candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/master-data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const md = response.data.data;
      setRejectionReasons(md.filter(x => x.category_group === 'REJECTION_REASON'));
      setCandidateSources(md.filter(x => x.category_group === 'CANDIDATE_SOURCE'));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveMerges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/candidates/merges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveMerges(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch candidate merges', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchRejectionReasons();
    fetchActiveMerges();
  }, []);

  const undoCandidateMerge = async (merge) => {
    if (!window.confirm(`Hoàn tác gộp ${merge.secondary_name} khỏi hồ sơ ${merge.primary_name}?`)) return;
    setMergeError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/candidates/merges/${merge.id}/undo`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      setMergeError(err.response?.data?.message || 'Không thể hoàn tác gộp hồ sơ.');
    }
  };

  const openCvModal = (candidate) => {
    setViewingCandidate(candidate);
    setCvData(getCandidateCvData(candidate));
    setShowCvModal(true);
  };

  const downloadResume = async (candidate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/candidates/${candidate.id}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const objectUrl = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const extension = (candidate.resume_url && candidate.resume_url.includes('.')) 
        ? candidate.resume_url.substring(candidate.resume_url.lastIndexOf('.')) 
        : '.pdf';
      anchor.download = `CV-${candidate.full_name || candidate.id}${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      alert('Không thể tải CV của ứng viên: ' + (error.response?.data?.message || error.message || 'Lỗi tải tệp'));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dbeafe', color: '#1d4ed8' }}>Mới</span>;
      case 'INTERVIEWING': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fef3c7', color: '#d97706' }}>Phỏng vấn</span>;
      case 'OFFERED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#e0e7ff', color: '#4338ca' }}>Đề nghị (Offer)</span>;
      case 'HIRED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#dcfce7', color: '#16a34a' }}>Đã tuyển</span>;
      case 'REJECTED': return <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626' }}>Đánh trượt</span>;
      default: return <span>{status}</span>;
    }
  };

  const handleOpenReject = (candidate) => {
    setSelectedCandidate(candidate);
    setShowRejectModal(true);
    setRejectReason('');
    setRejectError('');
  };

  const submitReject = async () => {
    if (!rejectReason) {
      setRejectError('Vui lòng chọn lý do loại hồ sơ');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/candidates/${selectedCandidate.id}/status`, {
        status: 'REJECTED',
        rejection_reason_code: rejectReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRejectModal(false);
      fetchCandidates();
    } catch (error) {
      setRejectError('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

  const handleHire = async (candidate) => {
    if (window.confirm(`Bạn có chắc chắn muốn tuyển dụng ứng viên ${candidate.full_name}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:5000/api/candidates/${candidate.id}/status`, {
          status: 'HIRED'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCandidates();
      } catch (error) {
        alert('Có lỗi xảy ra khi cập nhật trạng thái');
      }
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 className="g-page-title">Quản lý Hồ sơ Ứng viên</h1>
            <p className="g-page-subtitle">Theo dõi và quản lý ứng viên trên toàn hệ thống</p>
          </div>
          <Link to="/candidates/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s' }}>
            <span>+</span> Thêm Ứng viên
          </Link>
        </div>

        {activeMerges.length > 0 && (
          <section style={{ padding: 18, background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 17, color: '#334155' }}>Hồ sơ đã gộp gần đây</h2>
            {mergeError && <div role="alert" style={{ marginBottom: 10, color: '#b91c1c' }}>{mergeError}</div>}
            <div style={{ display: 'grid', gap: 8 }}>
              {activeMerges.map(merge => {
                const canUndo = Number(merge.hours_since_merge) < 24;
                return (
                  <div key={merge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
                    <span>{merge.secondary_name} đã gộp vào {merge.primary_name} · {canUndo ? 'còn trong 24 giờ' : 'đã quá 24 giờ'}</span>
                    {canUndo && <button type="button" onClick={() => undoCandidateMerge(merge)} style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}>Hoàn tác</button>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Content */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Bạn chưa có hồ sơ ứng viên nào.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Họ Tên</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Vị trí ứng tuyển</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nguồn (Master Data)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>CV</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(cand => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', color: '#1e293b', fontWeight: '600' }}>{cand.full_name}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>{cand.email}</td>
                    <td style={{ padding: '16px', color: '#475569' }}>
                      {cand.position_name ? `${cand.position_name} - ${cand.department_name}` : 'N/A'}
                    </td>
                    <td style={{ padding: '16px', color: '#4f46e5', fontWeight: '600' }}>
                      {candidateSources.find(s => s.code === cand.source_code)?.name || cand.source_code || '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {cand.resume_url ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => openCvModal(cand)} 
                            className="btn-action-view"
                            style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1' }}
                            title="Xem trước CV"
                          >
                            <FiEye /> Xem CV
                          </button>
                          <button 
                            type="button" 
                            onClick={() => downloadResume(cand)} 
                            className="btn-action-view"
                            title="Tải tệp PDF CV"
                          >
                            <FiDownload /> Tải CV
                          </button>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(cand.status)}
                      {cand.sla_overdue === 1 && <span style={{ display: 'inline-block', marginLeft: 6, padding: '4px 8px', borderRadius: 20, background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>Quá SLA</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {cand.status !== 'REJECTED' && cand.status !== 'HIRED' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {user?.roles?.some(r => r.role_code === 'HR_MANAGER') && (
                            <button 
                              onClick={() => handleHire(cand)}
                              style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                            >
                              Tuyển dụng
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenReject(cand)}
                            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
                          >
                            Đánh trượt
                          </button>
                        </div>
                      )}
                      {cand.status === 'REJECTED' && cand.rejection_reason_code && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>
                          Lý do: {rejectionReasons.find(r => r.code === cand.rejection_reason_code)?.name || cand.rejection_reason_code}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.2rem' }}>Đánh trượt Ứng viên</h3>
            <p className="g-page-subtitle">Bạn đang đánh trượt ứng viên <strong>{selectedCandidate?.full_name}</strong>. Vui lòng chọn lý do từ danh mục chung.</p>
            
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Lý do loại hồ sơ <span style={{ color: '#ef4444' }}>*</span></label>
            <select 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '8px', outline: 'none' }}
            >
              <option value="">-- Chọn lý do --</option>
              {rejectionReasons.map(r => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
            {rejectError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{rejectError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>Hủy</button>
              <button onClick={submitReject} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '600' }}>Xác nhận Trượt</button>
            </div>
          </div>
        </div>
      )}

      {/* CV Preview Modal matching Images 1 & 2 */}
      {showCvModal && cvData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '820px',
            maxWidth: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 24px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>
                XEM TRƯỚC HỒ SƠ ỨNG VIÊN
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => downloadResume(viewingCandidate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <FiDownload /> Tải xuống PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '20px'
                  }}
                >
                  <FiX />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body - EXACT visual from Images 1 & 2 */}
            <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '740px', margin: '0 auto', fontFamily: 'inherit' }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em', color: '#4b5563', textTransform: 'uppercase', marginBottom: '8px' }}>
                  TECHCORP / HỒ SƠ ỨNG VIÊN
                </div>

                {/* Candidate Name & Avatar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0, lineHeight: 1.2 }}>
                      {cvData.fullName}
                    </h1>
                    <div style={{ fontSize: '15px', color: '#4b5563', marginTop: '6px' }}>
                      Ứng tuyển: {cvData.appliedPosition}
                    </div>
                  </div>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '1.5px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    <FiUser />
                  </div>
                </div>

                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0 22px 0' }} />

                {/* 4-Item Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '40px', rowGap: '18px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Email</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Số điện thoại</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Địa chỉ</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.address}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>Kinh nghiệm</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#111827' }}>{cvData.experience}</div>
                  </div>
                </div>

                {/* Giới thiệu bản thân */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Giới thiệu bản thân
                </h3>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                  {cvData.bio}
                </p>

                {/* Học vấn */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Học vấn
                </h3>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                  {cvData.educationSchool}
                </div>
                <div style={{ fontSize: '13.5px', color: '#6b7280' }}>
                  {cvData.educationMajor}
                </div>

                {/* Kỹ năng chuyên môn */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Kỹ năng chuyên môn
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                  {cvData.skills.map(s => (
                    <span key={s} style={{
                      display: 'inline-block',
                      padding: '6px 16px',
                      borderRadius: '9999px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      color: '#374151',
                      fontSize: '13.5px',
                      fontWeight: '500'
                    }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Kinh nghiệm làm việc */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Kinh nghiệm làm việc
                </h3>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                  {cvData.jobTitle}
                </div>
                <div style={{ fontSize: '13.5px', color: '#6b7280', marginBottom: '6px' }}>
                  {cvData.jobPeriod}
                </div>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  {cvData.jobDesc}
                </p>

                {/* Dự án tiêu biểu */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginTop: '22px', marginBottom: '10px' }}>
                  Dự án tiêu biểu
                </h3>
                <p style={{ fontSize: '14.5px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                  {cvData.projectDesc}
                </p>

                {/* Attachment Card */}
                <div style={{
                  marginTop: '32px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', fontSize: '20px' }}>
                      <FiFileText />
                    </div>
                    <div>
                      <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>
                        {cvData.attachmentFileName}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#6b7280' }}>
                        Tệp CV đính kèm (minh họa)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                      type="button"
                      onClick={() => downloadResume(viewingCandidate)}
                      title="Tải CV"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#374151',
                        background: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <FiDownload />
                    </button>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      color: '#4b5563',
                      fontSize: '12px',
                      fontWeight: '600',
                      letterSpacing: '0.04em'
                    }}>
                      PDF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '14px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setShowCvModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => downloadResume(viewingCandidate)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <FiDownload /> Tải xuống tệp PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateList;
