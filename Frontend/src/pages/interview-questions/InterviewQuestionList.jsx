import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import interviewQuestionApi from '../../api/interviewQuestionApi';
import jobPositionApi from '../../api/jobPositionApi';
import { AuthContext } from '../../context/AuthContext';

const InterviewQuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [jobPositions, setJobPositions] = useState([]);
  const [criteriaOptions, setCriteriaOptions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasPermission } = useContext(AuthContext);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [positionId, setPositionId] = useState('');
  const [criteriaId, setCriteriaId] = useState('');

  useEffect(() => {
    fetchFiltersData();
    fetchQuestions();
    // eslint-disable-next-line
  }, []);

  const fetchFiltersData = async () => {
    try {
      const [posRes, critRes] = await Promise.all([
        jobPositionApi.getAll({}),
        interviewQuestionApi.getCriteriaOptions()
      ]);
      if (posRes.data.success) {
        setJobPositions(posRes.data.data.data);
      }
      if (critRes.data.success) {
        setCriteriaOptions(critRes.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu bộ lọc', err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (difficulty) params.difficulty = difficulty;
      if (positionId) params.positionId = positionId;
      if (criteriaId) params.criteriaId = criteriaId;

      const response = await interviewQuestionApi.getAll(params);
      if (response.data.success) {
        setQuestions(response.data.data.data);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách câu hỏi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleReset = () => {
    setSearch('');
    setDifficulty('');
    setPositionId('');
    setCriteriaId('');
    setLoading(true);
    interviewQuestionApi.getAll({})
      .then(res => setQuestions(res.data.data.data))
      .catch(() => setError('Lỗi khi tải danh sách câu hỏi.'))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    try {
      await interviewQuestionApi.delete(id);
      fetchQuestions();
    } catch (err) {
      alert('Không thể xóa câu hỏi.');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Ngân Hàng Câu Hỏi</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Quản lý câu hỏi phỏng vấn theo khung năng lực</p>
        </div>
        {hasPermission('USER_CREATE') && (
          <Link to="/interview-questions/create" className="btn-primary" style={{ width: 'auto', textDecoration: 'none', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 10px 20px -10px rgba(59,130,246,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Thêm Câu Hỏi
          </Link>
        )}
      </div>

      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '20px', marginBottom: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm nội dung câu hỏi, gợi ý..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: '#f8fafc', padding: '12px 16px 12px 48px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', width: '100%', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              style={{ background: '#f8fafc', padding: '0 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', cursor: 'pointer', flex: 1, outline: 'none' }}
            >
              <option value="">-- Lọc theo Chức Danh --</option>
              {jobPositions.map(jp => (
                <option key={jp.position_id} value={jp.position_id}>{jp.position_name}</option>
              ))}
            </select>

            <select
              value={criteriaId}
              onChange={(e) => setCriteriaId(e.target.value)}
              style={{ background: '#f8fafc', padding: '0 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', cursor: 'pointer', flex: 1, outline: 'none' }}
            >
              <option value="">-- Lọc theo Tiêu Chí --</option>
              {criteriaOptions.map(c => (
                <option key={c.criteria_id} value={c.criteria_id}>{c.framework_name} - {c.criteria_name}</option>
              ))}
            </select>

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ background: '#f8fafc', padding: '0 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', cursor: 'pointer', flex: '0 0 140px', outline: 'none' }}
            >
              <option value="">Độ Khó</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={handleReset} className="btn-secondary" style={{ padding: '0 24px', height: '44px', borderRadius: '10px', margin: 0 }}>Làm mới</button>
            <button type="submit" className="btn-primary" style={{ padding: '0 24px', height: '44px', borderRadius: '10px', margin: 0 }}>Lọc Dữ Liệu</button>
          </div>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : questions.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📝</div>
            <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Không có câu hỏi nào</h3>
            <p style={{ color: '#64748b' }}>Thử thay đổi bộ lọc hoặc thêm câu hỏi mới vào ngân hàng.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nội Dung Câu Hỏi</th>
                  <th>Tiêu Chí Đánh Giá</th>
                  <th>Mức Độ</th>
                  {hasPermission('USER_UPDATE') && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.question_id}>
                    <td style={{ maxWidth: '400px' }}>
                      <div style={{ fontWeight: '600', color: '#334155', marginBottom: '4px' }}>{q.question_content}</div>
                      {q.good_answer_hint && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          💡 <i>Gợi ý: {q.good_answer_hint}</i>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>{q.criteria_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{q.framework_name}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        q.difficulty_level === 'HARD' ? 'badge-error' : 
                        q.difficulty_level === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {q.difficulty_level === 'HARD' ? 'KHÓ' : q.difficulty_level === 'MEDIUM' ? 'TRUNG BÌNH' : 'DỄ'}
                      </span>
                    </td>
                    {hasPermission('USER_UPDATE') && (
                      <td>
                        <Link to={`/interview-questions/${q.question_id}/edit`} className="action-link" style={{ marginRight: '16px' }}>Sửa</Link>
                        <span className="action-link" style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => handleDelete(q.question_id)}>Xóa</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewQuestionList;
