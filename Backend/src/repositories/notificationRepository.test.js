const notificationRepository = require('./notificationRepository');

describe('notificationRepository', () => {
  let mockConn;

  beforeEach(() => {
    mockConn = {
      query: jest.fn(),
      execute: jest.fn()
    };
  });

  describe('create', () => {
    it('returns null if userId or title is missing', async () => {
      expect(await notificationRepository.create({ title: 'Test' }, mockConn)).toBeNull();
      expect(await notificationRepository.create({ userId: 1 }, mockConn)).toBeNull();
      expect(mockConn.query).not.toHaveBeenCalled();
      expect(mockConn.execute).not.toHaveBeenCalled();
    });

    it('returns null if recipient is not found or is INACTIVE', async () => {
      mockConn.query.mockResolvedValueOnce([[]]); // User not found
      const res1 = await notificationRepository.create({ userId: 99, title: 'Test' }, mockConn);
      expect(res1).toBeNull();

      mockConn.query.mockResolvedValueOnce([[{ user_id: 2, status: 'INACTIVE' }]]); // Inactive user
      const res2 = await notificationRepository.create({ userId: 2, title: 'Test' }, mockConn);
      expect(res2).toBeNull();
      expect(mockConn.execute).not.toHaveBeenCalled();
    });

    it('returns existing notification_id and does NOT insert if duplicate exists', async () => {
      // User is active
      mockConn.query.mockResolvedValueOnce([[{ user_id: 5, status: 'ACTIVE' }]]);
      // Duplicate found
      mockConn.query.mockResolvedValueOnce([[{ notification_id: 101 }]]);

      const res = await notificationRepository.create({
        userId: 5,
        title: 'Lịch phỏng vấn mới',
        type: 'INTERVIEW_ASSIGNED',
        link: '/interview-schedules',
        deduplicate: true
      }, mockConn);

      expect(res).toBe(101);
      expect(mockConn.execute).not.toHaveBeenCalled();
    });

    it('inserts new notification when recipient is ACTIVE and not duplicate', async () => {
      // User is active
      mockConn.query.mockResolvedValueOnce([[{ user_id: 5, status: 'ACTIVE' }]]);
      // Duplicate not found
      mockConn.query.mockResolvedValueOnce([[]]);
      // Insert result
      mockConn.execute.mockResolvedValueOnce([{ insertId: 202 }]);

      const res = await notificationRepository.create({
        userId: 5,
        title: 'Lịch phỏng vấn mới được phân công',
        message: 'Bạn có lịch phỏng vấn',
        type: 'INTERVIEW_ASSIGNED',
        link: '/interview-schedules'
      }, mockConn);

      expect(res).toBe(202);
      expect(mockConn.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        [5, 'Lịch phỏng vấn mới được phân công', 'Bạn có lịch phỏng vấn', 'INTERVIEW_ASSIGNED', '/interview-schedules']
      );
    });
  });

  describe('createForUsers', () => {
    it('creates notifications for unique valid users', async () => {
      // For user 1
      mockConn.query.mockResolvedValueOnce([[{ user_id: 1, status: 'ACTIVE' }]]);
      mockConn.query.mockResolvedValueOnce([[]]);
      mockConn.execute.mockResolvedValueOnce([{ insertId: 10 }]);

      // For user 2
      mockConn.query.mockResolvedValueOnce([[{ user_id: 2, status: 'ACTIVE' }]]);
      mockConn.query.mockResolvedValueOnce([[]]);
      mockConn.execute.mockResolvedValueOnce([{ insertId: 11 }]);

      const count = await notificationRepository.createForUsers([1, 2, 1], {
        title: 'Yêu cầu duyệt Offer',
        type: 'OFFER_PENDING_APPROVAL'
      }, mockConn);

      expect(count).toBe(2);
    });
  });

  describe('findActiveUserIdsByRoles', () => {
    it('returns empty array if roleCodes is empty', async () => {
      expect(await notificationRepository.findActiveUserIdsByRoles([], mockConn)).toEqual([]);
      expect(mockConn.query).not.toHaveBeenCalled();
    });

    it('returns list of distinct user IDs with matching roles', async () => {
      mockConn.query.mockResolvedValueOnce([[{ user_id: 6 }, { user_id: 1 }]]);
      const res = await notificationRepository.findActiveUserIdsByRoles(['APPROVER', 'ADMIN'], mockConn);
      expect(res).toEqual([6, 1]);
    });
  });
});

