import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiAward, FiUser, FiCalendar, FiClock, FiFileText,
  FiDollarSign, FiLock, FiUnlock, FiInfo, FiSend, FiEdit3
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateEvaluationApi from '../../api/candidateEvaluationApi';

const CandidateEvaluationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeRoundTab, setActiveRoundTab] = useState(0);

  // Decision State
  const [decision, setDecision] = useState(''); // 'PASSED' or 'FAILED'
  const [comment, setComment] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState('');
  const [isEditingDecision, setIsEditingDecision] = useState(false);

  // Offer State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerSalary, setOfferSalary] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerDeadline, setOfferDeadline] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');

  // Add Evaluation Modal State
  const [showAddEvalModal, setShowAddEvalModal] = useState(false);
  const [evalRoundNumber, setEvalRoundNumber] = useState(1);
  const [evalRoundName, setEvalRoundName] = useState('');
  const [evalInterviewerName, setEvalInterviewerName] = useState(user?.full_name || '');
  const [evalInterviewerRole, setEvalInterviewerRole] = useState(user?.job_title || 'Người phỏng vấn');
  const [evalScore, setEvalScore] = useState(8.0);
  const [evalResult, setEvalResult] = useState('PASS');
  const [evalComments, setEvalComments] = useState('');
  const [evalStrengths, setEvalStrengths] = useState('');
  const [evalWeaknesses, setEvalWeaknesses] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await candidateEvaluationApi.getById(id);
      const data = res.data.data;
      setCandidate(data);
      if (data.interview_decision) {
        setDecision(data.interview_decision);
        setComment(data.interview_decision_comment || '');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải chi tiết đánh giá ứng viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!decision) {
      alert('Vui lòng chọn kết quả Đạt hoặc Không đạt.');
      return;
    }
    if (!comment || comment.trim().length < 3) {
      alert('Vui lòng nhập nhận xét và lý do quyết định của Trưởng bộ phận (tối thiểu 3 ký tự).');
      return;
    }
    if (!confirmChecked) {
      alert('Vui lòng tích chọn xác nhận trách nhiệm đối với quyết định tuyển chọn này.');
      return;
    }

    if (candidate.is_missing_evaluations) {
      const proceed = window.confirm(
        '⚠️ CẢNH BÁO: Vòng phỏng vấn đang thiếu phiếu đánh giá từ người phỏng vấn. Bạn có chắc chắn muốn xác nhận quyết định lúc này không?'
      );
      if (!proceed) return;
    }

    if (!candidate?.verified_decision_application_id) {
      alert('Không xác minh được application duy nhất. Vui lòng kiểm tra liên kết hồ sơ.');
      return;
    }
    setSubmittingDecision(true);
    setDecisionSuccess('');
    try {
      await candidateEvaluationApi.recordDecision(id, { decision, comment, application_id: candidate.verified_decision_application_id });
      setDecisionSuccess('Đã xác nhận và lưu quyết định tuyển chọn thành công!');
      setIsEditingDecision(false);
      await fetchDetail();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu quyết định.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    setOfferError('');
    if (!offerSalary || Number(offerSalary) <= 0) {
      setOfferError('Vui lòng nhập mức lương hợp lệ.');
      return;
    }

    setSubmittingOffer(true);
    try {
      await candidateEvaluationApi.createOffer(id, {
        salary_amount: Number(offerSalary),
        currency: 'VND',
        start_date: offerStartDate || null,
        response_deadline: offerDeadline || null,
        message: offerMessage || null,
        note: offerNote || null
      });
      setOfferSuccess('Tạo Thư mời nhận việc (Offer) thành công!');
      setShowOfferModal(false);
      await fetchDetail();
    } catch (err) {
      console.error(err);
      setOfferError(err.response?.data?.message || 'Không thể tạo Thư mời nhận việc.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAddEvalSubmit = async (e) => {
    e.preventDefault();
    setEvalError('');
    if (!evalInterviewerName || !evalInterviewerName.trim()) {
      setEvalError('Vui lòng nhập họ tên người phỏng vấn.');
      return;
    }
    const scoreNum = Number(evalScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setEvalError('Điểm số phải từ 0 đến 10.');
      return;
    }

    setSubmittingEval(true);
    try {
      await candidateEvaluationApi.addEvaluation(id, {
        round_number: Number(evalRoundNumber) || 1,
        round_name: evalRoundName.trim() || `Vòng ${evalRoundNumber}: Phỏng vấn đánh giá năng lực`,
        interviewer_name: evalInterviewerName.trim(),
        interviewer_role: evalInterviewerRole.trim() || 'Người phỏng vấn',
        overall_score: scoreNum,
        result: evalResult,
        comments: evalComments.trim(),
        strengths: evalStrengths.trim(),
        weaknesses: evalWeaknesses.trim()
      });
      setShowAddEvalModal(false);
      setEvalComments('');
      setEvalStrengths('');
      setEvalWeaknesses('');
      await fetchDetail();
    } catch (err) {
      console.error(err);
      setEvalError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phiếu đánh giá.');
    } finally {
      setSubmittingEval(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <h3>Đang tải dữ liệu đánh giá ứng viên...</h3>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ padding: '30px' }}>
        <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c' }}>
          <h4>Không thể truy cập dữ liệu</h4>
          <p>{error || 'Ứng viên không tồn tại hoặc bạn không có quyền quản lý ứng viên này.'}</p>
          <Link to="/candidate-evaluations" style={{ color: '#4f46e5', fontWeight: '600' }}>
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const rounds = candidate.rounds || [];
  const currentRound = rounds[activeRoundTab] || null;

  return (
    <div style={{ padding: '28px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 70px)' }}>
      {/* Navigation Breadcrumb */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
        <Link
          to="/candidate-evaluations"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5', textDecoration: 'none', fontWeight: '600' }}
        >
          <FiArrowLeft size={16} /> Quay lại danh sách ứng viên
        </Link>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#64748b' }}>Đánh giá & Tuyển chọn</span>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: '700' }}>{candidate.full_name}</span>
      </div>

      {/* Candidate Profile Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: '800',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
          }}>
            {candidate.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
                {candidate.full_name}
              </h1>
              {candidate.interview_decision === 'PASSED' ? (
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#dcfce7', color: '#16a34a', fontWeight: '800', fontSize: '0.8rem' }}>
                  ✓ ĐẠT PHỎNG VẤN
                </span>
              ) : candidate.interview_decision === 'FAILED' ? (
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#fee2e2', color: '#dc2626', fontWeight: '800', fontSize: '0.8rem' }}>
                  ✗ KHÔNG ĐẠT
                </span>
              ) : (
                <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#fef3c7', color: '#d97706', fontWeight: '800', fontSize: '0.8rem' }}>
                  ⏳ CHỜ TRƯỞNG BP DUYỆT
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.88rem', color: '#64748b', flexWrap: 'wrap' }}>
              <span><strong>Vị trí:</strong> {candidate.position_name || 'N/A'}</span>
              <span>•</span>
              <span><strong>Bộ phận:</strong> <span style={{ color: '#4f46e5', fontWeight: '600' }}>{candidate.department_name}</span></span>
              <span>•</span>
              <span><strong>Email:</strong> {candidate.email}</span>
              <span>•</span>
              <span><strong>SĐT:</strong> {candidate.phone || 'Chưa có'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {candidate.resume_url && (
            <a
              href={`${API_BASE_URL}/candidates/${candidate.id}/resume`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#f1f5f9',
                color: '#334155',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              <FiFileText size={16} /> Tải hồ sơ CV
            </a>
          )}
        </div>
      </div>

      {/* Grid: Left Column (Evaluations & Scores), Right Column (Decision & Offer) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(340px, 1.2fr)', gap: '24px', alignItems: 'start' }}>

        {/* LEFT COLUMN: Scores, Rounds & Detailed Evaluation Sheets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Card 1: Tổng hợp điểm & Quy tắc rõ ràng */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiAward color="#4f46e5" size={22} /> Tổng Hợp Điểm & Quy Tắc Đánh Giá
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.86rem' }}>
                  Điểm số được tổng hợp tự động từ tất cả các vòng và phiếu đánh giá (chống đếm trùng).
                </p>
              </div>

              {/* Overall Score Box */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
                padding: '12px 20px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Điểm Tổng Hợp Cuối Cùng
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: candidate.rating_color || '#4f46e5' }}>
                  {candidate.aggregate_score !== null ? candidate.aggregate_score : '--'}
                  <span style={{ fontSize: '1rem', fontWeight: '600', color: '#94a3b8' }}> / 10.0</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: candidate.rating_color }}>
                  {candidate.rating_label}
                </div>
              </div>
            </div>

            {/* Clear Aggregation Rules Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.85rem', color: '#334155', marginBottom: '8px' }}>
                <FiInfo color="#4f46e5" /> Quy tắc tổng hợp điểm minh bạch:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#475569', lineHeight: '1.6' }}>
                <li><strong>Điểm phiếu:</strong> Tính theo điểm từng tiêu chí hoặc trung bình có trọng số của các tiêu chí đánh giá.</li>
                <li><strong>Điểm vòng:</strong> Trung bình cộng điểm các phiếu hoàn thành trong vòng đó (mỗi phiếu tính 1 lần, không đếm trùng).</li>
                <li><strong>Điểm tổng hợp:</strong> Trung bình cộng điểm của các vòng phỏng vấn đã hoàn thành.</li>
                <li><strong>Thang điểm 10.0:</strong> &ge; 8.5 (Xuất sắc) • 7.0 - 8.4 (Tốt) • 5.0 - 6.9 (Trung bình) • &lt; 5.0 (Không đạt).</li>
              </ul>
            </div>

            {/* Missing Evaluation Sheets Warning Alert */}
            {candidate.is_missing_evaluations ? (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: '#92400e'
              }}>
                <FiAlertTriangle size={22} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.92rem', marginBottom: '4px' }}>
                    CẢNH BÁO: ĐANG THIẾU {candidate.total_missing_sheets} PHIẾU ĐÁNH GIÁ
                  </div>
                  <div style={{ fontSize: '0.84rem', lineHeight: '1.5' }}>
                    Một số vòng phỏng vấn chưa nhận đủ số phiếu từ các thành viên ban phỏng vấn. Trưởng bộ phận nên xem xét kỹ danh sách phiếu đã nộp bên dưới trước khi quyết định tuyển chọn.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#166534',
                fontSize: '0.85rem'
              }}>
                <FiCheckCircle size={18} color="#16a34a" />
                <span><strong>Đầy đủ phiếu:</strong> Đã hoàn tất và thu đủ tất cả các phiếu đánh giá theo kế hoạch phỏng vấn ({candidate.unique_evaluations_count} phiếu).</span>
              </div>
            )}
          </div>

          {/* Card 2: Chi tiết từng vòng & Từng phiếu đánh giá (Không đếm trùng) */}
          <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
                Chi Tiết Từng Vòng & Phiếu Đánh Giá
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEvalRoundNumber(rounds.length > 0 ? (activeRoundTab + 1) : 1);
                  setEvalRoundName(currentRound ? currentRound.round_name : `Vòng ${rounds.length + 1}: Phỏng vấn`);
                  setShowAddEvalModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e0e7ff',
                  border: '1px solid #c7d2fe',
                  color: '#4338ca',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                + Nhập Phiếu Đánh Giá Mới
              </button>
            </div>

            {/* Round Tabs */}
            {rounds.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
                  {rounds.map((round, idx) => (
                    <button
                      key={round.id}
                      onClick={() => setActiveRoundTab(idx)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        background: activeRoundTab === idx ? '#4f46e5' : '#f1f5f9',
                        color: activeRoundTab === idx ? '#ffffff' : '#475569',
                        boxShadow: activeRoundTab === idx ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>Vòng {round.round_number}</span>
                      {round.is_missing && (
                        <span style={{
                          background: activeRoundTab === idx ? '#fef3c7' : '#fee2e2',
                          color: activeRoundTab === idx ? '#b45309' : '#dc2626',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: '800'
                        }}>
                          Thiếu {round.missing_count} phiếu
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Current Round Details */}
                {currentRound && (
                  <div>
                    {/* Round Summary Sub-bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem' }}>
                          {currentRound.round_name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          Ngày phỏng vấn: {currentRound.interview_date ? new Date(currentRound.interview_date).toLocaleString('vi-VN') : 'Chưa xếp lịch'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>SỐ PHIẾU NỘP</div>
                          <div style={{ fontWeight: '800', color: currentRound.is_missing ? '#d97706' : '#16a34a' }}>
                            {currentRound.submitted_evaluations_count} / {currentRound.expected_evaluations} phiếu
                          </div>
                        </div>

                        <div style={{
                          background: '#ffffff',
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>ĐIỂM TRUNG BÌNH VÒNG</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#4f46e5' }}>
                            {currentRound.round_score !== null ? `${currentRound.round_score} / 10` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Evaluation Sheets List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {currentRound.evaluations && currentRound.evaluations.length > 0 ? (
                        currentRound.evaluations.map((evalSheet, evalIdx) => (
                          <div
                            key={evalSheet.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '14px',
                              padding: '20px',
                              background: '#ffffff',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}
                          >
                            {/* Sheet Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ background: '#ede9fe', color: '#6d28d9', fontSize: '0.72rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                                    PHIẾU #{evalSheet.id}
                                  </span>
                                  <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>
                                    {evalSheet.interviewer_name}
                                  </span>
                                  {evalSheet.interviewer_role && (
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                      ({evalSheet.interviewer_role})
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                                  Thời gian gửi phiếu: {evalSheet.submitted_at ? new Date(evalSheet.submitted_at).toLocaleString('vi-VN') : 'Vừa xong'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontWeight: '800',
                                  fontSize: '0.75rem',
                                  background: evalSheet.result === 'PASS' ? '#dcfce7' : (evalSheet.result === 'FAIL' ? '#fee2e2' : '#fef3c7'),
                                  color: evalSheet.result === 'PASS' ? '#16a34a' : (evalSheet.result === 'FAIL' ? '#dc2626' : '#d97706')
                                }}>
                                  {evalSheet.result === 'PASS' ? 'ĐẠT' : (evalSheet.result === 'FAIL' ? 'KHÔNG ĐẠT' : 'CÂN NHẮC')}
                                </span>

                                <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: '800', color: '#4f46e5', fontSize: '0.95rem' }}>
                                  {evalSheet.overall_score} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ 10</span>
                                </div>
                              </div>
                            </div>

                            {/* Criteria Table if available */}
                            {evalSheet.criteria && evalSheet.criteria.length > 0 && (
                              <div style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                                  Chi tiết điểm theo tiêu chí:
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                  <thead>
                                    <tr style={{ background: '#f8fafc', color: '#64748b' }}>
                                      <th style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '6px 0 0 6px' }}>Tiêu chí</th>
                                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Trọng số</th>
                                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Điểm</th>
                                      <th style={{ padding: '8px 12px', textAlign: 'left', borderRadius: '0 6px 6px 0' }}>Nhận xét tiêu chí</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {evalSheet.criteria.map((crit, cIdx) => (
                                      <tr key={crit.id || cIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: '600', color: '#334155' }}>{crit.criteria_name}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>x{crit.weight}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#4f46e5' }}>{crit.score} / {crit.max_score}</td>
                                        <td style={{ padding: '8px 12px', color: '#64748b', fontStyle: 'italic' }}>{crit.note || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Written Comments */}
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', color: '#334155' }}>
                              <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                Nhận xét tổng quan của người phỏng vấn:
                              </div>
                              <p style={{ margin: '0 0 8px 0', lineHeight: '1.5' }}>
                                {evalSheet.comments || 'Không có nhận xét bổ sung.'}
                              </p>
                              {(evalSheet.strengths || evalSheet.weaknesses) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                                  {evalSheet.strengths && (
                                    <div>
                                      <span style={{ fontWeight: '700', color: '#16a34a' }}>+ Điểm mạnh: </span>
                                      {evalSheet.strengths}
                                    </div>
                                  )}
                                  {evalSheet.weaknesses && (
                                    <div>
                                      <span style={{ fontWeight: '700', color: '#dc2626' }}>- Cần cải thiện: </span>
                                      {evalSheet.weaknesses}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                          Chưa có phiếu đánh giá nào được nộp cho vòng này.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.92rem' }}>
                  Ứng viên này chưa có thông tin vòng phỏng vấn hoặc phiếu đánh giá nào.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEvalRoundNumber(1);
                    setEvalRoundName('Vòng 1: Phỏng vấn đánh giá năng lực');
                    setShowAddEvalModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#4f46e5',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  + Nhập Phiếu Đánh Giá Đầu Tiên
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Hiring Manager Decision & Offer Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Section 1: Quyết định của Trưởng bộ phận */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCheckCircle color="#4f46e5" size={20} /> Quyết Định Tuyển Chọn
            </h2>

            {/* Display Saved Decision If Available and not in editing mode */}
            {candidate.interview_decision && !isEditingDecision ? (
              <div style={{
                background: candidate.interview_decision === 'PASSED' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${candidate.interview_decision === 'PASSED' ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    background: candidate.interview_decision === 'PASSED' ? '#16a34a' : '#dc2626',
                    color: '#ffffff'
                  }}>
                    {candidate.interview_decision === 'PASSED' ? '✓ ĐẠT YÊU CẦU' : '✗ KHÔNG ĐẠT'}
                  </span>

                  <button
                    onClick={() => setIsEditingDecision(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#ede9fe',
                      border: '1px solid #c4b5fd',
                      color: '#4f46e5',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FiEdit3 size={14} /> Thay đổi / Duyệt lại
                  </button>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
                  <strong>Nhận xét của Trưởng bộ phận:</strong>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', marginTop: '6px', fontStyle: 'italic' }}>
                    "{candidate.interview_decision_comment || 'Không có nhận xét bổ sung.'}"
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
                  <div><strong>Người quyết định:</strong> {candidate.decider_name || 'Trưởng bộ phận'} {candidate.decider_job_title ? `(${candidate.decider_job_title})` : ''}</div>
                  <div><strong>Thời gian ghi nhận:</strong> {candidate.interview_decision_at ? new Date(candidate.interview_decision_at).toLocaleString('vi-VN') : 'Vừa xong'}</div>
                </div>
              </div>
            ) : (
              /* Decision Form */
              <form onSubmit={handleDecisionSubmit}>
                {decisionSuccess && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#dcfce7', color: '#15803d', fontSize: '0.85rem', marginBottom: '14px' }}>
                    {decisionSuccess}
                  </div>
                )}

                {/* Warning if sheets are missing */}
                {candidate.is_missing_evaluations && (
                  <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontSize: '0.82rem', marginBottom: '14px' }}>
                    ⚠️ Vòng phỏng vấn đang thiếu phiếu đánh giá. Bạn vẫn có thể ra quyết định nếu có đủ căn cứ chuyên môn.
                  </div>
                )}

                {/* Radio selection buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div
                    onClick={() => setDecision('PASSED')}
                    style={{
                      padding: '16px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${decision === 'PASSED' ? '#16a34a' : '#e2e8f0'}`,
                      background: decision === 'PASSED' ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', color: '#16a34a', fontWeight: '800' }}>✓ ĐẠT</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Đủ điều kiện tạo Offer</div>
                  </div>

                  <div
                    onClick={() => setDecision('FAILED')}
                    style={{
                      padding: '16px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${decision === 'FAILED' ? '#dc2626' : '#e2e8f0'}`,
                      background: decision === 'FAILED' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', color: '#dc2626', fontWeight: '800' }}>✗ KHÔNG ĐẠT</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Loại hồ sơ ứng viên</div>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Nhận xét & Lý do quyết định của Trưởng bộ phận <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết về năng lực ứng viên, mức độ phù hợp và lý do ra quyết định..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Checkbox confirmation */}
                <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="confirmCheck"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    style={{ marginTop: '3px' }}
                    required
                  />
                  <label htmlFor="confirmCheck" style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4', cursor: 'pointer' }}>
                    Tôi xác nhận đã xem xét kỹ điểm số, phiếu đánh giá các vòng và chịu trách nhiệm với quyết định tuyển chọn này.
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {isEditingDecision && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDecision(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Hủy
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={submittingDecision || !decision || !confirmChecked}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: decision === 'PASSED' ? '#16a34a' : (decision === 'FAILED' ? '#dc2626' : '#4f46e5'),
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      cursor: (submittingDecision || !decision || !confirmChecked) ? 'not-allowed' : 'pointer',
                      opacity: (submittingDecision || !decision || !confirmChecked) ? 0.6 : 1,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    {submittingDecision ? 'Đang lưu...' : 'Xác Nhận Quyết Định'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Quản lý Thư mời nhận việc (Offer) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiDollarSign color="#16a34a" size={20} /> Thư Mời Nhận Việc (Offer)
            </h2>

            {/* Offer Condition Banner */}
            {candidate.interview_decision === 'PASSED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#166534',
                  fontSize: '0.84rem'
                }}>
                  <FiUnlock size={18} color="#16a34a" />
                  <span><strong>Đủ điều kiện:</strong> Ứng viên đã có quyết định ĐẠT phỏng vấn, đủ điều kiện phát hành Offer.</span>
                </div>

                {/* If offer already exists */}
                {candidate.offer ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>TRẠNG THÁI OFFER</span>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontWeight: '800',
                        fontSize: '0.75rem'
                      }}>
                        {candidate.offer.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
                      {Number(candidate.offer.salary_amount).toLocaleString()} {candidate.offer.currency || 'VND'}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.5' }}>
                      <div><strong>Ngày bắt đầu:</strong> {candidate.offer.start_date || 'Chưa định ngày'}</div>
                      <div><strong>Hạn phản hồi:</strong> {candidate.offer.response_deadline || 'Chưa định hạn'}</div>
                      {candidate.offer.message && (
                        <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#64748b' }}>
                          "{candidate.offer.message}"
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Button to open Offer creation modal */
                  <button
                    onClick={() => setShowOfferModal(true)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: 'white',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    + Tạo Thư Mời Nhận Việc (Offer)
                  </button>
                )}
              </div>
            ) : (
              /* Blocked / Locked Offer state */
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <FiLock size={20} />
                </div>
                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem', marginBottom: '4px' }}>
                  Chưa Đủ Điều Kiện Tạo Offer
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5' }}>
                  Quy định hệ thống: Chỉ những ứng viên đã được Trưởng bộ phận duyệt <strong>ĐẠT</strong> phỏng vấn mới đủ điều kiện tạo Thư mời nhận việc (Offer).
                </p>
                <button
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#e2e8f0',
                    color: '#94a3b8',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: 'not-allowed',
                    marginTop: '16px'
                  }}
                >
                  🔒 Tạo Offer (Bị khóa)
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal: Tạo Thư mời nhận việc (Offer) */}
      {showOfferModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
              Tạo Thư Mời Nhận Việc (Offer)
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Phát hành thư mời chính thức cho ứng viên <strong>{candidate.full_name}</strong> ({candidate.position_name}).
            </p>

            {candidate.min_salary && candidate.max_salary && (
              <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534', marginBottom: '16px' }}>
                Khung lương chức danh: <strong>{Number(candidate.min_salary).toLocaleString()} - {Number(candidate.max_salary).toLocaleString()} VND</strong>
              </div>
            )}

            {offerError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '14px' }}>
                {offerError}
              </div>
            )}

            <form onSubmit={handleOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Mức lương đề xuất (VND) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="Ví dụ: 18000000"
                  value={offerSalary}
                  onChange={(e) => setOfferSalary(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Ngày nhận việc dự kiến
                  </label>
                  <input
                    type="date"
                    value={offerStartDate}
                    onChange={(e) => setOfferStartDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Hạn chót phản hồi
                  </label>
                  <input
                    type="date"
                    value={offerDeadline}
                    onChange={(e) => setOfferDeadline(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Thông điệp gửi ứng viên
                </label>
                <textarea
                  rows={2}
                  placeholder="Lời chúc mừng và thông điệp chào mừng ứng viên gia nhập công ty..."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingOffer}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#16a34a', color: 'white', fontWeight: '700', cursor: submittingOffer ? 'not-allowed' : 'pointer' }}
                >
                  {submittingOffer ? 'Đang tạo...' : 'Xác Nhận Tạo Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nhập Phiếu Đánh Giá Mới */}
      {showAddEvalModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
              Nhập Phiếu Đánh Giá Phỏng Vấn
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Chấm điểm và ghi nhận xét phỏng vấn cho ứng viên <strong>{candidate.full_name}</strong>.
            </p>

            {evalError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '14px' }}>
                {evalError}
              </div>
            )}

            <form onSubmit={handleAddEvalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Vòng số <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={evalRoundNumber}
                    onChange={(e) => setEvalRoundNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Tên vòng phỏng vấn
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Vòng 1: Đánh giá Kỹ thuật"
                    value={evalRoundName}
                    onChange={(e) => setEvalRoundName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Họ tên người phỏng vấn <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={evalInterviewerName}
                    onChange={(e) => setEvalInterviewerName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Vai trò / Chức danh
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tech Lead / HR"
                    value={evalInterviewerRole}
                    onChange={(e) => setEvalInterviewerRole(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Điểm số (thang 10.0) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={evalScore}
                    onChange={(e) => setEvalScore(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Kết quả đánh giá <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={evalResult}
                    onChange={(e) => setEvalResult(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="PASS">ĐẠT (PASS)</option>
                    <option value="CONSIDER">CÂN NHẮC (CONSIDER)</option>
                    <option value="FAIL">KHÔNG ĐẠT (FAIL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Nhận xét tổng quan của người phỏng vấn
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận xét về chuyên môn, thái độ, mức độ phù hợp..."
                  value={evalComments}
                  onChange={(e) => setEvalComments(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
                    + Điểm mạnh
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nắm chắc kiến thức, giao tiếp tự tin"
                    value={evalStrengths}
                    onChange={(e) => setEvalStrengths(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                    - Cần cải thiện
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cần bổ sung kinh nghiệm thực tế"
                    value={evalWeaknesses}
                    onChange={(e) => setEvalWeaknesses(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddEvalModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingEval}
                  style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: '700', cursor: submittingEval ? 'not-allowed' : 'pointer' }}
                >
                  {submittingEval ? 'Đang lưu...' : 'Lưu Phiếu Đánh Giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateEvaluationDetail;
