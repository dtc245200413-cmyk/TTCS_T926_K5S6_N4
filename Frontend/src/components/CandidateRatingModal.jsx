import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import candidateApi from '../api/candidateApi';
import '../styles/candidate-ratings.css';

const stars = [1, 2, 3, 4, 5];

function formatUpdatedAt(value) {
  if (!value) return 'Chưa có thời gian cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có thời gian cập nhật' : date.toLocaleString('vi-VN');
}

export default function CandidateRatingModal({ candidate, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const dialogRef = useRef(null);
  const savingRef = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const characterCount = Array.from(comment).length;
  const tooLong = characterCount > 2000;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoaded(false);
    setError('');
    setRating(0);
    setComment('');
    setRatings([]);
    candidateApi.getRatings(candidate.id, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return;
        const data = response.data.data;
        setRating(data.my_rating?.rating ?? 0);
        setComment(data.my_rating?.comment ?? '');
        setRatings(data.ratings ?? []);
        setLoaded(true);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.response?.data?.message || 'Không thể tải đánh giá. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [candidate.id, loadAttempt]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!savingRef.current) closeRef.current();
      }
      if (event.key === 'Tab') {
        const elements = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'));
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const save = async event => {
    event.preventDefault();
    if (savingRef.current || !loaded) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError('Vui lòng chọn từ 1 đến 5 sao.');
      return;
    }
    if (tooLong) {
      setError('Nhận xét không được vượt quá 2000 ký tự.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const response = await candidateApi.saveMyRating(candidate.id, { rating, comment: comment.trim() });
      onSaved(candidate.id, response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu đánh giá. Vui lòng thử lại.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return createPortal(
    <div className="candidate-rating-overlay">
      <section className="candidate-rating-modal" role="dialog" aria-modal="true" aria-labelledby="candidate-rating-title" tabIndex={-1} ref={dialogRef}>
        <h2 id="candidate-rating-title">Đánh giá ứng viên</h2>
        <p className="candidate-rating-name">{candidate.full_name}</p>
        {loading && <p role="status">Đang tải đánh giá...</p>}
        {error && <p className="candidate-rating-error" role="alert">{error}</p>}
        {!loading && !loaded && <button type="button" className="candidate-rating-button" onClick={() => setLoadAttempt(value => value + 1)}>Thử lại</button>}
        <form onSubmit={save} aria-busy={loading || saving}>
          <fieldset disabled={loading || saving || !loaded} className="candidate-rating-fields">
            <legend>Đánh giá của bạn</legend>
            <div className="candidate-rating-stars" onMouseLeave={() => setHoverRating(0)}>
              {stars.map(value => (
                <label key={value} onMouseEnter={() => setHoverRating(value)}>
                  <input type="radio" name="candidate-rating" value={value} checked={rating === value} onChange={() => { setRating(value); setError(''); }} aria-label={`${value} sao`} />
                  <span aria-hidden="true" className={value <= (hoverRating || rating) ? 'is-selected' : ''}>{value <= (hoverRating || rating) ? '★' : '☆'}</span>
                </label>
              ))}
            </div>
            <p className="candidate-rating-selection" aria-live="polite">Đã chọn: {rating}/5 sao</p>
            <label htmlFor="candidate-rating-comment">Nhận xét nội bộ (không bắt buộc)</label>
            <textarea id="candidate-rating-comment" rows={4} value={comment} onChange={event => setComment(event.target.value)} aria-describedby="candidate-rating-count candidate-rating-limit" aria-invalid={tooLong} placeholder="Nhập nhận xét về ứng viên..." />
            <div id="candidate-rating-count" className={`candidate-rating-count${tooLong ? ' candidate-rating-error' : ''}`}>{characterCount}/2000 ký tự</div>
            <p id="candidate-rating-limit" className={tooLong ? 'candidate-rating-error' : 'candidate-rating-hint'} role={tooLong ? 'alert' : undefined}>
              {tooLong ? 'Nhận xét không được vượt quá 2000 ký tự.' : 'Tối đa 2000 ký tự.'}
            </p>
          </fieldset>
          <div className="candidate-rating-actions">
            <button type="button" className="candidate-rating-button" disabled={saving} onClick={onClose}>Hủy</button>
            <button type="submit" className="candidate-rating-button candidate-rating-primary" disabled={loading || saving || !loaded || tooLong}>{saving ? 'Đang lưu...' : 'Lưu đánh giá'}</button>
          </div>
        </form>
        {loaded && (
          <section className="candidate-rating-history" aria-label="Danh sách đánh giá">
            <h3>Các đánh giá ({ratings.length})</h3>
            {ratings.length === 0 ? <p>Chưa có đánh giá</p> : ratings.map(item => (
              <article key={item.reviewer_id}>
                <strong>{item.reviewer_name}</strong>
                <div className="candidate-rating-display" aria-label={`${item.rating} trên 5 sao`}><span aria-hidden="true">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span> {item.rating}/5</div>
                <p className="candidate-rating-comment-text">{item.comment || 'Không có nhận xét'}</p>
                <small>Cập nhật: {formatUpdatedAt(item.updated_at)}</small>
              </article>
            ))}
          </section>
        )}
      </section>
    </div>, document.body
  );
}
