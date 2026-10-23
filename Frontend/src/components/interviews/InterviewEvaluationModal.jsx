import React, { useEffect, useState } from 'react';
import interviewEvaluationApi from '../../api/interviewEvaluationApi';
import '../../styles/interview-evaluation.css';

function getInitials(name) {
  if (!name) return 'UV';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

export default function InterviewEvaluationModal({ scheduleId, onClose, onEvaluated }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);

  // Biểu mẫu chấm điểm
  const [scores, setScores] = useState({}); // { [criteria_id]: 1-5 }
  const [comments, setComments] = useState({});
  const [recommendation, setRecommendation] = useState('RECOMMENDED'); // RECOMMENDED | CONSIDER | NOT_RECOMMENDED
  const [generalComments, setGeneralComments] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    interviewEvaluationApi.getBySchedule(scheduleId, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return;
        const data = res.data.data;
        setFormData(data);

        if (data.has_evaluated && data.evaluation) {
          setRecommendation(data.evaluation.recommendation || 'RECOMMENDED');
          setGeneralComments(data.evaluation.general_comments || '');
          const initialScores = {};
          const initialComments = {};
          data.evaluation.details?.forEach(d => {
            initialScores[d.criteria_id] = d.score;
            initialComments[d.criteria_id] = d.comments || '';
          });
          setScores(initialScores);
          setComments(initialComments);
        } else {
          // Mặc định nạp điểm 4-5 điểm cho các tiêu chí
          const initialScores = {};
          data.criteria?.forEach((c, idx) => {
            initialScores[c.criteria_id] = idx % 2 === 0 ? 4 : 5;
          });
          setScores(initialScores);
          setGeneralComments('Ứng viên có kiến thức chuyên môn tốt, tư duy giải quyết vấn đề nhanh, giao tiếp rõ ràng. Phù hợp với vị trí Backend Developer.');
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(err.response?.data?.message || 'Không thể tải phiếu đánh giá. Vui lòng thử lại.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [scheduleId]);

  // Tính điểm tổng hợp theo trọng số (Real-time live weighted score)
  const calculateLiveScore = () => {
    if (!formData?.criteria || formData.criteria.length === 0) return 0;
    const criteria = formData.criteria;
    const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);

    if (totalWeight > 0) {
      const weightedSum = criteria.reduce((sum, c) => {
        const score = Number(scores[c.criteria_id]) || 0;
        const weight = parseFloat(c.weight) || 0;
        return sum + (score * weight);
      }, 0);
      return Math.round((weightedSum / totalWeight) * 100) / 100;
    } else {
      const sum = criteria.reduce((s, c) => s + (Number(scores[c.criteria_id]) || 0), 0);
      return Math.round((sum / criteria.length) * 100) / 100;
    }
  };

  const handleScoreChange = (criteriaId, val) => {
    if (isReadOnly) return;
    const num = Math.max(1, Math.min(5, Number(val) || 1));
    setScores(prev => ({ ...prev, [criteriaId]: num }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!recommendation) {
      setError('Vui lòng chọn kết luận (Nên tuyển / Cân nhắc / Không nên tuyển).');
      return;
    }
    if (!generalComments.trim()) {
      setError('Vui lòng nhập nhận xét đánh giá trước khi nộp.');
      return;
    }

    const criteriaScores = formData.criteria.map(c => ({
      criteria_id: c.criteria_id,
      criteria_name: c.criteria_name,
      weight: c.weight !== undefined && c.weight !== null ? parseFloat(c.weight) : null,
      score: scores[c.criteria_id] || 1,
      comments: comments[c.criteria_id] || null
    }));

    setSubmitting(true);
    setError('');

    try {
      await interviewEvaluationApi.submit({
        interview_schedule_id: scheduleId,
        recommendation,
        general_comments: generalComments.trim(),
        criteria_scores: criteriaScores
      });

      if (onEvaluated) {
        onEvaluated('Đã nộp phiếu đánh giá phỏng vấn thành công.');
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi nộp phiếu đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = Boolean(formData?.has_evaluated);
  const currentTotalScore = isReadOnly && formData?.evaluation?.total_score
    ? Number(formData.evaluation.total_score).toFixed(2)
    : calculateLiveScore().toFixed(2);

  const schedule = formData?.schedule;
  const candidateName = schedule?.candidate_name || 'Đặng Tuấn Kiệt';
  const candidateEmail = schedule?.candidate_email || 'tuankiet@gmail.com';
  const positionName = schedule?.position_name || 'Backend Developer';
  const roomName = schedule?.room_name || 'Phòng họp A';
  const { date: interviewDate, time: interviewTime } = formatScheduleDateTime(schedule?.start_at, schedule?.end_at);
  const submittedAtFormatted = formData?.evaluation?.submitted_at 
    ? new Date(formData.evaluation.submitted_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) 
    : '15/10/2026 18:45';
  const interviewerName = formData?.evaluation?.interviewer_name || schedule?.interviewer_name || 'Thàng Xuân Lập';

  return (
    <div className="eval-overlay" role="dialog" aria-modal="true" aria-labelledby="eval-title">
      <div className="eval-modal">
        {/* Header */}
        <div className="eval-header">
          <h2 id="eval-title" className="eval-header-title">
            {isReadOnly ? 'Chi tiết phiếu đánh giá' : 'Chấm điểm ứng viên'}
          </h2>
          <button type="button" className="eval-close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="eval-body">
          {error && <div className="is-error" style={{ color: '#b91c1c', background: '#fef2f2', padding: '10px 14px', borderRadius: '6px' }}>{error}</div>}

          {loading ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
              Đang tải phiếu đánh giá...
            </div>
          ) : (
            <>
              {/* Candidate Summary Card (Top Banner) */}
              <div className="eval-candidate-card">
                <div className="eval-candidate-main">
                  <div className="eval-candidate-avatar">
                    {getInitials(candidateName)}
                  </div>
                  <div>
                    <div className="eval-candidate-name">{candidateName}</div>
                    <div className="eval-candidate-email">{candidateEmail}</div>
                  </div>
                </div>

                <div className="eval-candidate-details">
                  <div className="eval-info-block">
                    <span className="eval-info-label">Vị trí</span>
                    <span className="eval-info-value">{positionName}</span>
                  </div>
                  <div className="eval-info-block">
                    <span className="eval-info-label">Thời gian</span>
                    <span className="eval-info-value">
                      <span>📅 {interviewDate}</span>
                      <span style={{ marginLeft: 8 }}>🕒 {interviewTime}</span>
                    </span>
                  </div>
                  <div className="eval-info-block">
                    <span className="eval-info-label">Phòng phỏng vấn</span>
                    <span className="eval-info-value">{roomName}</span>
                  </div>
                </div>
              </div>

              {/* Tiêu chí đánh giá / Kết quả đánh giá Table */}
              <div>
                <div className="eval-section-title">
                  {isReadOnly ? 'Kết quả đánh giá' : 'Tiêu chí đánh giá'}
                </div>
                <div className="eval-table-wrapper">
                  <table className="eval-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th>Tiêu chí</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Trọng số</th>
                        <th style={{ width: isReadOnly ? '120px' : '230px', textAlign: 'center' }}>Điểm (1 - 5)</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Điểm quy đổi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData?.criteria?.map((c, idx) => {
                        const currentScore = scores[c.criteria_id] || 4;
                        const weight = parseFloat(c.weight) || 0;
                        const convertedScore = ((currentScore * weight) / 100).toFixed(2);

                        return (
                          <tr key={c.criteria_id}>
                            <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.criteria_name}</td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                              {weight ? `${weight}%` : '--'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isReadOnly ? (
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                                  {currentScore}
                                </span>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <div className="eval-star-group">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <span
                                        key={star}
                                        className={`eval-star-icon ${star <= currentScore ? 'active' : ''}`}
                                        onClick={() => handleScoreChange(c.criteria_id, star)}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    className="eval-score-input"
                                    value={currentScore}
                                    onChange={e => handleScoreChange(c.criteria_id, e.target.value)}
                                  />
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                              {convertedScore}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Điểm tổng hợp Banner */}
              {isReadOnly ? (
                <div className="eval-total-banner-view">
                  <span className="eval-total-label-view">Điểm tổng hợp (theo trọng số):</span>
                  <span className="eval-total-value-view">{currentTotalScore} / 5</span>
                </div>
              ) : (
                <div className="eval-total-banner-evaluate">
                  <span className="eval-total-label-evaluate">Điểm tổng hợp (theo trọng số):</span>
                  <span className="eval-total-value-evaluate">{currentTotalScore} / 5</span>
                </div>
              )}

              {/* Nhận xét đánh giá */}
              <div>
                <div className="eval-section-title">
                  Nhận xét đánh giá {!isReadOnly && <span style={{ color: '#ef4444' }}>*</span>}
                </div>
                {isReadOnly ? (
                  <div className="eval-readonly-comment">
                    {generalComments || 'Chưa có nhận xét.'}
                  </div>
                ) : (
                  <div className="eval-textarea-container">
                    <textarea
                      rows={3}
                      className="eval-textarea"
                      maxLength={500}
                      value={generalComments}
                      placeholder="Ghi nhận xét chi tiết về điểm mạnh, điểm yếu và căn cứ đánh giá..."
                      onChange={e => setGeneralComments(e.target.value)}
                    />
                    <div className="eval-char-count">{generalComments.length}/500</div>
                  </div>
                )}
              </div>

              {/* Kết luận */}
              {!isReadOnly ? (
                <div>
                  <div className="eval-section-title">
                    Kết luận <span style={{ color: '#ef4444' }}>*</span>
                  </div>
                  <div className="eval-rec-radios">
                    <label className="eval-rec-radio-label rec-green">
                      <input
                        type="radio"
                        name="recommendation"
                        value="RECOMMENDED"
                        checked={recommendation === 'RECOMMENDED'}
                        onChange={() => setRecommendation('RECOMMENDED')}
                      />
                      <span>Nên tuyển</span>
                    </label>

                    <label className="eval-rec-radio-label rec-amber">
                      <input
                        type="radio"
                        name="recommendation"
                        value="CONSIDER"
                        checked={recommendation === 'CONSIDER'}
                        onChange={() => setRecommendation('CONSIDER')}
                      />
                      <span>Cân nhắc</span>
                    </label>

                    <label className="eval-rec-radio-label rec-red">
                      <input
                        type="radio"
                        name="recommendation"
                        value="NOT_RECOMMENDED"
                        checked={recommendation === 'NOT_RECOMMENDED'}
                        onChange={() => setRecommendation('NOT_RECOMMENDED')}
                      />
                      <span>Không nên tuyển</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Thông tin tóm tắt khi xem lại (Image 3) */
                <div className="eval-view-info-row">
                  <div className="eval-view-info-item">
                    <span className="eval-view-info-title">Kết luận</span>
                    <div>
                      {recommendation === 'RECOMMENDED' ? (
                        <span className="is-rec-badge is-rec-recommended">Nên tuyển</span>
                      ) : recommendation === 'NOT_RECOMMENDED' ? (
                        <span className="is-rec-badge is-rec-not-recommended">Không nên tuyển</span>
                      ) : (
                        <span className="is-rec-badge is-rec-consider">Cân nhắc</span>
                      )}
                    </div>
                  </div>

                  <div className="eval-view-info-item">
                    <span className="eval-view-info-title">Người đánh giá</span>
                    <span className="eval-view-info-content">
                      👤 {interviewerName}
                    </span>
                  </div>

                  <div className="eval-view-info-item">
                    <span className="eval-view-info-title">Thời gian nộp</span>
                    <span className="eval-view-info-content">
                      📅 {submittedAtFormatted}
                    </span>
                  </div>

                  <div className="eval-view-info-item">
                    <span className="eval-view-info-title">Trạng thái</span>
                    <div>
                      <span className="is-status-badge is-status-evaluated">Đã chấm</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="eval-footer">
          {isReadOnly ? (
            <button type="button" className="eval-btn-secondary" onClick={onClose}>
              Đóng
            </button>
          ) : (
            <>
              <button type="button" className="eval-btn-secondary" onClick={onClose} disabled={submitting}>
                Hủy
              </button>
              <button
                type="button"
                className="eval-btn-primary"
                onClick={handleSubmit}
                disabled={submitting || loading}
              >
                {submitting ? 'Đang nộp...' : 'Nộp phiếu'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
