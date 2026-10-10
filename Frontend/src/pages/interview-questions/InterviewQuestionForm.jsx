import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import interviewQuestionApi from '../../api/interviewQuestionApi';

const InterviewQuestionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    criteria_id: '',
    question_content: '',
    difficulty_level: 'MEDIUM',
    good_answer_hint: ''
  });

  const [criteriaOptions, setCriteriaOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCriteriaOptions();
    if (isEditMode) {
      fetchQuestion();
    }
  }, [id]);

  const fetchCriteriaOptions = async () => {
    try {
      const res = await interviewQuestionApi.getCriteriaOptions();
      if (res.data.success) {
        setCriteriaOptions(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tiêu chí', err);
    }
  };

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const res = await interviewQuestionApi.getById(id);
      const data = res.data.data;
      setFormData({
        criteria_id: data.criteria_id,
        question_content: data.question_content,
        difficulty_level: data.difficulty_level,
        good_answer_hint: data.good_answer_hint || ''
      });
    } catch (err) {
      setError('Không thể tải thông tin câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        criteriaId: formData.criteria_id ? Number(formData.criteria_id) : null,
        questionContent: formData.question_content,
        difficultyLevel: formData.difficulty_level,
        goodAnswerHint: formData.good_answer_hint,
        
        // for update compatibility
        criteria_id: formData.criteria_id ? Number(formData.criteria_id) : null,
        question_content: formData.question_content,
        difficulty_level: formData.difficulty_level,
        good_answer_hint: formData.good_answer_hint
      };

      if (isEditMode) {
        await interviewQuestionApi.update(id, payload);
      } else {
        await interviewQuestionApi.create(payload);
      }
      navigate('/interview-questions');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải...</div>;
  }

  // Group criteria by framework for better UI
  const groupedCriteria = criteriaOptions.reduce((acc, curr) => {
    if (!acc[curr.framework_name]) acc[curr.framework_name] = [];
    acc[curr.framework_name].push(curr);
    return acc;
  }, {});

  return (
    <div style={{ width: '100%', padding: '20px' }}>
      <div className="g-page-header">
        <div>
          <h1 className="g-page-title">
            {isEditMode ? 'Cập Nhật Câu Hỏi' : 'Thêm Mới Câu Hỏi'}
          </h1>
          <p className="g-page-subtitle">
            {isEditMode ? 'Chỉnh sửa nội dung và gợi ý trả lời' : 'Biên soạn câu hỏi phỏng vấn theo tiêu chí năng lực'}
          </p>
        </div>
        <Link to="/interview-questions" className="g-btn-secondary">
          ⬅ Quay lại
        </Link>
      </div>

      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px -15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        {error && (
          <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Tiêu Chí Đánh Giá <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="criteria_id"
                value={formData.criteria_id}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
              >
                <option value="">-- Chọn Tiêu chí --</option>
                {Object.keys(groupedCriteria).map(framework => (
                  <optgroup key={framework} label={`Khung: ${framework}`}>
                    {groupedCriteria[framework].map(c => (
                      <option key={c.criteria_id} value={c.criteria_id}>{c.criteria_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                Độ Khó <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
              Nội dung câu hỏi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              name="question_content"
              value={formData.question_content}
              onChange={handleChange}
              required
              rows="3"
              placeholder="Nhập câu hỏi phỏng vấn. VD: Bạn hãy kể về một dự án khó nhất bạn từng làm..."
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
            ></textarea>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
              <span>💡</span> Gợi ý câu trả lời tốt
            </label>
            <textarea
              name="good_answer_hint"
              value={formData.good_answer_hint}
              onChange={handleChange}
              rows="4"
              placeholder="Ghi chú các điểm cần có trong câu trả lời xuất sắc để người phỏng vấn dễ chấm điểm..."
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', outline: 'none', resize: 'vertical' }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
            <Link to="/interview-questions" style={{ padding: '14px 28px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontWeight: '600', textDecoration: 'none', transition: 'background 0.2s' }}>
              Hủy Bỏ
            </Link>
            <button type="submit" disabled={loading} style={{ padding: '14px 28px', borderRadius: '12px', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Đang xử lý...' : 'Lưu Câu Hỏi'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default InterviewQuestionForm;
