import React, { useState, useEffect, useContext, useCallback } from 'react';
import questionApi from '../../api/questionApi';
import { AuthContext } from '../../context/AuthContext';
import '../../styles/global.css';

const QuestionBank = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN' || r.role_code === 'HR_MANAGER');

  // Question list state
  const [questions, setQuestions] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]);
  const [stats, setStats] = useState({ total: 0, easyCount: 0, mediumCount: 0, hardCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Filter & Pagination state
  const [search, setSearch] = useState('');
  const [selectedCriteria, setSelectedCriteria] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null = add new, object = edit
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form inputs
  const [formData, setFormData] = useState({
    competency_criteria_id: '',
    difficulty_level: 'Medium',
    question_text: '',
    sample_answer: ''
  });

  // View Detail Modal State
  const [viewingQuestion, setViewingQuestion] = useState(null);

  // Delete Confirm Modal State
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch criteria list on mount
  const fetchCriteria = async () => {
    try {
      const res = await questionApi.getCriteria();
      if (res.data.success) {
        setCriteriaList(res.data.data);
      }
    } catch (err) {
      console.error('Không thể tải danh sách tiêu chí:', err);
    }
  };

  // Fetch questions list
  const fetchQuestions = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: currentPage,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCriteria) params.competency_criteria_id = selectedCriteria;
      if (selectedDifficulty) params.difficulty_level = selectedDifficulty;

      const res = await questionApi.getAll(params);
      if (res.data.success) {
        const payload = res.data.data;
        setQuestions(payload.questions || []);
        if (payload.pagination) {
          setTotalPages(payload.pagination.totalPages || 1);
          setTotalRecords(payload.pagination.total || 0);
          setPage(payload.pagination.page || 1);
        }
        if (payload.stats) {
          setStats(payload.stats);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedCriteria, selectedDifficulty]);

  useEffect(() => {
    fetchCriteria();
  }, []);

  useEffect(() => {
    fetchQuestions(1);
  }, [selectedCriteria, selectedDifficulty, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchQuestions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCriteria('');
    setSelectedDifficulty('');
    setPage(1);
    // Directly fetch without filters
    setLoading(true);
    questionApi.getAll({ page: 1, limit })
      .then(res => {
        if (res.data.success) {
          setQuestions(res.data.data.questions || []);
          setTotalPages(res.data.data.pagination.totalPages || 1);
          setTotalRecords(res.data.data.pagination.total || 0);
          setPage(1);
          if (res.data.data.stats) setStats(res.data.data.stats);
        }
      })
      .catch(() => setError('Lỗi khi đặt lại bộ lọc.'))
      .finally(() => setLoading(false));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      competency_criteria_id: criteriaList.length > 0 ? criteriaList[0].criteria_id : '',
      difficulty_level: 'Medium',
      question_text: '',
      sample_answer: ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (q) => {
    setEditingQuestion(q);
    setFormData({
      competency_criteria_id: q.competency_criteria_id || '',
      difficulty_level: q.difficulty_level || 'Medium',
      question_text: q.question_text || '',
      sample_answer: q.sample_answer || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Handle Form Submit (Add or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.competency_criteria_id) {
      setFormError('Vui lòng chọn tiêu chí năng lực.');
      return;
    }
    if (!formData.question_text.trim() || formData.question_text.trim().length < 5) {
      setFormError('Nội dung câu hỏi phải có ít nhất 5 ký tự.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingQuestion) {
        // Update
        const res = await questionApi.update(editingQuestion.id, formData);
        if (res.data.success) {
          showToast('Cập nhật câu hỏi thành công!', 'success');
          setShowFormModal(false);
          fetchQuestions(page);
        }
      } else {
        // Create
        const res = await questionApi.create(formData);
        if (res.data.success) {
          showToast('Thêm câu hỏi mới vào ngân hàng thành công!', 'success');
          setShowFormModal(false);
          fetchQuestions(1);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu câu hỏi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingQuestion) return;
    setDeleteSubmitting(true);
    try {
      const res = await questionApi.delete(deletingQuestion.id);
      if (res.data.success) {
        showToast(`Đã xóa câu hỏi #${deletingQuestion.id} thành công!`, 'success');
        setDeletingQuestion(null);
        fetchQuestions(page);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi xóa câu hỏi.', 'error');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Helper badge style
  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'Easy':
        return <span className="badge badge-success" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>🟢 Dễ (Easy)</span>;
      case 'Medium':
        return <span className="badge badge-warning" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>🟡 Trung bình (Medium)</span>;
      case 'Hard':
        return <span className="badge badge-error" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔴 Khó (Hard)</span>;
      default:
        return <span className="badge">{diff}</span>;
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '14px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: '600',
          fontSize: '0.95rem',
          animation: 'slideUpFade 0.3s ease forwards'
        }}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
            Quản Lý Ngân Hàng Câu Hỏi
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '0.95rem' }}>
            Hệ thống quản lý câu hỏi phỏng vấn chuẩn hóa theo khung tiêu chí năng lực và độ khó (SCRUM-73/74/75)
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 20px -10px rgba(79, 70, 229, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> Thêm Câu Hỏi Mới
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Tổng Số Câu Hỏi</span>
            <span style={{ fontSize: '1.3rem' }}>📚</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>{stats.total || totalRecords}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Ngân hàng dùng chung toàn công ty</div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Mức Độ Dễ (Easy)</span>
            <span style={{ fontSize: '1.3rem' }}>🟢</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669' }}>{stats.easyCount || 0}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Đánh giá kiến thức nền tảng</div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Trung Bình (Medium)</span>
            <span style={{ fontSize: '1.3rem' }}>🟡</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706' }}>{stats.mediumCount || 0}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Đánh giá kinh nghiệm thực tế</div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Mức Độ Khó (Hard)</span>
            <span style={{ fontSize: '1.3rem' }}>🔴</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#dc2626' }}>{stats.hardCount || 0}</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Thử thách chuyên sâu & Senior</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm nội dung câu hỏi, đáp án gợi ý hoặc tiêu chí..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: '#f8fafc',
                padding: '12px 16px 12px 48px',
                height: '48px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '0.95rem',
                width: '100%'
              }}
            />
          </div>

          {/* Criteria Filter */}
          <div style={{ flex: '0 0 260px' }}>
            <select
              className="form-control"
              value={selectedCriteria}
              onChange={(e) => setSelectedCriteria(e.target.value)}
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                height: '48px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '0.95rem',
                width: '100%'
              }}
            >
              <option value="">-- Tất cả tiêu chí năng lực --</option>
              {criteriaList.map((c) => (
                <option key={c.criteria_id} value={c.criteria_id}>
                  {c.framework_name ? `[${c.framework_name}] ` : ''}{c.criteria_name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div style={{ flex: '0 0 180px' }}>
            <select
              className="form-control"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              style={{
                background: '#f8fafc',
                padding: '12px 16px',
                height: '48px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '0.95rem',
                width: '100%'
              }}
            >
              <option value="">-- Mức độ khó --</option>
              <option value="Easy">🟢 Dễ (Easy)</option>
              <option value="Medium">🟡 Trung bình (Medium)</option>
              <option value="Hard">🔴 Khó (Hard)</option>
            </select>
          </div>

          {/* Buttons */}
          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              marginTop: 0,
              cursor: 'pointer'
            }}
          >
            Tìm kiếm
          </button>

          {(search || selectedCriteria || selectedDifficulty) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-secondary"
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              🔄 Đặt lại
            </button>
          )}
        </form>
      </div>

      {/* Main Content Table Area */}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.03)' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>#ID</th>
                <th style={{ width: '220px' }}>Tiêu chí năng lực</th>
                <th style={{ width: '150px' }}>Độ khó</th>
                <th>Nội dung câu hỏi</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Đáp án gợi ý</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                    <div style={{ display: 'inline-block', fontSize: '1.8rem', animation: 'spin 1s linear infinite' }}>⏳</div>
                    <div style={{ marginTop: '12px', fontWeight: '500' }}>Đang tải danh sách câu hỏi...</div>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '6px' }}>Không tìm thấy câu hỏi nào</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                      {search || selectedCriteria || selectedDifficulty ? 'Không có câu hỏi nào khớp với bộ lọc hiện tại.' : 'Ngân hàng câu hỏi hiện đang trống.'}
                    </p>
                    {(search || selectedCriteria || selectedDifficulty) ? (
                      <button onClick={handleResetFilters} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
                        Xóa bộ lọc
                      </button>
                    ) : (
                      <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                        + Thêm câu hỏi đầu tiên
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td style={{ textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '0.9rem' }}>
                      #{q.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>
                        {q.criteria_name || `Tiêu chí #${q.competency_criteria_id}`}
                      </div>
                      {q.framework_name && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📂</span> {q.framework_name}
                        </div>
                      )}
                    </td>
                    <td>
                      {getDifficultyBadge(q.difficulty_level)}
                    </td>
                    <td>
                      <div style={{
                        color: '#1e293b',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {q.question_text}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {q.sample_answer ? (
                        <button
                          onClick={() => setViewingQuestion(q)}
                          style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            border: '1px solid #c7d2fe',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#c7d2fe'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#e0e7ff'}
                        >
                          👁️ Xem đáp án
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                          onClick={() => setViewingQuestion(q)}
                          title="Xem chi tiết"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          🔍
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(q)}
                          title="Chỉnh sửa câu hỏi"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            color: '#2563eb',
                            transition: 'all 0.2s'
                          }}
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => setDeletingQuestion(q)}
                          title="Xóa câu hỏi"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            width: '34px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            color: '#dc2626',
                            transition: 'all 0.2s'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalRecords > 0 && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#fafafa'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Hiển thị <strong>{((page - 1) * limit) + 1}</strong> - <strong>{Math.min(page * limit, totalRecords)}</strong> trong tổng số <strong>{totalRecords}</strong> câu hỏi
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="5">5 / trang</option>
                <option value="10">10 / trang</option>
                <option value="20">20 / trang</option>
                <option value="50">50 / trang</option>
              </select>

              <button
                onClick={() => { const p = page - 1; setPage(p); fetchQuestions(p); }}
                disabled={page <= 1}
                className="btn-secondary"
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Trước
              </button>

              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b', padding: '0 8px' }}>
                Trang {page} / {totalPages}
              </span>

              <button
                onClick={() => { const p = page + 1; setPage(p); fetchQuestions(p); }}
                disabled={page >= totalPages}
                className="btn-secondary"
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Sau ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: THÊM / SỬA CÂU HỎI ── */}
      {showFormModal && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%', borderRadius: '20px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {editingQuestion ? `Chỉnh Sửa Câu Hỏi #${editingQuestion.id}` : 'Thêm Câu Hỏi Phỏng Vấn Mới'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Điền thông tin chi tiết và tiêu chuẩn gợi ý đánh giá ứng viên
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {formError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              {/* Tiêu chí năng lực */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
                  Tiêu chí năng lực <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={formData.competency_criteria_id}
                  onChange={(e) => setFormData({ ...formData, competency_criteria_id: e.target.value })}
                  required
                  style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Chọn tiêu chí năng lực liên kết --</option>
                  {criteriaList.map((c) => (
                    <option key={c.criteria_id} value={c.criteria_id}>
                      {c.framework_name ? `[${c.framework_name}] ` : ''}{c.criteria_name} ({c.weight}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Mức độ khó */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
                  Mức độ khó <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { val: 'Easy', label: 'Dễ (Easy)', icon: '🟢', bg: '#ecfdf5', border: '#a7f3d0' },
                    { val: 'Medium', label: 'Trung bình (Medium)', icon: '🟡', bg: '#fffbeb', border: '#fde68a' },
                    { val: 'Hard', label: 'Khó (Hard)', icon: '🔴', bg: '#fef2f2', border: '#fecaca' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty_level: item.val })}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: formData.difficulty_level === item.val ? '2px solid #4f46e5' : `1px solid ${item.border}`,
                        background: formData.difficulty_level === item.val ? '#eef2ff' : item.bg,
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
                  Nội dung câu hỏi <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Nhập nội dung câu hỏi phỏng vấn rõ ràng, súc tích..."
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  required
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Đáp án gợi ý */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.9rem', color: '#334155' }}>
                  Đáp án gợi ý cho Người phỏng vấn (Sample Answer / Hint)
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Gợi ý các ý chính ứng viên cần trả lời, tiêu chí đạt yêu cầu hoặc mô hình STAR..."
                  value={formData.sample_answer}
                  onChange={(e) => setFormData({ ...formData, sample_answer: e.target.value })}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="btn-secondary"
                  style={{ borderRadius: '12px', padding: '12px 24px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary"
                  style={{
                    borderRadius: '12px',
                    padding: '12px 28px',
                    width: 'auto',
                    marginTop: 0,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {formSubmitting ? 'Đang lưu...' : (editingQuestion ? 'Lưu Thay Đổi' : 'Tạo Câu Hỏi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XEM CHI TIẾT CÂU HỎI & ĐÁP ÁN GỢI Ý ── */}
      {viewingQuestion && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%', borderRadius: '20px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                  Chi Tiết Câu Hỏi #{viewingQuestion.id}
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                  {viewingQuestion.criteria_name || 'Thông tin câu hỏi'}
                </h2>
              </div>
              <button
                onClick={() => setViewingQuestion(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
              {getDifficultyBadge(viewingQuestion.difficulty_level)}
              {viewingQuestion.framework_name && (
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>
                  📂 {viewingQuestion.framework_name}
                </span>
              )}
            </div>

            {/* Nội dung câu hỏi */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                ❓ Nội dung câu hỏi:
              </div>
              <div style={{
                background: '#f8fafc',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '1.05rem',
                fontWeight: '600',
                color: '#0f172a',
                lineHeight: '1.6'
              }}>
                {viewingQuestion.question_text}
              </div>
            </div>

            {/* Đáp án gợi ý */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  💡 Đáp án gợi ý / Chuẩn đánh giá:
                </div>
                {viewingQuestion.sample_answer && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewingQuestion.sample_answer);
                      showToast('Đã sao chép đáp án vào clipboard!', 'success');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    📋 Sao chép
                  </button>
                )}
              </div>
              <div style={{
                background: '#f0fdf4',
                padding: '18px 20px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                fontSize: '0.95rem',
                color: '#166534',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {viewingQuestion.sample_answer || 'Chưa có đáp án gợi ý cho câu hỏi này.'}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  const q = viewingQuestion;
                  setViewingQuestion(null);
                  handleOpenEditModal(q);
                }}
                className="btn-primary"
                style={{
                  borderRadius: '12px',
                  padding: '10px 20px',
                  width: 'auto',
                  marginTop: 0,
                  cursor: 'pointer'
                }}
              >
                ✏️ Chỉnh Sửa
              </button>
              <button
                onClick={() => setViewingQuestion(null)}
                className="btn-secondary"
                style={{ borderRadius: '12px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN XÓA CÂU HỎI ── */}
      {deletingQuestion && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content" style={{ maxWidth: '440px', width: '90%', borderRadius: '20px', padding: '28px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 16px auto' }}>
              ⚠️
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              Xác Nhận Xóa Câu Hỏi?
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Bạn có chắc chắn muốn xóa câu hỏi <strong>#{deletingQuestion.id}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{
              background: '#f8fafc',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#334155',
              textAlign: 'left',
              marginBottom: '24px',
              border: '1px solid #e2e8f0',
              maxHeight: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              "{deletingQuestion.question_text}"
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="btn-secondary"
                disabled={deleteSubmitting}
                style={{ borderRadius: '12px', padding: '10px 20px', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="btn-danger"
                style={{
                  borderRadius: '12px',
                  padding: '10px 24px',
                  cursor: deleteSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
