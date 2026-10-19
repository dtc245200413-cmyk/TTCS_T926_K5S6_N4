import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FiUser, FiBell, FiBriefcase, FiCalendar, FiAward, 
  FiBookOpen, FiCheckCircle, FiClock, FiStar, FiRefreshCw 
} from 'react-icons/fi';
import { getDisplayJobTitle } from '../utils/userDisplay';
import interviewScheduleApi from '../api/interviewScheduleApi';
import InterviewEvaluationModal from '../components/interviews/InterviewEvaluationModal';
import { displayTime } from '../utils/interviewSchedules';

const ProfileField = ({ label, value }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>
      {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa cập nhật</span>}
    </div>
  </div>
);

const UtilityCard = ({ icon, title, description, onClick }) => (
  <div 
    onClick={onClick}
    style={{ 
      border: '1px solid #e2e8f0', 
      borderRadius: '8px', 
      padding: '20px', 
      cursor: 'pointer',
      background: '#fff',
      transition: 'all 0.2s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#93c5fd';
      e.currentTarget.style.boxShadow = '0 6px 12px rgba(37,99,235,0.08)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{ color: '#2563eb', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.05rem', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{description}</div>
  </div>
);

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [evaluatingScheduleId, setEvaluatingScheduleId] = useState(null);
  const [notice, setNotice] = useState('');

  const isInterviewer = Boolean(
    user?.roles?.some(r => r.role_code === 'INTERVIEWER') || 
    user?.company_email === 'dtc245200571@ictu.edu.vn' ||
    /phỏng vấn|interviewer/i.test(user?.job_title || '')
  );

  const getPrimaryRole = () => {
    if (!user?.roles || user.roles.length === 0) return 'Nhân viên';
    return user.roles[0].role_name || user.roles[0].role_code;
  };

  const getDepartment = () => {
    return user?.department?.department_name || 'Phòng Công nghệ Thông tin';
  };

  const roleName = user ? getDisplayJobTitle(user) : getPrimaryRole();

  const fetchInterviewerSchedules = useCallback(async () => {
    if (!isInterviewer) return;
    setLoadingSchedules(true);
    try {
      const res = await interviewScheduleApi.getAll();
      if (Array.isArray(res.data?.data)) {
        setSchedules(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch interviewer schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }, [isInterviewer]);

  useEffect(() => {
    fetchInterviewerSchedules();
  }, [fetchInterviewerSchedules]);

  // Interviewer Statistics
  const totalCount = schedules.length;
  const pendingCount = schedules.filter(s => s.status !== 'CANCELLED' && !s.evaluation_id).length;
  const evaluatedCount = schedules.filter(s => Boolean(s.evaluation_id)).length;
  const evaluatedScores = schedules.filter(s => s.total_score != null).map(s => Number(s.total_score));
  const avgScore = evaluatedScores.length 
    ? (evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length).toFixed(1) 
    : '--';

  return (
    <div className="g-page-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Notice Message */}
      {notice && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notice}</span>
          <button 
            type="button" 
            onClick={() => setNotice('')}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="g-card" style={{ background: '#fff', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="g-page-title" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Tổng quan
          </h1>
          <p className="g-page-subtitle" style={{ color: '#64748b', margin: 0 }}>
            {isInterviewer 
              ? 'Không gian làm việc & Bảng điều khiển dành cho Người phỏng vấn' 
              : 'Thông tin cá nhân và công việc của bạn'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '2rem', flexShrink: 0, boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
          }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:5000${user.avatar_url}`} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
            ) : (
              <FiUser />
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 6px 0', color: '#0f172a', fontWeight: '700' }}>
              Xin chào, {user?.full_name}! 👋
            </h2>
            <div style={{ color: '#2563eb', fontSize: '1rem', fontWeight: '600', marginBottom: '6px' }}>
              {roleName} - {getDepartment()}
            </div>
            <div>
              <span style={{ 
                background: user?.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', 
                color: user?.status === 'ACTIVE' ? '#16a34a' : '#ef4444', 
                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' 
              }}>
                {user?.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', margin: '0 -32px 28px -32px' }}></div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <ProfileField label="Mã nhân viên" value={user?.employee_code} />
          <ProfileField label="Họ và tên" value={user?.full_name} />
          <ProfileField label="Chức danh" value={roleName} />
          <ProfileField label="Phòng ban" value={getDepartment()} />
          <ProfileField label="Email liên hệ" value={user?.company_email} />
          <ProfileField label="Điện thoại" value={user?.phone_number} />
        </div>
      </div>

      {/* INTERVIEWER WORKSPACE */}
      {isInterviewer && (
        <div style={{ marginBottom: '32px' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Tổng ca phỏng vấn</span>
                <span style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '6px' }}><FiCalendar size={18} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#0f172a' }}>{totalCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Được phân công cho bạn</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: '600', textTransform: 'uppercase' }}>Cần chấm điểm ngay</span>
                <span style={{ background: '#fff7ed', color: '#ea580c', padding: '6px', borderRadius: '6px' }}><FiClock size={18} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#ea580c' }}>{pendingCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#9a3412', marginTop: '4px' }}>Chưa có phiếu đánh giá</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Đã hoàn thành</span>
                <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '6px' }}><FiCheckCircle size={18} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#16a34a' }}>{evaluatedCount}</div>
              <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '4px' }}>Đã nộp phiếu chấm điểm</div>
            </div>

            <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Điểm TB chấm</span>
                <span style={{ background: '#fefce8', color: '#ca8a04', padding: '6px', borderRadius: '6px' }}><FiStar size={18} /></span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#0f172a' }}>{avgScore} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: '400' }}>/ 5.0</span></div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Thang điểm năng lực</div>
            </div>
          </div>

          {/* Assigned Schedules Table */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                  🎯 Lịch phỏng vấn & Chấm điểm ứng viên
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                  Thực hiện đánh giá ứng viên theo từng tiêu chí năng lực và ghi nhận xét kết luận.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={fetchInterviewerSchedules}
                  disabled={loadingSchedules}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
                    background: '#f8fafc', color: '#334155', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                  }}
                >
                  <FiRefreshCw size={14} className={loadingSchedules ? 'spin' : ''} /> Làm mới
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/interview-schedules')}
                  style={{
                    padding: '8px 14px', borderRadius: '6px', border: 'none',
                    background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                  }}
                >
                  Xem toàn bộ lịch →
                </button>
              </div>
            </div>

            {loadingSchedules ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Đang tải danh sách lịch phỏng vấn...
              </div>
            ) : schedules.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                <div style={{ fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Bạn chưa có lịch phỏng vấn nào được phân công</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Khi Nhân sự hoặc Bộ phận xếp lịch, ca phỏng vấn sẽ hiển thị tại đây để bạn chấm điểm.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 14px' }}>Ứng viên</th>
                      <th style={{ padding: '12px 14px' }}>Vòng PV</th>
                      <th style={{ padding: '12px 14px' }}>Thời gian</th>
                      <th style={{ padding: '12px 14px' }}>Địa điểm / Link</th>
                      <th style={{ padding: '12px 14px' }}>Đánh giá</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{row.candidate_name || 'Ứng viên'}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.candidate_email || '--'}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                            {row.round_name || 'Vòng 1'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {displayTime(row.scheduled_at)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {row.interview_format === 'ONLINE' ? (
                            row.interview_link ? (
                              <a href={row.interview_link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontSize: '0.85rem' }}>
                                Link trực tuyến
                              </a>
                            ) : (
                              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Online (chưa có link)</span>
                            )
                          ) : (
                            <span style={{ fontSize: '0.85rem' }}>{row.room_name || 'Trực tiếp tại cty'}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {row.evaluation_id ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                              <span>⭐ {row.total_score != null ? Number(row.total_score).toFixed(1) : ''}/5</span>
                              <span>•</span>
                              <span>{row.recommendation === 'RECOMMENDED' ? 'Đạt' : row.recommendation === 'NOT_RECOMMENDED' ? 'Không đạt' : 'Cân nhắc'}</span>
                            </div>
                          ) : row.status === 'CANCELLED' ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>Đã hủy</span>
                          ) : (
                            <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                              Chờ chấm điểm
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          {row.status !== 'CANCELLED' && (
                            row.evaluation_id ? (
                              <button
                                type="button"
                                onClick={() => setEvaluatingScheduleId(row.id)}
                                style={{
                                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #bae6fd',
                                  background: '#f0f9ff', color: '#0369a1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'
                                }}
                              >
                                👁 Xem phiếu
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEvaluatingScheduleId(row.id)}
                                style={{
                                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff',
                                  cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                                }}
                              >
                                ⭐ Chấm điểm ngay
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Utilities Section */}
      <div>
        <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: '700', margin: '0 0 16px 0' }}>
          {isInterviewer ? 'Tiện ích dành cho Người phỏng vấn' : 'Thông báo & tiện ích'}
        </h2>
        
        {isInterviewer ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <UtilityCard 
              icon={<FiCalendar size={26} />}
              title="Lịch phỏng vấn"
              description="Tra cứu lịch phỏng vấn, phòng họp, liên kết phỏng vấn trực tuyến"
              onClick={() => navigate('/interview-schedules')}
            />
            <UtilityCard 
              icon={<FiAward size={26} />}
              title="Khung năng lực"
              description="Tham khảo tiêu chuẩn và các tiêu chí đánh giá năng lực ứng viên"
              onClick={() => navigate('/competency-frameworks')}
            />
            <UtilityCard 
              icon={<FiBookOpen size={26} />}
              title="Ngân hàng câu hỏi"
              description="Xem và tham khảo câu hỏi phỏng vấn chuẩn theo từng vị trí"
              onClick={() => navigate('/questions')}
            />
            <UtilityCard 
              icon={<FiBell size={26} />}
              title="Thông báo"
              description="Nhận thông báo xếp lịch và nhắc nhở thời gian phỏng vấn"
              onClick={() => navigate('/notifications')}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <UtilityCard 
              icon={<FiBriefcase size={26} />}
              title="Tin tuyển dụng"
              description="Soạn thảo, gửi duyệt và quản lý các tin tuyển dụng"
              onClick={() => navigate('/job-postings')}
            />
            <UtilityCard 
              icon={<FiBell size={26} />}
              title="Thông báo"
              description="Xem thông báo mới và đánh dấu đã đọc"
              onClick={() => navigate('/notifications')}
            />
            <UtilityCard 
              icon={<FiUser size={26} />}
              title="Hồ sơ cá nhân"
              description="Cập nhật thông tin và ảnh đại diện"
              onClick={() => navigate('/profile/edit')}
            />
          </div>
        )}
      </div>

      {/* Evaluation Modal */}
      {evaluatingScheduleId && (
        <InterviewEvaluationModal
          scheduleId={evaluatingScheduleId}
          onClose={() => setEvaluatingScheduleId(null)}
          onEvaluated={(msg) => {
            setNotice(msg);
            fetchInterviewerSchedules();
          }}
        />
      )}

    </div>
  );
};

export default Home;

