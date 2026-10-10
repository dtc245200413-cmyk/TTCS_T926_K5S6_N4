import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { FiBell, FiCheck } from 'react-icons/fi';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await axiosClient.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await axiosClient.put(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axiosClient.put(`/notifications/all/read`);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 className="g-page-title">
          <FiBell color="#4f46e5" /> Quản lý thông báo
        </h1>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllAsRead}
            style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontWeight: '500' }}
          >
            <FiCheck /> Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải thông báo...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <FiBell size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>Bạn không có thông báo nào</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {notifications.map(notif => (
            <div 
              key={notif.notification_id}
              onClick={() => { if (!notif.is_read) markAsRead(notif.notification_id); }}
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: notif.is_read ? 'transparent' : '#f8fafc',
                cursor: notif.is_read ? 'default' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: notif.is_read ? '500' : '700' }}>
                  {notif.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {new Date(notif.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <p className="g-page-subtitle">
                {notif.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
