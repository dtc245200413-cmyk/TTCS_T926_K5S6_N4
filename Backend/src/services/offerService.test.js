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

jest.mock('./offerAuthorization', () => {
  const actual = jest.requireActual('./offerAuthorization');
  return { ...actual, getApprovalScope: jest.fn(actual.getApprovalScope) };
});

const { pool } = require('../config/database');
const notificationRepository = require('../repositories/notificationRepository');
const offerAuthorization = require('./offerAuthorization');
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
    offerAuthorization.getApprovalScope.mockImplementation(
      jest.requireActual('./offerAuthorization').getApprovalScope
    );
  });

  describe('getAllOffers', () => {
    it('prevents pure INTERVIEWER from accessing offers', async () => {
      await expect(offerService.getAllOffers({}, interviewer)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('allows RECRUITER to view offers within creator scope', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1, offer_code: 'OFF-001', status: 'DRAFT' }]]);
      const res = await offerService.getAllOffers({}, recruiter);
      expect(res).toEqual([{ id: 1, offer_code: 'OFF-001', status: 'DRAFT', can_publish: false }]);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('AND (o.created_by = ?)'), [3]);
    });
  });

  describe('submitOffer', () => {
    it('denies user without recruiter/admin role from submitting', async () => {
      await expect(offerService.submitOffer(1, interviewer)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('does not submit or notify while draft/decision dependencies are unconfirmed', async () => {
      await expect(offerService.submitOffer(1, recruiter)).rejects.toMatchObject({
        statusCode: 503, code: 'OFFER_DRAFT_DEPENDENCY_UNAVAILABLE'
      });
      expect(pool.query).not.toHaveBeenCalled();
      expect(notificationRepository.createForUsers).not.toHaveBeenCalled();
    });
  });

  describe('processApproval', () => {
    // These compatibility tests stub authorization ONLY to exercise the existing
    // teammate workflow. Production denies approval until an assignment exists.
    // offerPostAccess.test.js tests the real authorization without this stub.
    function allowWorkflowContractTest() {
      offerAuthorization.getApprovalScope.mockResolvedValue({ sql: '', params: [] });
    }

    it('denies non-approver user from approving', async () => {
      await expect(offerService.processApproval(1, { action: 'APPROVED' }, recruiter)).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('requires reason for REJECTED and REQUEST_CHANGE', async () => {
      allowWorkflowContractTest();
      await expect(offerService.processApproval(1, { action: 'REJECTED' }, approver)).rejects.toMatchObject({
        statusCode: 400
      });
      await expect(offerService.processApproval(1, { action: 'REQUEST_CHANGE', reason: '  ' }, approver)).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it('approves offer and notifies recruiter (created_by)', async () => {
      allowWorkflowContractTest();
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
      allowWorkflowContractTest();
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
      allowWorkflowContractTest();
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
