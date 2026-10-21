import React, { useEffect, useState } from 'react';
import interviewEvaluationApi from '../../api/interviewEvaluationApi';
import '../../styles/interview-evaluation.css';

export default function InterviewEvaluationModal({ scheduleId, onClose, onEvaluated }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(null);

  // Trạng thái biểu mẫu chấm điểm
  const [scores, setScores] = useState({}); // { [criteria_id]: 1-5 }
  const [comments, setComments] = useState({}); // { [criteria_id]: string }
  const [recommendation, setRecommendation] = useState(''); // RECOMMENDED | CONSIDER | NOT_RECOMMENDED
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

        // Nếu đã có phiếu đánh giá trước đó, nạp dữ liệu để xem lại
        if (data.has_evaluated && data.evaluation) {
          setRecommendation(data.evaluation.recommendation);
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
          // Khởi tạo điểm mặc định 5 sao cho tất cả tiêu chí
          const initialScores = {};
          data.criteria?.forEach(c => {
            initialScores[c.criteria_id] = 5;
          });
          setScores(initialScores);
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

  // Tính điểm tổng hợp tự động theo thời gian thực (Real-time live weighted score)
  const calculateLiveScore = () => {
    if (!formData?.criteria || formData.criteria.length === 0) return 0;
    const criteria = formData.criteria;
    
    // Kiểm tra xem có trọng số hợp lệ không
    const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
    if (totalWeight > 0) {
      const weightedSum = criteria.reduce((sum, c) => {
        const score = scores[c.criteria_id] || 0;
        const weight = parseFloat(c.weight) || 0;
        return sum + (score * weight);
      }, 0);
      return Math.round((weightedSum / totalWeight) * 100) / 100;
    } else {
      // Trường hợp thiếu trọng số: tính trung bình cộng đơn giản
      const sum = criteria.reduce((s, c) => s + (scores[c.criteria_id] || 0), 0);
      return Math.round((sum / criteria.length) * 100) / 100;
    }
  };

  const handleScoreChange = (criteriaId, value) => {
    if (formData?.has_evaluated) return; // Chế độ xem lại thì không cho sửa
    setScores(prev => ({ ...prev, [criteriaId]: value }));
  };

  const handleCriteriaCommentChange = (criteriaId, value) => {
    if (formData?.has_evaluated) return;
    setComments(prev => ({ ...prev, [criteriaId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData?.has_evaluated || !formData?.can_evaluate) return;

    // Kiểm tra các trường bắt buộc
    if (!recommendation) {
      setError('Vui lòng chọn kết luận phỏng vấn (Nên tuyển / Cân nhắc / Không nên tuyển).');
      return;
    }

    if (!generalComments.trim()) {
      setError('Vui lòng nhập nhận xét và căn cứ đánh giá tổng hợp trước khi nộp.');
      return;
    }

    // Chuẩn bị payload chi tiết từng tiêu chí
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

  const isReadOnly = formData?.has_evaluated || !formData?.can_evaluate;
  const currentLiveScore = formData?.has_evaluated && formData?.evaluation?.total_score
    ? Number(formData.evaluation.total_score).toFixed(2)
    : calculateLiveScore().toFixed(2);

  return (
    <div className="eval-overlay" role="dialog" aria-modal="true" aria-labelledby="eval-title">
      <div className="eval-modal">
        {/* Header */}
        <div className="eval-header">
          <div>
            <h2 id="eval-title" className="eval-header-title">
              {formData?.has_evaluated ? 'Xem lại phiếu đánh giá phỏng vấn' : 'Phiếu đánh giá phỏng vấn theo khung năng lực'}
            </h2>
            {formData?.schedule && (
              <div className="eval-header-meta">
                <span className="eval-meta-tag">
                  👤 Ứng viên: <strong>{formData.schedule.candidate_name}</strong>
                </span>
                <span className="eval-meta-tag">
                  💼 Vị trí: <strong>{formData.schedule.position_name}</strong>
                </span>
                <span className="eval-meta-tag">
                  🎯 Vòng: <strong>{formData.schedule.round_name || `Vòng ${formData.schedule.round_number}`}</strong>
                </span>
                <span className="eval-meta-tag">
                  🧑‍💻 Người phỏng vấn: <strong>{formData.schedule.interviewer_name}</strong>
                </span>
              </div>
            )}
          </div>
          <button type="button" className="eval-close-btn" onClick={onClose} aria-label="Đóng modal">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="eval-body">
          {error && <div className="is-error" role="alert">{error}</div>}

          {loading ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#64748b' }}>
              Đang tải khung năng lực và thông tin phiếu đánh giá...
            </div>
          ) : (
            <>
              {/* Banner trạng thái nếu đã nộp */}
              {formData?.has_evaluated && (
                <div className="eval-submitted-banner">
                  <span style={{ fontSize: '1.25rem' }}>✅</span>
                  <div>
                    <strong>Phiếu đánh giá đã được nộp và chốt kết quả</strong>
                    <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                      Được lưu bởi người chấm: {formData.evaluation?.interviewer_name} vào lúc {new Date(formData.evaluation?.submitted_at).toLocaleString('vi-VN')}.
                    </div>
                  </div>
                </div>
              )}

              {/* Cảnh báo nếu không phải người phỏng vấn được phân công */}
              {!formData?.has_evaluated && !formData?.is_assigned_interviewer && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 8, fontSize: '0.875rem' }}>
                  ⚠️ Bạn không phải là người phỏng vấn được phân công cho buổi này. Chỉ người phỏng vấn được phân công mới có quyền chấm và nộp phiếu.
                </div>
              )}

              {/* Bảng chấm điểm theo tiêu chí năng lực */}
              <section aria-label="Khung tiêu chí đánh giá">
                <div className="eval-section-title">
                  <span>Tiêu chí đánh giá & Trọng số</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b', textTransform: 'none' }}>
                    {formData?.criteria?.length || 0} tiêu chí năng lực
                  </span>
                </div>

                <div className="eval-criteria-list">
                  {formData?.criteria?.map(c => {
                    const currentScore = scores[c.criteria_id] || 0;
                    return (
                      <div key={c.criteria_id} className="eval-criteria-card">
                        <div className="eval-criteria-header">
                          <div>
                            <h4 className="eval-criteria-name">{c.criteria_name}</h4>
                            {c.description && <p className="eval-criteria-desc">{c.description}</p>}
                          </div>
                          {c.weight !== null && c.weight !== undefined && (
                            <span className="eval-weight-badge">
                              Trọng số: {Number(c.weight)}%
                            </span>
                          )}
                        </div>

                        {/* Thanh chấm sao 1-5 */}
                        <div className="eval-rating-row">
                          <span style={{ fontSize: '0.85rem', color: '#475569' }}>Điểm đánh giá:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="eval-stars-group">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button
                                  key={star}
                                  type="button"
                                  className={`eval-star-btn ${star <= currentScore ? 'is-active' : ''}`}
                                  disabled={isReadOnly}
                                  onClick={() => handleScoreChange(c.criteria_id, star)}
                                  title={`${star} sao`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <span className="eval-star-label">{currentScore} / 5</span>
                          </div>
                        </div>

                        {/* Ô nhận xét tiêu chí */}
                        <input
                          type="text"
                          className="eval-criteria-comment-input"
                          placeholder={isReadOnly ? 'Không có nhận xét chi tiết' : 'Nhận xét chi tiết cho tiêu chí này (tùy chọn)...'}
                          value={comments[c.criteria_id] || ''}
                          disabled={isReadOnly}
                          onChange={e => handleCriteriaCommentChange(c.criteria_id, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Thẻ tổng hợp điểm theo trọng số */}
              <div className="eval-summary-card">
                <div>
                  <h4 className="eval-summary-title">Điểm tổng hợp</h4>
                  <p className="eval-summary-rule">
                    {formData?.criteria?.some(c => parseFloat(c.weight) > 0)
                      ? 'Được tính tự động theo trọng số phần trăm của khung năng lực'
                      : 'Được tính theo điểm trung bình cộng số học của các tiêu chí'}
                  </p>
                </div>
                <div className="eval-summary-score">
                  {currentLiveScore} <small>/ 5.0 ⭐</small>
                </div>
              </div>

              {/* Phần kết luận: Nên tuyển / Cân nhắc / Không nên tuyển */}
              <section aria-label="Kết luận phỏng vấn">
                <div className="eval-section-title">
                  <span>Kết luận phỏng vấn <span style={{ color: '#ef4444' }}>*</span></span>
                </div>

                <div className="eval-recommendation-group">
                  <div
                    className={`eval-rec-option ${recommendation === 'RECOMMENDED' ? 'is-selected rec-recommended' : ''}`}
                    onClick={() => !isReadOnly && setRecommendation('RECOMMENDED')}
                    style={isReadOnly ? { cursor: 'default' } : {}}
                  >
                    <div className="eval-rec-title">🟢 Nên tuyển</div>
                    <div className="eval-rec-desc">Ứng viên đáp ứng tốt năng lực</div>
                  </div>

                  <div
                    className={`eval-rec-option ${recommendation === 'CONSIDER' ? 'is-selected rec-consider' : ''}`}
                    onClick={() => !isReadOnly && setRecommendation('CONSIDER')}
                    style={isReadOnly ? { cursor: 'default' } : {}}
                  >
                    <div className="eval-rec-title">🟡 Cân nhắc</div>
                    <div className="eval-rec-desc">Cần xem xét thêm hoặc phỏng vấn lại</div>
                  </div>

                  <div
                    className={`eval-rec-option ${recommendation === 'NOT_RECOMMENDED' ? 'is-selected rec-not-recommended' : ''}`}
                    onClick={() => !isReadOnly && setRecommendation('NOT_RECOMMENDED')}
                    style={isReadOnly ? { cursor: 'default' } : {}}
                  >
                    <div className="eval-rec-title">🔴 Không nên tuyển</div>
                    <div className="eval-rec-desc">Chưa đạt tiêu chuẩn yêu cầu</div>
                  </div>
                </div>
              </section>

              {/* Nhận xét và căn cứ đánh giá tổng quát */}
              <section aria-label="Nhận xét tổng quát">
                <div className="eval-section-title">
                  <span>Nhận xét & Căn cứ đánh giá <span style={{ color: '#ef4444' }}>*</span></span>
                </div>
                <textarea
                  className="eval-general-comments"
                  rows={3}
                  placeholder={isReadOnly ? '' : 'Ghi rõ nhận xét chi tiết về điểm mạnh, điểm yếu và căn cứ đưa ra kết luận (Bắt buộc)...'}
                  value={generalComments}
                  disabled={isReadOnly}
                  onChange={e => setGeneralComments(e.target.value)}
                />
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="eval-footer">
          <button type="button" className="eval-btn-cancel" onClick={onClose}>
            {formData?.has_evaluated ? 'Đóng' : 'Hủy bỏ'}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              className="eval-btn-submit"
              disabled={submitting || loading}
              onClick={handleSubmit}
            >
              {submitting ? 'Đang nộp...' : '✓ Nộp phiếu đánh giá'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
