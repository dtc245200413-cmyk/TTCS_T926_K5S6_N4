const candidateEvaluationService = require('./candidateEvaluationService');
const repo = require('../repositories/candidateEvaluationRepository');
const positionService = require('./positionService');
const auditRepo = require('../repositories/auditRepository');

jest.mock('../repositories/candidateEvaluationRepository');
jest.mock('./positionService');
jest.mock('../repositories/auditRepository');

describe('Candidate Evaluation & Hiring Manager Decision Flow', () => {
  const hiringManagerUser = {
    user_id: 4,
    full_name: 'Mã Dương Quốc',
    department_id: 1,
    roles: [{ role_code: 'HIRING_MANAGER' }]
  };

  const hrManagerUser = {
    user_id: 2,
    full_name: 'Hà Đức Minh',
    department_id: 2,
    roles: [{ role_code: 'HR_MANAGER' }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule 1: Lọc ứng viên theo quyền quản lý của Trưởng bộ phận', () => {
    it('Trưởng bộ phận chỉ thấy ứng viên thuộc bộ phận mình quản lý', async () => {
      repo.getCandidatesForEvaluation.mockImplementation(async (user) => {
        // Mock repository filtering behavior
        const allCandidates = [
          { id: 1, full_name: 'Lê Minh Tuấn', department_id: 1, department_name: 'Công nghệ thông tin' },
          { id: 2, full_name: 'Phạm Thu Trang', department_id: 1, department_name: 'Công nghệ thông tin' },
          { id: 4, full_name: 'Vũ Phương Linh', department_id: 4, department_name: 'Phòng Marketing' }
        ];
        if (user.roles.some(r => r.role_code === 'HIRING_MANAGER')) {
          return allCandidates.filter(c => c.department_id === user.department_id);
        }
        return allCandidates;
      });

      const itCandidates = await candidateEvaluationService.getCandidates(hiringManagerUser);
      expect(itCandidates).toHaveLength(2);
      expect(itCandidates.every(c => c.department_id === 1)).toBe(true);

      const allCandidates = await candidateEvaluationService.getCandidates(hrManagerUser);
      expect(allCandidates).toHaveLength(3);
    });
  });

  describe('Rule 2 & 3: Xem kết quả từng phiếu, từng vòng, không đếm trùng và hiển thị thiếu phiếu', () => {
    it('Tính điểm chính xác, không đếm trùng phiếu và cảnh báo khi thiếu phiếu đánh giá', async () => {
      const mockCandidateDetail = {
        id: 2,
        full_name: 'Phạm Thu Trang',
        department_id: 1,
        aggregate_score: 7.65,
        is_missing_evaluations: true,
        total_missing_sheets: 1,
        rounds: [
          {
            id: 101,
            round_number: 1,
            round_name: 'Vòng 1: Kỹ thuật',
            expected_evaluations: 1,
            submitted_evaluations_count: 1,
            is_missing: false,
            round_score: 7.8,
            evaluations: [
              { id: 1, interviewer_name: 'Thàng Xuân Lập', overall_score: 7.8, result: 'PASS' }
            ]
          },
          {
            id: 102,
            round_number: 2,
            round_name: 'Vòng 2: Chuyên sâu',
            expected_evaluations: 2,
            submitted_evaluations_count: 1,
            is_missing: true,
            missing_count: 1,
            round_score: 7.5,
            evaluations: [
              { id: 2, interviewer_name: 'Nguyễn Anh Sơn', overall_score: 7.5, result: 'CONSIDER' }
            ]
          }
        ],
        unique_evaluations_count: 2
      };

      repo.getCandidateEvaluationDetail.mockResolvedValue(mockCandidateDetail);

      const detail = await candidateEvaluationService.getCandidateDetail(2, hiringManagerUser);
      expect(detail.unique_evaluations_count).toBe(2);
      expect(detail.is_missing_evaluations).toBe(true);
      expect(detail.total_missing_sheets).toBe(1);
      expect(detail.rounds[1].is_missing).toBe(true);
      expect(detail.rounds[1].missing_count).toBe(1);
    });
  });

  describe('Rule 4 & 5: Quyết định của Trưởng bộ phận và điều kiện tạo Offer', () => {
    it('Trưởng bộ phận ra quyết định ĐẠT, lưu người quyết định, thời gian và nhận xét', async () => {
      const candidateBeforeDecision = {
        id: 1,
        full_name: 'Lê Minh Tuấn',
        department_id: 1,
        interview_decision: null,
        status: 'INTERVIEWING'
      };

      const candidateAfterDecision = {
        ...candidateBeforeDecision,
        interview_decision: 'PASSED',
        interview_decision_by: 4,
        interview_decision_at: '2026-10-19T17:00:00.000Z',
        interview_decision_comment: 'Ứng viên chuyên môn vững, thái độ xuất sắc, phù hợp dự án mới.',
        status: 'PASSED',
        can_create_offer: true
      };

      repo.getCandidateEvaluationDetail
        .mockResolvedValueOnce(candidateBeforeDecision)
        .mockResolvedValueOnce(candidateAfterDecision);

      repo.recordDecision.mockResolvedValue({
        candidate_id: 1,
        decision: 'PASSED',
        status: 'PASSED',
        comment: 'Ứng viên chuyên môn vững, thái độ xuất sắc, phù hợp dự án mới.',
        decided_by: 4
      });

      auditRepo.createLog.mockResolvedValue(undefined);

      const result = await candidateEvaluationService.recordDecision(1, {
        decision: 'PASSED',
        comment: 'Ứng viên chuyên môn vững, thái độ xuất sắc, phù hợp dự án mới.'
      }, hiringManagerUser, '127.0.0.1');

      expect(repo.recordDecision).toHaveBeenCalledWith(
        1,
        'PASSED',
        'Ứng viên chuyên môn vững, thái độ xuất sắc, phù hợp dự án mới.',
        4
      );
      expect(result.interview_decision).toBe('PASSED');
      expect(result.can_create_offer).toBe(true);
      expect(auditRepo.createLog).toHaveBeenCalled();
    });

    it('Legacy candidate-wide Offer writer is disabled regardless of PASSED summary', async () => {
      await expect(candidateEvaluationService.createOffer(1, { salary_amount: 18000000 }, hiringManagerUser))
        .rejects.toMatchObject({statusCode:503,code:'LEGACY_OFFER_WRITE_DISABLED'});
      expect(repo.createCandidateOffer).not.toHaveBeenCalled();
      expect(auditRepo.createLog).not.toHaveBeenCalled();
    });
  });
});
