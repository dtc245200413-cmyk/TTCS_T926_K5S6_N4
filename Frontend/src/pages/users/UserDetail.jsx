import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import userApi from '../../api/userApi';
import roleApi from '../../api/roleApi';
import { AuthContext } from '../../context/AuthContext';

const UserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', message: '' });
  
  // Assign Role Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  // Lock Modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [handoverUserId, setHandoverUserId] = useState('');

  const { user: currentUser, hasPermission, refreshUser } = useContext(AuthContext);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await userApi.getById(id);
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('User not found.');
      } else {
        setError('Failed to load user details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line
  }, [id]);

  // Handle Lock Account
  const handleLockAccount = async (e) => {
    e.preventDefault();
    try {
      const response = await userApi.lockAccount(id, lockReason, handoverUserId);
      if (response.data.success) {
        setStatusMsg({ type: 'success', message: response.data.message || 'Khoá tài khoản thành công.' });
        setShowLockModal(false);
        setLockReason('');
        setHandoverUserId('');
        fetchUser();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', message: err.response?.data?.message || 'Lỗi khi khoá tài khoản.' });
      setShowLockModal(false);
    }
  };

  const openLockModal = async () => {
    setShowLockModal(true);
    setLockReason('');
    setHandoverUserId('');
    try {
      const res = await userApi.getAll({ status: 'ACTIVE' });
      if (res.data.success) {
        // Exclude the current user from the handover list
        setActiveUsers(res.data.data.users.filter(u => u.user_id !== parseInt(id, 10)));
      }
    } catch (error) {
      console.error("Failed to fetch active users for handover", error);
    }
  };

  const handleUnlockAccount = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn mở khoá tài khoản này không?')) return;
    try {
      const response = await userApi.unlockAccount(id);
      if (response.data.success) {
        setStatusMsg({ type: 'success', message: response.data.message || 'Mở khoá tài khoản thành công.' });
        fetchUser();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', message: err.response?.data?.message || 'Lỗi khi mở khoá tài khoản.' });
    }
  };

  // Open Assign Role Modal
  const openRoleModal = async () => {
    try {
      const response = await roleApi.getAll();
      if (response.data.success) {
        // Filter out roles the user already has
        const userRoleIds = user.roles?.map(r => r.role_id) || [];
        const filtered = response.data.data.filter(r => !userRoleIds.includes(r.role_id));
        setAvailableRoles(filtered);
        setShowRoleModal(true);
        setSelectedRoleId('');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', message: 'Lỗi khi tải danh sách vai trò.' });
    }
  };

  // Handle Assign Role
  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!selectedRoleId) return;
    try {
      const response = await userApi.assignRole(id, selectedRoleId);
      if (response.data.success) {
        setStatusMsg({ type: 'success', message: response.data.message || 'Gán vai trò thành công.' });
        setShowRoleModal(false);
        fetchUser();
        // If assigning role to self, refresh global context
        if (currentUser && currentUser.user_id === parseInt(id, 10)) {
          refreshUser();
        }
      }
    } catch (err) {
      setStatusMsg({ type: 'error', message: err.response?.data?.message || 'Lỗi khi gán vai trò.' });
      setShowRoleModal(false);
    }
  };

  // Handle Revoke Role
  const handleRevokeRole = async (e, roleId) => {
    e.preventDefault();
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi vai trò này không?')) return;
    try {
      const response = await userApi.revokeRole(id, roleId);
      if (response.data.success) {
        setStatusMsg({ type: 'success', message: response.data.message || 'Thu hồi vai trò thành công.' });
        fetchUser();
        // If revoking role from self, refresh global context
        if (currentUser && currentUser.user_id === parseInt(id, 10)) {
          refreshUser();
        }
      }
    } catch (err) {
      setStatusMsg({ type: 'error', message: err.response?.data?.message || 'Lỗi khi thu hồi vai trò.' });
    }
  };

  if (loading && !user) return <div className="page-header">Loading...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!user) return null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Chi tiết nhân viên</h1>
        <div>
          <Link to="/users" className="btn-secondary" style={{ marginRight: '10px' }}>Quay lại danh sách</Link>
          
          {hasPermission('USER_UPDATE') && (
            <Link to={`/users/${user.user_id}/edit`} className="btn-primary" style={{ textDecoration: 'none', marginRight: '10px' }}>
              Chỉnh sửa
            </Link>
          )}

          {/* S1-10: Lock/Unlock UI logic */}
          {user.status === 'ACTIVE' && hasPermission('USER_LOCK') && (
            <button onClick={openLockModal} className="btn-danger" style={{ marginRight: '10px' }}>
              Khoá tài khoản
            </button>
          )}
          {user.status === 'LOCKED' && hasPermission('USER_UNLOCK') && (
            <button onClick={handleUnlockAccount} className="btn-secondary" style={{ marginRight: '10px', borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>
              Mở khoá tài khoản
            </button>
          )}
          {user.status === 'INACTIVE' && hasPermission('USER_UNLOCK') && (
            <button onClick={handleUnlockAccount} className="btn-secondary" style={{ marginRight: '10px', borderColor: 'var(--success-color)', color: 'var(--success-color)' }}>
              Kích hoạt tài khoản
            </button>
          )}
        </div>
      </div>

      {statusMsg.message && (
        <div className={`alert ${statusMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {statusMsg.message}
        </div>
      )}

      <div className="card">
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Mã nhân viên</span>
            <span className="detail-value">{user.employee_code}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Họ Tên</span>
            <span className="detail-value">{user.full_name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email công ty</span>
            <span className="detail-value">{user.company_email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Số điện thoại</span>
            <span className="detail-value">{user.phone_number || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Phòng ban</span>
            <span className="detail-value">{user.department?.department_name || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Chức danh</span>
            <span className="detail-value">{user.job_title || 'N/A'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Trạng thái</span>
            <span className="detail-value">
              <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : user.status === 'LOCKED' ? 'badge-error' : 'badge-warning'}`}>
                {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'LOCKED' ? 'Đã khoá' : 'Vô hiệu'}
              </span>
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Ngày tạo</span>
            <span className="detail-value">{new Date(user.created_at).toLocaleString()}</span>
          </div>
        </div>
        
        <hr style={{ margin: '30px 0', borderColor: '#e5e7eb' }} />
        
        {/* S1-09: ROLE MANAGEMENT UI */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3>Vai trò được cấp</h3>
          {hasPermission('ROLE_ASSIGN') && (
            <button onClick={openRoleModal} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
              + Gán vai trò
            </button>
          )}
        </div>

        {(!user.roles || user.roles.length === 0) ? (
          <p style={{ color: 'var(--text-light)' }}>Chưa có vai trò nào được gán cho người dùng này.</p>
        ) : (
          <table className="data-table" style={{ width: '100%', maxWidth: '600px' }}>
            <thead>
              <tr>
                <th>Mã vai trò</th>
                <th>Tên vai trò</th>
                {hasPermission('ROLE_REVOKE') && <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {user.roles.map(role => (
                <tr key={role.role_id}>
                  <td><strong>{role.role_code}</strong></td>
                  <td>{role.role_name}</td>
                  {hasPermission('ROLE_REVOKE') && (
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        type="button"
                        onClick={(e) => handleRevokeRole(e, role.role_id)} 
                        className="action-link danger"
                      >
                        [Thu hồi]
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Lock Account */}
      {showLockModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Khoá tài khoản nhân viên</h3>
            <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
              Bạn có chắc chắn muốn khoá tài khoản <strong>{user.full_name}</strong>? Họ sẽ bị đăng xuất ngay lập tức.
            </p>
            <form onSubmit={handleLockAccount}>
              <div className="form-group">
                <label>Lý do khoá <span style={{color: 'red'}}>*</span></label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="VD: Nghỉ việc, vi phạm quy định..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Người nhận bàn giao công việc (Tuỳ chọn)</label>
                <select 
                  className="form-control" 
                  value={handoverUserId}
                  onChange={(e) => setHandoverUserId(e.target.value)}
                >
                  <option value="">-- Không bàn giao ngay --</option>
                  {activeUsers.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.employee_code})</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '5px' }}>
                  Nếu chọn, hệ thống sẽ tự động chuyển tất cả Vị trí tuyển dụng đang mở của nhân viên này sang cho người được chọn.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowLockModal(false)}>Hủy</button>
                <button type="submit" className="btn-danger" disabled={!lockReason.trim()}>Xác nhận Khoá</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Role */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Gán vai trò mới</h3>
            <form onSubmit={handleAssignRole}>
              <div className="form-group">
                <label>Chọn vai trò</label>
                <select 
                  className="form-control" 
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Chọn một vai trò --</option>
                  {availableRoles.map(r => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name} ({r.role_code})
                    </option>
                  ))}
                </select>
                {availableRoles.length === 0 && (
                  <p style={{ color: 'var(--error-color)', fontSize: '0.8rem', marginTop: '5px' }}>
                    Nhân viên này đã có tất cả các vai trò.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRoleModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={!selectedRoleId}>Xác nhận Gán</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;
