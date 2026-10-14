jest.mock('../repositories/approvalWorkflowRepository', () => ({
  findLevelsByScope: jest.fn(),
  findRolesByCodes: jest.fn(),
  countActiveUsersByRole: jest.fn()
}));

const workflowRepository = require('../repositories/approvalWorkflowRepository');
const service = require('./approvalWorkflowService');

describe('resolveApprovalChain (chỉ Giám đốc duyệt)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workflowRepository.findRolesByCodes.mockResolvedValue([{ role_code: 'APPROVER' }]);
    workflowRepository.countActiveUsersByRole.mockResolvedValue(1);
  });

  test.each([[25000000, 20000000], [50000000, 40000000], [80000000, 70000000]])(
    'always returns a single director step for salary %i',
    async (max, min) => {
      const steps = await service.resolveApprovalChain(1, max, min);
      expect(steps.map(step => step.approver_role_code)).toEqual(['APPROVER']);
    }
  );

  test('rejects when no active director exists', async () => {
    workflowRepository.findRolesByCodes.mockResolvedValue([]);
    workflowRepository.countActiveUsersByRole.mockResolvedValue(0);
    await expect(service.resolveApprovalChain(1, 80000000, 70000000)).rejects.toThrow('Chưa có Giám đốc');
  });
});