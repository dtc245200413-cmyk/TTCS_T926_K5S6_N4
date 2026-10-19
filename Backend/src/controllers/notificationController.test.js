jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

const { pool } = require('../config/database');
const notificationController = require('./notificationController');

describe('notificationController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.resetAllMocks();
    req = {
      user: { user_id: 3 },
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('getMyNotifications', () => {
    it('returns notifications and unread count for current user', async () => {
      const mockRows = [{ notification_id: 1, title: 'Test 1', is_read: 0 }];
      pool.query.mockResolvedValueOnce([mockRows]); // notifications
      pool.query.mockResolvedValueOnce([[{ unread_count: 1 }]]); // unread count
      pool.query.mockResolvedValueOnce([[{ total_count: 1 }]]); // total count

      await notificationController.getMyNotifications(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            notifications: mockRows,
            unreadCount: 1,
            totalCount: 1
          })
        })
      );
    });

    it('filters by unread status when query parameter is provided', async () => {
      req.query = { filter: 'unread' };
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[{ unread_count: 0 }]]);
      pool.query.mockResolvedValueOnce([[{ total_count: 5 }]]);

      await notificationController.getMyNotifications(req, res, next);

      expect(pool.query.mock.calls[0][0]).toContain('is_read = FALSE');
    });
  });

  describe('markAsRead', () => {
    it('marks a specific notification as read for current user', async () => {
      req.params = { id: '5' };
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await notificationController.markAsRead(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET is_read = ? WHERE notification_id = ? AND user_id = ?'),
        [1, '5', 3]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('markAsUnread', () => {
    it('marks a notification as unread', async () => {
      req.params = { id: '5' };
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await notificationController.markAsUnread(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET is_read = FALSE WHERE notification_id = ? AND user_id = ?'),
        ['5', 3]
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('toggleRead', () => {
    it('toggles read status from false to true', async () => {
      req.params = { id: '5' };
      pool.query.mockResolvedValueOnce([[{ is_read: 0 }]]);
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await notificationController.toggleRead(req, res, next);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications SET is_read = ? WHERE notification_id = ? AND user_id = ?'),
        [1, '5', 3]
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { is_read: true }
        })
      );
    });
  });
});

