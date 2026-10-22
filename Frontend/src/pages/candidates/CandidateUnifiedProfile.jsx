import { SERVER_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiMail, FiPhone, FiFileText, FiDownload, FiExternalLink, 
  FiUploadCloud, FiStar, FiTag, FiBookmark, FiCheckCircle, FiClock, 
  FiUser, FiBriefcase, FiSend, FiAlertCircle, FiPlus, FiX, FiCheck, FiShield
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateApi from '../../api/candidateApi';

const CandidateUnifiedProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'notes' | 'activities'
  
  // Note state
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Stage change modal state
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState('');
  const [stageNote, setStageNote] = useState('');
  const [changingStage, setChangingStage] = useState(false);

  // Tag input state
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // CV Upload state
  const [uploadingCv, setUploadingCv] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Unified Profile Data
  const fetchProfile = async (targetId = id) => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await candidateApi.getUnifiedProfile(targetId);
      setProfileData(res.data.data);
    } catch (err) {
      console.error('Failed to load candidate unified profile:', err);
      if (err.response && err.response.status === 403) {
        setErrorState({
          type: '403',
          message: err.response.data?.message || 'Bạn không có quyền truy cập hồ sơ này. Chỉ Recruiter phụ trách và Hiring Manager của vị trí mới có quyền xem.'
        });
      } else if (err.response && err.response.status === 404) {
        setErrorState({
          type: '404',
          message: 'Không tìm thấy thông tin ứng viên trong hệ thống.'
        });
      } else {
        setErrorState({
          type: 'error',
          message: err.response?.data?.message || 'Có lỗi xảy ra khi tải hồ sơ ứng viên. Vui lòng thử lại sau.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(id);
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⏳ Đang tải hồ sơ hợp nhất của ứng viên...</div>
        <p style={{ fontSize: '0.9rem' }}>Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  // Handle Errors
  if (errorState) {
    const is403 = errorState.type === '403';
    return (
      <div style={{ padding: '40px 24px', maxWidth: '700px', margin: '40px auto', textAlign: 'center', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: is403 ? '#fee2e2' : '#fef3c7', color: is403 ? '#ef4444' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '32px' }}>
          {is403 ? <FiShield /> : <FiAlertTriangle />}
        </div>
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '12px', fontWeight: '700' }}>
          {is403 ? 'Giới Hạn Quyền Truy Cập' : errorState.type === '404' ? 'Không Tìm Thấy Hồ Sơ' : 'Có Lỗi Xảy Ra'}
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
          {errorState.message}
        </p>
        {is403 && (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
            <strong>Quy tắc bảo mật theo Scrum:</strong> Chỉ Nhân viên tuyển dụng (Recruiter) phụ trách và Trưởng bộ phận (Hiring Manager) của vị trí tuyển dụng tương ứng mới được phép mở và xem hồ sơ hợp nhất của ứng viên này.
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!is403 && errorState.type !== '404' && (
            <button 
              onClick={() => fetchProfile(id)}
              style={{ background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Thử lại
            </button>
          )}
          <button 
            onClick={() => navigate('/candidates')}
            style={{ background: is403 ? '#4f46e5' : '#f1f5f9', color: is403 ? 'white' : '#334155', padding: '10px 24px', borderRadius: '10px', border: is403 ? 'none' : '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiArrowLeft /> Quay lại Danh sách Ứng viên
          </button>
        </div>
      </div>
    );
  }

  const { candidate, applications = [], notes = [], activities = [], stages = [], userPermissions = {} } = profileData;

  // Rating click handler
  const handleRate = async (newRating) => {
    if (candidate.status === 'REJECTED') {
      alert('Không thể đánh giá hồ sơ đã bị đánh trượt.');
      return;
    }
    try {
      await candidateApi.updateRating(candidate.id, newRating);
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Không thể cập nhật đánh giá: ' + (err.response?.data?.message || err.message));
    }
  };

  // Talent Pool Toggle
  const handleToggleTalentPool = async () => {
    try {
      await candidateApi.toggleTalentPool(candidate.id, !candidate.is_talent_pool);
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Lỗi cập nhật Kho tiềm năng: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add Note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSubmittingNote(true);
      await candidateApi.addNote(candidate.id, newNote);
      setNewNote('');
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Không thể thêm ghi chú: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingNote(false);
    }
  };

  // Stage change submit
  const handleStageChangeSubmit = async () => {
    if (!targetStage) return;
    try {
      setChangingStage(true);
      await candidateApi.updateStage(candidate.id, targetStage, stageNote);
      setShowStageModal(false);
      setStageNote('');
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Không thể chuyển giai đoạn: ' + (err.response?.data?.message || err.message));
    } finally {
      setChangingStage(false);
    }
  };

  // Add tag
  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    const currentTags = candidate.tags ? candidate.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!currentTags.includes(tagInput.trim())) {
      const updated = [...currentTags, tagInput.trim()];
      try {
        await candidateApi.updateTags(candidate.id, updated.join(','));
        setTagInput('');
        setIsAddingTag(false);
        fetchProfile(candidate.id);
      } catch (err) {
        alert('Lỗi cập nhật nhãn');
      }
    } else {
      setTagInput('');
      setIsAddingTag(false);
    }
  };

  // Remove tag
  const handleRemoveTag = async (tagToRemove) => {
    const currentTags = candidate.tags ? candidate.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const updated = currentTags.filter(t => t !== tagToRemove);
    try {
      await candidateApi.updateTags(candidate.id, updated.join(','));
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Lỗi xóa nhãn');
    }
  };

  // CV Upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingCv(true);
      await candidateApi.uploadCv(candidate.id, file);
      alert('Tải lên CV mới thành công!');
      fetchProfile(candidate.id);
    } catch (err) {
      alert('Không thể tải lên file: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingCv(false);
    }
  };

  // Parsed skills array
  const parsedSkills = candidate.parsed_skills 
    ? candidate.parsed_skills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Tags array
  const tagsList = candidate.tags 
    ? candidate.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const getStageBadgeColor = (stageCode) => {
    switch (stageCode) {
      case 'NEW': return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case 'SCREENING': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'INTERVIEW': return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'OFFER': return { bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' };
      case 'HIRED': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'REJECTED': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  const getStatusName = (status, stage) => {
    if (stage === 'NEW' || status === 'NEW') return 'Hồ sơ mới';
    if (stage === 'SCREENING') return 'Sàng lọc hồ sơ';
    if (stage === 'INTERVIEW' || status === 'INTERVIEWING') return 'Đang phỏng vấn';
    if (stage === 'OFFER' || status === 'OFFERED') return 'Đề xuất (Offer)';
    if (stage === 'HIRED' || status === 'HIRED') return 'Đã tuyển dụng (Hired)';
    if (stage === 'REJECTED' || status === 'REJECTED') return 'Không phù hợp (Loại)';
    return status;
  };

  const cvUrl = candidate.cv_file_path 
    ? (candidate.cv_file_path.startsWith('http') ? candidate.cv_file_path : `${SERVER_BASE_URL}${candidate.cv_file_path}`)
    : null;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Navigation Breadcrumb & Back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/candidates')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }}
            >
              <FiArrowLeft /> Quay lại danh sách
            </button>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
              <span>Quản lý Ứng viên</span> &nbsp;/&nbsp; 
              <span style={{ color: '#1e293b', fontWeight: '600' }}>Hồ sơ hợp nhất</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Talent Pool Toggle Button */}
            <button
              onClick={handleToggleTalentPool}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: candidate.is_talent_pool ? '#fef3c7' : 'white',
                border: candidate.is_talent_pool ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                color: candidate.is_talent_pool ? '#b45309' : '#64748b',
                padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
              }}
              title="Đánh dấu ứng viên tiềm năng để xem xét cho các đợt tuyển dụng sau"
            >
              <FiBookmark fill={candidate.is_talent_pool ? '#b45309' : 'none'} />
              {candidate.is_talent_pool ? 'Đã lưu Talent Pool' : 'Lưu vào Talent Pool'}
            </button>

            {/* Change Stage Button */}
            {userPermissions.canChangeStage && (
              <button
                onClick={() => {
                  setTargetStage(candidate.current_stage || 'NEW');
                  setShowStageModal(true);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#4f46e5', color: 'white', border: 'none',
                  padding: '8px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                }}
              >
                <FiCheckCircle /> Chuyển giai đoạn tuyển dụng
              </button>
            )}
          </div>
        </div>

        {/* Top Header Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', fontWeight: 'bold', boxShadow: '0 6px 14px rgba(79, 70, 229, 0.3)'
            }}>
              {candidate.full_name ? candidate.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b', fontWeight: '700' }}>{candidate.full_name}</h1>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                  Mã: {candidate.tracking_code || `TRK-${candidate.id}`}
                </span>
                {applications.length > 1 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    {applications.length} lần ứng tuyển
                  </span>
                )}
                {candidate.is_talent_pool ? (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#b45309' }}>
                    ★ Talent Pool
                  </span>
                ) : null}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '8px', color: '#64748b', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiMail size={15} style={{ color: '#4f46e5' }} /> {candidate.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiPhone size={15} style={{ color: '#10b981' }} /> {candidate.phone || 'Chưa có SĐT'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiBriefcase size={15} style={{ color: '#f59e0b' }} /> {candidate.position_name || 'Chưa gán vị trí'} {candidate.department_name ? `(${candidate.department_name})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Rating & Current Stage Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Đánh giá:</span>
              <div style={{ display: 'flex', gap: '4px', cursor: candidate.status === 'REJECTED' ? 'not-allowed' : 'pointer' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => {
                      if (candidate.status === 'REJECTED') return;
                      handleRate(star);
                    }}
                    style={{ fontSize: '1.25rem', color: star <= (candidate.rating || 0) ? '#f59e0b' : '#cbd5e1', transition: 'transform 0.1s' }}
                    title={candidate.status === 'REJECTED' ? 'Hồ sơ đã bị đánh trượt - không thể thay đổi đánh giá' : `Chấm ${star} sao`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginLeft: '4px' }}>
                ({candidate.rating || 0}/5)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trạng thái hiện tại:</span>
              <span style={{
                padding: '6px 14px', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 'bold',
                background: getStageBadgeColor(candidate.current_stage || candidate.status).bg,
                color: getStageBadgeColor(candidate.current_stage || candidate.status).text,
                border: `1px solid ${getStageBadgeColor(candidate.current_stage || candidate.status).border}`
              }}>
                {getStatusName(candidate.status, candidate.current_stage)}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper Tracker */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Tiến trình Tuyển dụng (Pipeline Workflow)</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Recruiter phụ trách: <strong style={{ color: '#1e293b' }}>{candidate.recruiter_name || 'Chưa phân công'}</strong> | Hiring Manager: <strong style={{ color: '#1e293b' }}>{candidate.hiring_manager_name || 'Chưa gán'}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {stages.map((stg, index) => {
              const currentStageCode = candidate.current_stage || 'NEW';
              const currentStageIndex = stages.findIndex(s => s.stage_code === currentStageCode);
              const isPassed = index < currentStageIndex;
              const isCurrent = stg.stage_code === currentStageCode;

              return (
                <div key={stg.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '130px' }}>
                  <div 
                    onClick={() => {
                      if (userPermissions.canChangeStage) {
                        setTargetStage(stg.stage_code);
                        setShowStageModal(true);
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '10px', textAlign: 'center',
                      background: isCurrent ? '#4f46e5' : isPassed ? '#ecfdf5' : '#f8fafc',
                      color: isCurrent ? 'white' : isPassed ? '#059669' : '#64748b',
                      border: isCurrent ? '1px solid #4338ca' : isPassed ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      cursor: userPermissions.canChangeStage ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      boxShadow: isCurrent ? '0 4px 10px rgba(79, 70, 229, 0.25)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: isCurrent ? 0.9 : 0.7 }}>
                      Bước {index + 1}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {stg.stage_name}
                    </div>
                  </div>
                  {index < stages.length - 1 && (
                    <div style={{ width: '16px', height: '2px', background: isPassed ? '#10b981' : '#cbd5e1', margin: '0 4px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout: 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Personal Info, Application History, Notes & Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card: Chi tiết ứng viên & Kỹ năng */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                Thông tin Chi tiết & Năng lực
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem', marginBottom: '20px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Nguồn hồ sơ</span>
                  <span style={{ fontWeight: '600', color: '#1e293b', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
                    {candidate.source_code || 'Chưa rõ nguồn'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày nộp hồ sơ</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    {new Date(candidate.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Phòng ban ứng tuyển</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    {candidate.department_name || 'Chưa xác định'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>Vị trí ứng tuyển</span>
                  <span style={{ fontWeight: '600', color: '#4f46e5' }}>
                    {candidate.position_name || 'Chưa gán vị trí'}
                  </span>
                </div>
              </div>

              {/* Cover Letter */}
              {candidate.cover_letter && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Thư giới thiệu (Cover letter):
                  </span>
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#334155', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: '1.5' }}>
                    "{candidate.cover_letter}"
                  </div>
                </div>
              )}

              {/* Parsed Skills */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                  Kỹ năng bóc tách từ CV (Parsed Skills):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {parsedSkills.length > 0 ? (
                    parsedSkills.map((sk, i) => (
                      <span key={i} style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa có dữ liệu kỹ năng bóc tách</span>
                  )}
                </div>
              </div>

              {/* Tags / Nhãn phân loại */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>
                    Nhãn phân loại (Tags):
                  </span>
                  {!isAddingTag && userPermissions.canEditTags && (
                    <button 
                      onClick={() => setIsAddingTag(true)}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiPlus /> Thêm nhãn
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {tagsList.map((tag, idx) => (
                    <span key={idx} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiTag size={12} color="#64748b" /> {tag}
                      {userPermissions.canEditTags && (
                        <span 
                          onClick={() => handleRemoveTag(tag)}
                          style={{ cursor: 'pointer', color: '#94a3b8', fontWeight: 'bold' }}
                          title="Xóa nhãn"
                        >
                          ×
                        </span>
                      )}
                    </span>
                  ))}

                  {isAddingTag && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                        placeholder="Nhập nhãn..."
                        autoFocus
                        style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #4f46e5', fontSize: '0.75rem', outline: 'none', width: '110px' }}
                      />
                      <button onClick={handleAddTag} style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>Lưu</button>
                      <button onClick={() => setIsAddingTag(false)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}>Hủy</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Lịch sử ứng tuyển các vị trí (Trọng tâm SCRUM-187) */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                    Lịch sử Ứng tuyển ({applications.length} lần)
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Toàn bộ các lần ứng tuyển trước đây của cùng người này ({candidate.email})
                  </p>
                </div>
              </div>

              {applications.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Chưa có lịch sử ứng tuyển nào khác.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {applications.map((app) => {
                    const isViewing = Number(app.id) === Number(candidate.id);

                    return (
                      <div 
                        key={app.id} 
                        style={{
                          padding: '14px 16px', borderRadius: '12px',
                          border: isViewing ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          background: isViewing ? '#f5f3ff' : '#fafafa',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>
                              {app.position_name || 'Vị trí chưa xác định'}
                            </span>
                            {isViewing && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', background: '#4f46e5', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                                Đang xem hồ sơ này
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Phòng ban: <strong>{app.department_name || 'N/A'}</strong> &nbsp;•&nbsp; 
                            Ngày nộp: <strong>{new Date(app.created_at).toLocaleDateString('vi-VN')}</strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Recruiter: {app.recruiter_name || 'N/A'} | Mã: {app.tracking_code || `TRK-${app.id}`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                            background: getStageBadgeColor(app.current_stage || app.status).bg,
                            color: getStageBadgeColor(app.current_stage || app.status).text,
                            border: `1px solid ${getStageBadgeColor(app.current_stage || app.status).border}`
                          }}>
                            {getStatusName(app.status, app.current_stage)}
                          </span>

                          {!isViewing && (
                            <button
                              onClick={() => navigate(`/candidates/${app.id}`)}
                              style={{
                                background: 'white', border: '1px solid #cbd5e1', color: '#4f46e5',
                                padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600'
                              }}
                            >
                              Chuyển xem ➔
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card: Ghi chú & Dòng thời gian (Tabs) */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              
              {/* Tabs Switcher */}
              <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    background: 'none', border: 'none', padding: '10px 4px', fontSize: '0.95rem', fontWeight: '700',
                    color: activeTab === 'history' ? '#4f46e5' : '#64748b',
                    borderBottom: activeTab === 'history' ? '3px solid #4f46e5' : '3px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Ghi chú Đánh giá ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab('activities')}
                  style={{
                    background: 'none', border: 'none', padding: '10px 4px', fontSize: '0.95rem', fontWeight: '700',
                    color: activeTab === 'activities' ? '#4f46e5' : '#64748b',
                    borderBottom: activeTab === 'activities' ? '3px solid #4f46e5' : '3px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  Lịch sử Xử lý & Dòng thời gian ({activities.length})
                </button>
              </div>

              {/* TAB 1: GHI CHÚ */}
              {activeTab === 'history' && (
                <div>
                  {/* Add Note Input */}
                  <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Thêm ghi chú đánh giá ứng viên (kết quả phỏng vấn, trao đổi lương, văn hóa...)..."
                        rows={3}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1',
                          fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <button
                        type="submit"
                        disabled={submittingNote || !newNote.trim()}
                        style={{
                          background: '#4f46e5', color: 'white', border: 'none', padding: '8px 18px',
                          borderRadius: '8px', cursor: submittingNote ? 'not-allowed' : 'pointer',
                          fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <FiSend size={14} /> {submittingNote ? 'Đang gửi...' : 'Thêm ghi chú'}
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {notes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Chưa có ghi chú nào cho ứng viên này. Hãy viết ghi chú đầu tiên!
                      </div>
                    ) : (
                      notes.map((n) => (
                        <div key={n.id} style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>
                                {n.author_name}
                              </span>
                              {n.author_title && (
                                <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px' }}>
                                  {n.author_title}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {new Date(n.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <div style={{ color: '#334155', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                            {n.note_content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DÒNG THỜI GIAN HOẠT ĐỘNG */}
              {activeTab === 'activities' && (
                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Vertical line */}
                  <div style={{ position: 'absolute', left: '8px', top: '8px', bottom: '8px', width: '2px', background: '#e2e8f0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activities.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Chưa có nhật ký hoạt động nào.</div>
                    ) : (
                      activities.map((act) => (
                        <div key={act.id} style={{ position: 'relative' }}>
                          {/* Dot on timeline */}
                          <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#4f46e5', border: '2px solid white', boxShadow: '0 0 0 2px #c7d2fe' }} />

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>
                                {act.details || act.action_type}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {new Date(act.created_at).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            {act.performer_name && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                Thực hiện bởi: <strong>{act.performer_name}</strong> {act.performer_title ? `(${act.performer_title})` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: Embedded CV Preview & Document Tools */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'sticky', top: '24px' }}>
            
            {/* CV Header Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiFileText size={20} color="#4f46e5" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Xem trước CV ngay trong trang
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Upload CV button */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf,.doc,.docx" 
                  style={{ display: 'none' }} 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCv}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                    padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                  }}
                  title="Tải lên bản cập nhật CV mới nhất của ứng viên"
                >
                  <FiUploadCloud /> {uploadingCv ? 'Đang tải...' : 'Cập nhật CV'}
                </button>

                {cvUrl && (
                  <>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                        padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600'
                      }}
                      title="Mở CV trong tab trình duyệt mới"
                    >
                      <FiExternalLink /> Tab mới
                    </a>

                    <a
                      href={cvUrl}
                      download
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#4f46e5', color: 'white', border: 'none',
                        padding: '6px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600'
                      }}
                      title="Tải file CV về máy tính"
                    >
                      <FiDownload /> Tải xuống
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Embedded CV Document Frame */}
            {cvUrl ? (
              <div style={{ width: '100%', height: '720px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#525659' }}>
                <iframe
                  src={`${cvUrl}#toolbar=1&navpanes=0`}
                  title="CV Document Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            ) : (
              <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1', color: '#64748b', textAlign: 'center', padding: '24px' }}>
                <FiFileText size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '1.1rem' }}>Chưa có file CV đính kèm</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', maxWidth: '300px' }}>
                  Ứng viên này chưa được tải lên file CV hoặc hồ sơ chưa có tài liệu đính kèm.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiUploadCloud /> Tải lên CV cho ứng viên
                </button>
              </div>
            )}

            {/* CV Details footer */}
            {candidate.cv_file_path && (
              <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>Đường dẫn tệp: {candidate.cv_file_path}</span>
                <span>Định dạng hỗ trợ: PDF, DOC, DOCX</span>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Stage Change Modal */}
      {showStageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '480px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>Chuyển Giai đoạn Tuyển dụng</h3>
              <button onClick={() => setShowStageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}>×</button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.5' }}>
              Bạn đang chuyển tiến trình của ứng viên <strong>{candidate.full_name}</strong>. Hành động này sẽ được ghi nhận vào nhật ký xử lý của hệ thống.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Chọn giai đoạn tiếp theo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', outline: 'none', fontSize: '0.9rem' }}
            >
              {stages.map((stg) => (
                <option key={stg.id} value={stg.stage_code}>
                  {stg.stage_name} ({stg.stage_code})
                </option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Ghi chú lý do chuyển giai đoạn (tùy chọn)
            </label>
            <textarea
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              placeholder="VD: Đã hoàn thành phỏng vấn kỹ thuật vòng 2, kết quả tốt. Đề xuất gửi offer..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px', outline: 'none', fontSize: '0.85rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowStageModal(false)} 
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Hủy
              </button>
              <button 
                onClick={handleStageChangeSubmit} 
                disabled={changingStage}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontWeight: '600' }}
              >
                {changingStage ? 'Đang cập nhật...' : 'Xác nhận chuyển'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CandidateUnifiedProfile;

