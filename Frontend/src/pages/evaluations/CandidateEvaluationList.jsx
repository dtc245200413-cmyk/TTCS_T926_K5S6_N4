import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiUsers, FiCheckCircle, FiXCircle, FiClock, 
  FiAlertTriangle, FiSearch, FiChevronRight, FiFilter,
  FiAward, FiShield, FiFileText, FiRefreshCw
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';
import candidateEvaluationApi from '../../api/candidateEvaluationApi';

const CandidateEvaluationList = () => {
  const { user } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, PENDING, PASSED, FAILED, MISSING

  const isHiringManager = user?.roles?.some(r => r.role_code === 'HIRING_MANAGER');

  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await candidateEvaluationApi.getAll();
      setCandidates(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể tải danh sách ứng viên đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Bộ lọc danh sách
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.position_name && c.position_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'PENDING') {
      return !c.interview_decision;
    }
    if (activeTab === 'PASSED') {
      return c.interview_decision === 'PASSED';
    }
    if (activeTab === 'FAILED') {
      return c.interview_decision === 'FAILED';
    }
    if (activeTab === 'MISSING') {
      return c.is_missing_evaluations;
    }
    return true;
  });

  // KPI Metrics
  const totalCount = candidates.length;
  const pendingCount = candidates.filter(c => !c.interview_decision).length;
  const passedCount = candidates.filter(c => c.interview_decision === 'PASSED').length;
  const missingCount = candidates.filter(c => c.is_missing_evaluations).length;

  return (
    <div style={{ padding: '28px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 70px)' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: 'white',
        padding: '28px 32px',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '600',
              backdropFilter: 'blur(4px)',
              letterSpacing: '0.5px'
            }}>
              {isHiringManager ? 'DÀNH CHO TRƯỞNG BỘ PHẬN' : 'QUẢN LÝ ĐÁNH GIÁ TUYỂN CHỌN'}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
              • Hệ thống phân quyền nội bộ
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            Đánh Giá Phỏng Vấn & Quyết Định Tuyển Chọn
          </h1>
          <p style={{ margin: '8px 0 0', color: '#e0e7ff', fontSize: '0.95rem', maxWidth: '650px' }}>
            Xem điểm số chi tiết từng vòng, tổng hợp các phiếu đánh giá (không đếm trùng), cảnh báo phiếu còn thiếu và đưa ra quyết định Đạt / Không đạt để tuyển chọn ứng viên.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '14px 20px',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: '600' }}>
            Phạm vi quản lý
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiShield size={16} color="#38bdf8" />
            {isHiringManager ? 'Bộ phận trực thuộc của bạn' : 'Toàn quyền quản trị'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
            Chỉ hiển thị ứng viên thuộc vị trí / bộ phận có quyền quản lý
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiUsers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>TỔNG ỨNG VIÊN</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{totalCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiClock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>CHỜ DUYỆT KẾT QUẢ</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#d97706' }}>{pendingCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiCheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>ĐẠT (ĐỦ ĐIỀU KIỆN OFFER)</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#16a34a' }}>{passedCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiAlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>THIẾU PHIẾU ĐÁNH GIÁ</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#dc2626' }}>{missingCount}</div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ background: 'white', borderRadius: '18px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button
              onClick={() => setActiveTab('ALL')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'ALL' ? '#ffffff' : 'transparent',
                color: activeTab === 'ALL' ? '#1e293b' : '#64748b',
                boxShadow: activeTab === 'ALL' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Tất cả ({candidates.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'PENDING' ? '#ffffff' : 'transparent',
                color: activeTab === 'PENDING' ? '#d97706' : '#64748b',
                boxShadow: activeTab === 'PENDING' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Chờ quyết định ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('PASSED')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'PASSED' ? '#ffffff' : 'transparent',
                color: activeTab === 'PASSED' ? '#16a34a' : '#64748b',
                boxShadow: activeTab === 'PASSED' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Đạt ({passedCount})
            </button>
            <button
              onClick={() => setActiveTab('FAILED')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'FAILED' ? '#ffffff' : 'transparent',
                color: activeTab === 'FAILED' ? '#dc2626' : '#64748b',
                boxShadow: activeTab === 'FAILED' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Không đạt ({candidates.filter(c => c.interview_decision === 'FAILED').length})
            </button>
            <button
              onClick={() => setActiveTab('MISSING')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'MISSING' ? '#ffffff' : 'transparent',
                color: activeTab === 'MISSING' ? '#b91c1c' : '#64748b',
                boxShadow: activeTab === 'MISSING' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Thiếu phiếu ({missingCount})
            </button>
          </div>

          {/* Search bar & Refresh */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm họ tên, vị trí, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={fetchCandidates}
              title="Tải lại danh sách"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              <FiRefreshCw size={14} /> Làm mới
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Candidates Table */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>Đang tải danh sách ứng viên đánh giá...</div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <FiUsers size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#334155' }}>Không có ứng viên nào phù hợp</div>
            <p style={{ margin: '6px 0 0', fontSize: '0.88rem' }}>
              {isHiringManager 
                ? 'Không tìm thấy ứng viên trong bộ phận bạn quản lý phù hợp với điều kiện lọc.'
                : 'Thử thay đổi từ khóa tìm kiếm hoặc chọn tab bộ lọc khác.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Ứng Viên</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Vị Trí & Bộ Phận</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tiến Độ Vòng</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Điểm Tổng Hợp</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Tình Trạng Phiếu</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Quyết Định Trưởng BP</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Điều Kiện Offer</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map(cand => (
                  <tr key={cand.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    {/* Candidate */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: '#4f46e5',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.95rem'
                        }}>
                          {cand.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.92rem' }}>
                            {cand.full_name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {cand.email} • {cand.phone || 'Chưa có SĐT'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Position & Dept */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.88rem' }}>
                        {cand.position_name || 'Vị trí chung'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: '500' }}>
                        {cand.department_name || 'Bộ phận N/A'}
                      </div>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: '#f1f5f9',
                        color: '#334155',
                        fontSize: '0.78rem',
                        fontWeight: '700'
                      }}>
                        {cand.total_rounds || 0} vòng ({cand.total_evaluations || 0} phiếu)
                      </span>
                    </td>

                    {/* Aggregate Score */}
                    <td style={{ padding: '16px' }}>
                      {cand.overall_score !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: cand.overall_score >= 8.0 ? '#ecfdf5' : (cand.overall_score >= 6.5 ? '#eff6ff' : '#fef2f2'),
                            color: cand.overall_score >= 8.0 ? '#047857' : (cand.overall_score >= 6.5 ? '#1d4ed8' : '#b91c1c'),
                            fontWeight: '800',
                            fontSize: '0.92rem'
                          }}>
                            ★ {cand.overall_score} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>/ 10</span>
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có điểm</span>
                      )}
                    </td>

                    {/* Sheet status */}
                    <td style={{ padding: '16px' }}>
                      {cand.is_missing_evaluations ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: '#fef3c7',
                          color: '#b45309'
                        }}>
                          <FiAlertTriangle size={12} /> Thiếu phiếu
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: '#dcfce7',
                          color: '#15803d'
                        }}>
                          <FiCheckCircle size={12} /> Đủ phiếu
                        </span>
                      )}
                    </td>

                    {/* Decision */}
                    <td style={{ padding: '16px' }}>
                      {cand.interview_decision === 'PASSED' ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          background: '#dcfce7',
                          color: '#16a34a'
                        }}>
                          ✓ ĐẠT
                        </span>
                      ) : cand.interview_decision === 'FAILED' ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          background: '#fee2e2',
                          color: '#dc2626'
                        }}>
                          ✗ KHÔNG ĐẠT
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          background: '#fef3c7',
                          color: '#d97706'
                        }}>
                          ⏳ Chờ Trưởng BP duyệt
                        </span>
                      )}
                    </td>

                    {/* Offer Eligibility */}
                    <td style={{ padding: '16px' }}>
                      {cand.offer_id ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: '#e0e7ff',
                          color: '#4338ca'
                        }}>
                          Đã gửi Offer
                        </span>
                      ) : cand.interview_decision === 'PASSED' ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: '#ecfdf5',
                          color: '#059669'
                        }}>
                          Đủ điều kiện Offer
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: '#f1f5f9',
                          color: '#94a3b8'
                        }}>
                          Chưa đủ điều kiện
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <Link
                        to={`/candidate-evaluations/${cand.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          background: cand.interview_decision ? '#4f46e5' : '#16a34a',
                          color: 'white',
                          textDecoration: 'none',
                          fontWeight: '700',
                          fontSize: '0.84rem',
                          boxShadow: cand.interview_decision 
                            ? '0 2px 6px rgba(79, 70, 229, 0.25)' 
                            : '0 4px 12px rgba(22, 163, 74, 0.3)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {cand.interview_decision ? (
                          <>Xem chi tiết & Điều chỉnh <FiChevronRight size={15} /></>
                        ) : (
                          <>⚡ Duyệt kết quả ngay <FiChevronRight size={15} /></>
                        )}
                      </Link>
                    </td>
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

export default CandidateEvaluationList;
