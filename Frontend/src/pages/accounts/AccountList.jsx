import React, { useState, useEffect, useContext } from 'react';
import userApi from '../../api/userApi';
import authApi from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';
import { FaLock, FaUnlock, FaKey } from 'react-icons/fa';

const AccountList = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getAll({});
      if (response.data.success) {
        setUsers(response.data.data.users);
      }
    } catch (err) {
      setError('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleLock = async (user) => {
    // Prevent locking self
    if (user.user_id === currentUser.user_id) {
      alert('Không thể tự khóa tài khoản của chính mình.');
      return;
    }

    if (user.roles?.some(r => r.role_code === 'ADMIN') && user.status === 'ACTIVE') {
      const confirm = window.confirm(`Bạn có chắc chắn muốn KHÓA tài khoản ADMIN: ${user.full_name}? Hãy đảm bảo hệ thống còn ít nhất 1 Admin khác hoạt động.`);
      if (!confirm) return;
    } else {
      const actionStr = user.status === 'ACTIVE' ? 'KHÓA' : 'MỞ KHÓA';
      if (!window.confirm(`Xác nhận ${actionStr} tài khoản ${user.full_name}?`)) return;
    }

    try {
      if (user.status === 'ACTIVE') {
        const reason = window.prompt(`Nhập lý do khóa tài khoản ${user.full_name}:`);
        if (reason === null) return; // User cancelled
        if (!reason.trim()) {
          alert('Lý do khóa tài khoản là bắt buộc.');
          return;
        }
        await userApi.lockAccount(user.user_id, reason);
        setActionMessage(`Đã khóa tài khoản ${user.full_name} thành công!`);
      } else {
        await userApi.unlockAccount(user.user_id);
        setActionMessage(`Đã mở khóa tài khoản ${user.full_name} thành công!`);
      }
      fetchUsers();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác.');
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Xác nhận gửi email đặt lại mật khẩu cho ${user.full_name}?`)) return;
    try {
      await authApi.forgotPassword(user.company_email);
      setActionMessage(`Đã gửi liên kết đặt lại mật khẩu tới email của ${user.full_name}.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi email đặt lại mật khẩu.');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') return <span className="badge badge-success">Hoạt động</span>;
    if (status === 'LOCKED') return <span className="badge badge-error">Đã khóa</span>;
    return <span className="badge">{status}</span>;
  };

  return (
    <div>
      <div className="g-page-header">
        <h1 className="g-page-title">Quản Lý Tài Khoản</h1>
        <p className="g-page-subtitle">Bảo mật, phân quyền và trạng thái truy cập</p>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        {error && <div className="alert alert-error">{error}</div>}
        {actionMessage && <div className="alert alert-success">{actionMessage}</div>}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Tài khoản (Email)</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Bảo mật</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 'bold' }}>{u.employee_code}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.company_email}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {u.roles?.map(r => (
                         <span key={r.role_id} style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{r.role_code}</span>
                      ))}
                    </div>
                  </td>
                  <td>{getStatusBadge(u.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {u.status === 'ACTIVE' ? (
                        <button 
                          onClick={() => handleToggleLock(u)}
                          className="g-btn-secondary" title="Khóa tài khoản"
                        ><FaLock /> Khóa</button>
                      ) : (
                        <button 
                          onClick={() => handleToggleLock(u)}
                          className="g-btn-secondary" title="Mở khóa tài khoản"
                        ><FaUnlock /> Mở</button>
                      )}
                      <button 
                        onClick={() => handleResetPassword(u)}
                        className="g-btn-secondary" title="Đặt lại mật khẩu"
                      ><FaKey /> Đổi MK</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AccountList;
