jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    execute: jest.fn()
  }
}));

jest.mock('../repositories/notificationRepository', () => ({
  create: jest.fn(),
  createForUsers: jest.fn(),
  findActiveUserIdsByRoles: jest.fn()
}));

const { pool } = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const offerService = require('./offerService');

describe('offerService', () => {
  const recruiter = {
    user_id: 3,
    full_name: 'Nguyễn Anh Sơn',
    roles: [{ role_code: 'RECRUITER' }]
  };

  const approver = {
    user_id: 6,
    full_name: 'Thào A Páo',
    roles: [{ role_code: 'APPROVER' }]
  };

  const interviewer = {
    user_id: 5,
    full_name: 'Thông Xuân Lập',
    roles: [{ role_code: 'INTERVIEWER' }]
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getAllOffers', () => {
    it('prevents pure INTERVIEWER from accessing offers', async () => {
      await expect(offerService.getAllOffers({}, interviewer)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('allows RECRUITER and APPROVER to view offers', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001' }]]);
      const res = await offerService.getAllOffers({}, recruiter);
      expect(res).toEqual([{ id: 1, offer_code: 'OFF-001' }]);
    });
  });

  describe('submitOffer', () => {
    it('denies user without recruiter/admin role from submitting', async () => {
      await expect(offerService.submitOffer(1, interviewer)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('submits offer and creates notification for approvers', async () => {
      // Find offer
      pool.query.mockResolvedValueOnce([[{
        id: 1,
        offer_code: 'OFF-001',
        candidate_name: 'Nguyễn Quỳnh Anh',
        basic_salary: 28000000,
        status: 'DRAFT',
        created_by: 3
      }]]);
      // Update status
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // Approver IDs
      notificationRepository.findActiveUserIdsByRoles.mockResolvedValueOnce([6]);
      // Get offer by ID for return
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001', status: 'PENDING_APPROVAL' }]]);
      pool.query.mockResolvedValueOnce([[]]); // Approvals history

      const res = await offerService.submitOffer(1, recruiter);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE candidate_offers \n     SET status = 'PENDING_APPROVAL'"),
        [1]
      );
      expect(notificationRepository.createForUsers).toHaveBeenCalledWith(
        [6],
        expect.objectContaining({
          type: 'OFFER_PENDING_APPROVAL',
          title: 'Yêu cầu phê duyệt Offer mới'
        })
      );
      expect(res.status).toBe('PENDING_APPROVAL');
    });
  });

  describe('processApproval', () => {
    it('denies non-approver user from approving', async () => {
      await expect(offerService.processApproval(1, { action: 'APPROVED' }, recruiter)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('requires reason for REJECTED and REQUEST_CHANGE', async () => {
      await expect(offerService.processApproval(1, { action: 'REJECTED' }, approver)).rejects.toMatchObject({
        statusCode: 400
      });
      await expect(offerService.processApproval(1, { action: 'REQUEST_CHANGE', reason: '  ' }, approver)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('approves offer and notifies recruiter (created_by)', async () => {
      pool.query.mockResolvedValueOnce([[{
        id: 1,
        offer_code: 'OFF-001',
        candidate_name: 'Nguyễn Quỳnh Anh',
        status: 'PENDING_APPROVAL',
        created_by: 3
      }]]);
      // Insert approval
      pool.query.mockResolvedValueOnce([{ insertId: 1 }]);
      // Update offer
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // Get offer by ID
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001', status: 'APPROVED' }]]);
      pool.query.mockResolvedValueOnce([[]]);

      const res = await offerService.processApproval(1, { action: 'APPROVED', reason: 'Mức lương tốt' }, approver);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          type: 'OFFER_APPROVED',
          title: 'Offer đã được phê duyệt'
        })
      );
      expect(res.status).toBe('APPROVED');
    });

    it('rejects offer with reason and notifies recruiter', async () => {
      pool.query.mockResolvedValueOnce([[{
        id: 1,
        offer_code: 'OFF-001',
        candidate_name: 'Trần Văn Mạnh',
        status: 'PENDING_APPROVAL',
        created_by: 3
      }]]);
      pool.query.mockResolvedValueOnce([{ insertId: 2 }]);
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001', status: 'REJECTED' }]]);
      pool.query.mockResolvedValueOnce([[]]);

      const res = await offerService.processApproval(1, { action: 'REJECTED', reason: 'Vượt trần ngân sách' }, approver);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          type: 'OFFER_REJECTED',
          title: 'Offer bị từ chối phê duyệt'
        })
      );
      expect(res.status).toBe('REJECTED');
    });

    it('requests change with reason and notifies recruiter', async () => {
      pool.query.mockResolvedValueOnce([[{
        id: 1,
        offer_code: 'OFF-001',
        candidate_name: 'Lê Thu Hà',
        status: 'PENDING_APPROVAL',
        created_by: 3
      }]]);
      pool.query.mockResolvedValueOnce([{ insertId: 3 }]);
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001', status: 'CHANGE_REQUESTED' }]]);
      pool.query.mockResolvedValueOnce([[]]);

      const res = await offerService.processApproval(1, { action: 'REQUEST_CHANGE', reason: 'Cần điều chỉnh phụ cấp' }, approver);

      expect(notificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 3,
          type: 'OFFER_CHANGE_REQUESTED',
          title: 'Yêu cầu chỉnh sửa Offer'
        })
      );
      expect(res.status).toBe('CHANGE_REQUESTED');
    });
  });
});

