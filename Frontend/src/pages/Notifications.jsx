import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { 
  FiBell, 
  FiCheck, 
  FiCheckCircle, 
  FiClock, 
  FiCalendar, 
  FiFileText, 
  FiAlertCircle, 
  FiArrowRight, 
  FiRefreshCw, 
  FiMail, 
  FiUserCheck,
  FiUserX,
  FiCornerDownRight
} from 'react-icons/fi';
import '../styles/global.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'INTERVIEW' | 'OFFER'
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/notifications');
      if (response.data?.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.unreadCount || 0);
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

  const handleToggleRead = async (e, notif) => {
    e.stopPropagation();
    try {
      const endpoint = notif.is_read ? `/notifications/${notif.notification_id}/unread` : `/notifications/${notif.notification_id}/read`;
      await axiosClient.put(endpoint);
      setNotifications(prev => prev.map(item => 
        item.notification_id === notif.notification_id ? { ...item, is_read: item.is_read ? 0 : 1 } : item
      ));
      setUnreadCount(prev => notif.is_read ? prev + 1 : Math.max(0, prev - 1));
    } catch (error) {
      console.error('Lỗi khi đổi trạng thái thông báo:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axiosClient.put('/notifications/all/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi khi đánh dấu đã đọc tất cả:', error);
    }
  };

  const handleNotificationClick = async (notif) => {
    // 1. Đánh dấu đã đọc nếu chưa đọc
    if (!notif.is_read) {
      try {
        await axiosClient.put(`/notifications/${notif.notification_id}/read`);
        setNotifications(prev => prev.map(item => 
          item.notification_id === notif.notification_id ? { ...item, is_read: 1 } : item
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err);
      }
    }

    // 2. Điều hướng đến công việc liên quan
    if (notif.link) {
      let targetLink = notif.link;
      // Chuẩn hoá đường dẫn
      if (targetLink === '/interviews') {
        targetLink = '/interview-schedules';
      } else if (targetLink === '/offers/approval') {
        targetLink = '/offers';
      }
      navigate(targetLink);
    }
  };

  // Helper hiển thị icon và badge theo loại thông báo
  const getTypeMeta = (type) => {
    switch (type) {
      case 'INTERVIEW_ASSIGNED':
        return {
          icon: <FiCalendar color="#3b82f6" size={20} />,
          badgeText: 'Lịch phỏng vấn',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          actionText: 'Mở lịch phỏng vấn'
        };
      case 'INTERVIEW_UPDATED':
        return {
          icon: <FiCalendar color="#0284c7" size={20} />,
          badgeText: 'Cập nhật phỏng vấn',
          badgeBg: '#f0f9ff',
          badgeColor: '#0369a1',
          actionText: 'Mở lịch phỏng vấn'
        };
      case 'INTERVIEW_CANCELLED':
        return {
          icon: <FiAlertCircle color="#ef4444" size={20} />,
          badgeText: 'Hủy phỏng vấn',
          badgeBg: '#fef2f2',
          badgeColor: '#b91c1c',
          actionText: 'Xem danh sách lịch'
        };
      case 'OFFER_PENDING_APPROVAL':
        return {
          icon: <FiClock color="#f59e0b" size={20} />,
          badgeText: 'Duyệt Offer',
          badgeBg: '#fffbeb',
          badgeColor: '#b45309',
          actionText: 'Xem và duyệt Offer'
        };
      case 'OFFER_APPROVED':
        return {
          icon: <FiCheckCircle color="#10b981" size={20} />,
          badgeText: 'Offer đã duyệt',
          badgeBg: '#ecfdf5',
          badgeColor: '#047857',
          actionText: 'Xem chi tiết Offer'
        };
      case 'OFFER_REJECTED':
        return {
          icon: <FiAlertCircle color="#ef4444" size={20} />,
          badgeText: 'Offer từ chối',
          badgeBg: '#fef2f2',
          badgeColor: '#b91c1c',
          actionText: 'Xem chi tiết Offer'
        };
      case 'OFFER_CHANGE_REQUESTED':
        return {
          icon: <FiFileText color="#f97316" size={20} />,
          badgeText: 'Yêu cầu sửa Offer',
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          actionText: 'Chỉnh sửa Offer'
        };
      case 'OFFER_ACCEPTED':
        return {
          icon: <FiUserCheck color="#059669" size={20} />,
          badgeText: 'Nhận việc (Offer)',
          badgeBg: '#ecfdf5',
          badgeColor: '#065f46',
          actionText: 'Bắt đầu Onboarding'
        };
      case 'OFFER_DECLINED':
        return {
          icon: <FiUserX color="#dc2626" size={20} />,
          badgeText: 'Từ chối Offer',
          badgeBg: '#fef2f2',
          badgeColor: '#991b1b',
          actionText: 'Xem chi tiết'
        };
      default:
        return {
          icon: <FiBell color="#6366f1" size={20} />,
          badgeText: 'Thông báo',
          badgeBg: '#f5f3ff',
          badgeColor: '#4f46e5',
          actionText: 'Xem công việc'
        };
    }
  };

  // Lọc thông báo theo tab và danh mục
  const filteredNotifications = notifications.filter(notif => {
    // Lọc theo trạng thái đọc
    if (filterTab === 'unread' && notif.is_read) return false;
    if (filterTab === 'read' && !notif.is_read) return false;

    // Lọc theo danh mục
    if (categoryFilter === 'INTERVIEW' && !notif.type?.startsWith('INTERVIEW_')) return false;
    if (categoryFilter === 'OFFER' && !notif.type?.startsWith('OFFER_')) return false;

    return true;
  });

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Tiêu đề trang & Tóm tắt */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="g-page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiBell color="#4f46e5" size={26} /> Thông báo công việc
            </h1>
            {unreadCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px'
              }}>
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Cập nhật nhiệm vụ, lịch phỏng vấn và trạng thái phê duyệt Offer liên quan đến bạn
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchNotifications}
            title="Làm mới danh sách"
            style={{
              padding: '8px 14px',
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#475569',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}
          >
            <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
          </button>

          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              style={{ 
                padding: '8px 16px', 
                background: '#4f46e5', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'white', 
                fontWeight: '600',
                fontSize: '0.85rem',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
              }}
            >
              <FiCheck /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Thanh bộ lọc (Tabs & Dropdown) */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '12px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Tabs: Tất cả / Chưa đọc / Đã đọc */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterTab('all')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: filterTab === 'all' ? '600' : '500',
              background: filterTab === 'all' ? '#4f46e5' : '#f1f5f9',
              color: filterTab === 'all' ? 'white' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: filterTab === 'unread' ? '600' : '500',
              background: filterTab === 'unread' ? '#4f46e5' : '#f1f5f9',
              color: filterTab === 'unread' ? 'white' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button
            onClick={() => setFilterTab('read')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: filterTab === 'read' ? '600' : '500',
              background: filterTab === 'read' ? '#4f46e5' : '#f1f5f9',
              color: filterTab === 'read' ? 'white' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            Đã đọc ({Math.max(0, notifications.length - unreadCount)})
          </button>
        </div>

        {/* Lọc theo loại */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Phân loại:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              color: '#334155',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả nhiệm vụ</option>
            <option value="INTERVIEW">Lịch phỏng vấn</option>
            <option value="OFFER">Phê duyệt & Thư mời Offer</option>
          </select>
        </div>
      </div>

      {/* Danh sách thông báo */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <FiRefreshCw size={28} className="animate-spin" style={{ color: '#4f46e5', marginBottom: '12px' }} />
          <div>Đang tải danh sách thông báo...</div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <FiBell size={48} style={{ opacity: 0.2, marginBottom: '16px', color: '#4f46e5' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#334155', margin: '0 0 6px 0' }}>Không có thông báo nào</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {filterTab === 'unread' ? 'Bạn đã đọc tất cả thông báo.' : 'Chưa có thông báo nào được ghi nhận cho tài khoản của bạn.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifications.map(notif => {
            const meta = getTypeMeta(notif.type);
            const isUnread = !notif.is_read;

            return (
              <div 
                key={notif.notification_id}
                onClick={() => handleNotificationClick(notif)}
                style={{
                  background: isUnread ? '#f8faff' : 'white',
                  borderRadius: '12px',
                  border: isUnread ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  boxShadow: isUnread ? '0 2px 8px rgba(59, 130, 246, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  cursor: notif.link ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  borderLeft: isUnread ? '4px solid #3b82f6' : '1px solid #e2e8f0'
                }}
                onMouseEnter={e => {
                  if (notif.link) {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (notif.link) {
                    e.currentTarget.style.borderColor = isUnread ? '#bfdbfe' : '#e2e8f0';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                {/* Icon biểu tượng bên trái */}
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: meta.badgeBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {meta.icon}
                </div>

                {/* Nội dung thông báo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: meta.badgeBg,
                      color: meta.badgeColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {meta.badgeText}
                    </span>

                    {isUnread ? (
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                        Chưa đọc
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Đã đọc
                      </span>
                    )}

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
                      {new Date(notif.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <h3 style={{
                    margin: '0 0 6px 0',
                    fontSize: '1rem',
                    color: isUnread ? '#0f172a' : '#334155',
                    fontWeight: isUnread ? '700' : '600'
                  }}>
                    {notif.title}
                  </h3>

                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '0.9rem',
                    color: '#475569',
                    lineHeight: '1.5'
                  }}>
                    {notif.message}
                  </p>

                  {/* Nút hành động trực tiếp */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {notif.link && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(notif);
                        }}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                      >
                        <FiCornerDownRight size={14} /> {meta.actionText}
                      </button>
                    )}

                    <button
                      onClick={(e) => handleToggleRead(e, notif)}
                      style={{
                        background: 'transparent',
                        color: '#64748b',
                        border: 'none',
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
                      onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                    >
                      {isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
