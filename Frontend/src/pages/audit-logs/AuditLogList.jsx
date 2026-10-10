import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import { FiClock, FiUser, FiActivity, FiSearch, FiMonitor } from 'react-icons/fi';

const AuditLogList = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const offset = (page - 1) * limit;
      const response = await axiosClient.get(`/audit-logs?limit=${limit}&offset=${offset}`);
      if (response.data?.success) {
        setLogs(response.data.data.logs);
        setTotal(response.data.data.total);
      }
    } catch (err) {
      setError('Lỗi khi tải nhật ký hoạt động. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const translateAction = (action) => {
    const actionMap = {
      'LOGIN_SUCCESS': 'ĐĂNG NHẬP THÀNH CÔNG',
      'LOGOUT': 'ĐĂNG XUẤT',
      'LOGIN_FAILED': 'ĐĂNG NHẬP THẤT BẠI',
      'CREATE': 'TẠO MỚI',
      'UPDATE': 'CẬP NHẬT',
      'DELETE': 'XÓA',
      'QUESTION_CREATE': 'TẠO CÂU HỎI',
      'QUESTION_UPDATE': 'CẬP NHẬT CÂU HỎI',
      'QUESTION_DELETE': 'XÓA CÂU HỎI',
      'USER_CREATE': 'TẠO NGƯỜI DÙNG',
      'USER_UPDATE': 'SỬA NGƯỜI DÙNG',
      'USER_DELETE': 'XÓA NGƯỜI DÙNG',
      'ROLE_CREATE': 'TẠO CHỨC DANH',
      'ROLE_UPDATE': 'SỬA CHỨC DANH',
      'ROLE_DELETE': 'XÓA CHỨC DANH'
    };
    return actionMap[action] || action;
  };

  const translateEntity = (entity) => {
    const entityMap = {
      'users': 'Người dùng',
      'roles': 'Chức danh',
      'questions': 'Câu hỏi',
      'departments': 'Phòng ban',
      'job_positions': 'Vị trí công việc',
      'recruitment_requests': 'Yêu cầu tuyển dụng'
    };
    return entityMap[entity] || entity;
  };

  const translateDesc = (desc) => {
    if (!desc) return desc;
    let d = desc;
    d = d.replace('User logged in successfully.', 'Người dùng đăng nhập thành công.');
    d = d.replace('User logged out.', 'Người dùng đăng xuất.');
    d = d.replace('Failed login attempt.', 'Đăng nhập thất bại.');
    return d;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="g-page-title">Nhật Ký Hoạt Động</h1>
          <p className="g-page-subtitle">Theo dõi toàn bộ lịch sử thao tác trên hệ thống</p>
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderBottom: '1px solid #fecaca' }}>
            {error}
          </div>
        )}
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>Thời Gian</th>
                <th style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>Người Thực Hiện</th>
                <th style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>Hành Động</th>
                <th style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>Đối Tượng</th>
                <th style={{ padding: '16px', color: '#475569', fontWeight: '600' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Chưa có nhật ký hoạt động nào.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_log_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                        <FiClock style={{ color: '#64748b' }} />
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '500' }}>
                        <FiUser style={{ color: '#4f46e5' }} />
                        {log.user_name || 'Hệ thống'} {log.employee_code && `(${log.employee_code})`}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiActivity style={{ color: '#059669' }} />
                        <span style={{ 
                          padding: '4px 10px', 
                          background: log.action.includes('CREATE') ? '#dcfce7' : log.action.includes('UPDATE') ? '#fef3c7' : log.action.includes('DELETE') ? '#fee2e2' : '#f1f5f9',
                          color: log.action.includes('CREATE') ? '#166534' : log.action.includes('UPDATE') ? '#92400e' : log.action.includes('DELETE') ? '#b91c1c' : '#334155',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {translateAction(log.action)}
                        </span>
                      </div>
                      {log.description && (
                        <div style={{ marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                          {translateDesc(log.description)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ color: '#334155', fontWeight: '500' }}>{translateEntity(log.entity_type) || '-'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>ID: {log.entity_id || '-'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                        <FiMonitor />
                        {log.ip_address || '-'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} trong tổng số {total} bản ghi
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: page === 1 ? '#f8fafc' : '#ffffff',
                  color: page === 1 ? '#cbd5e1' : '#334155',
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: page === totalPages ? '#f8fafc' : '#ffffff',
                  color: page === totalPages ? '#cbd5e1' : '#334155',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogList;
