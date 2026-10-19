const service = require('./interviewEvaluationService');
const repository = require('../repositories/interviewEvaluationRepository');

jest.mock('../repositories/interviewEvaluationRepository');

describe('interviewEvaluationService', () => {
  const mockInterviewer = { user_id: 5, roles: [{ role_code: 'INTERVIEWER' }] };
  const otherUser = { user_id: 99, roles: [{ role_code: 'INTERVIEWER' }] };
  const mockAdmin = { user_id: 1, roles: [{ role_code: 'ADMIN' }] };

  const mockSchedule = {
    id: 10,
    candidate_id: 2,
    position_id: 1,
    competency_framework_id: 1,
    interviewer_id: 5,
    round_number: 1,
    status: 'SCHEDULED'
  };

  const mockCriteria = [
    { criteria_id: 1, criteria_name: 'Logic', weight: 40.0, description: 'Logic test' },
    { criteria_id: 2, criteria_name: 'Tech', weight: 60.0, description: 'Technical' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEvaluationFormBySchedule', () => {
    it('Chỉ người phỏng vấn được phân công hoặc quản lý mới có quyền xem form', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);

      await expect(service.getEvaluationFormBySchedule(10, otherUser))
        .rejects.toThrow('Bạn không có quyền truy cập phiếu đánh giá của lịch phỏng vấn này.');
    });

    it('Cho phép người phỏng vấn được phân công xem form và lấy tiêu chí', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue(null);
      repository.getCriteriaByFramework.mockResolvedValue(mockCriteria);

      const result = await service.getEvaluationFormBySchedule(10, mockInterviewer);
      expect(result.can_evaluate).toBe(true);
      expect(result.has_evaluated).toBe(false);
      expect(result.criteria).toEqual(mockCriteria);
    });

    it('Trả về phiếu đã nộp nếu đã đánh giá trước đó (Xem lại phiếu đã nộp)', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      const existingEval = { id: 100, total_score: 4.5, recommendation: 'RECOMMENDED' };
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue(existingEval);
      repository.getEvaluationDetails.mockResolvedValue([{ criteria_id: 1, score: 5 }]);
      repository.getCriteriaByFramework.mockResolvedValue(mockCriteria);

      const result = await service.getEvaluationFormBySchedule(10, mockInterviewer);
      expect(result.has_evaluated).toBe(true);
      expect(result.can_evaluate).toBe(false);
      expect(result.evaluation.total_score).toBe(4.5);
    });
  });

  describe('submitEvaluation', () => {
    const validBody = {
      interview_schedule_id: 10,
      recommendation: 'RECOMMENDED',
      general_comments: 'Ứng viên rất xuất sắc, phù hợp công việc.',
      criteria_scores: [
        { criteria_id: 1, criteria_name: 'Logic', weight: 40.0, score: 5 },
        { criteria_id: 2, criteria_name: 'Tech', weight: 60.0, score: 4 }
      ]
    };

    it('Từ chối nếu không phải người phỏng vấn được phân công', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);

      await expect(service.submitEvaluation(validBody, otherUser))
        .rejects.toThrow('Chỉ người phỏng vấn được phân công cho lịch này mới có quyền chấm phiếu.');
    });

    it('Chống tạo hai phiếu chốt cho cùng lượt', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue({ id: 999 });

      await expect(service.submitEvaluation(validBody, mockInterviewer))
        .rejects.toThrow('Không được tạo hai phiếu chốt cho cùng lượt.');
    });

    it('Kiểm tra trường bắt buộc: thiếu nhận xét hoặc kết luận', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue(null);

      // Thiếu nhận xét
      await expect(service.submitEvaluation({ ...validBody, general_comments: '   ' }, mockInterviewer))
        .rejects.toThrow('Vui lòng nhập nhận xét và căn cứ đánh giá tổng hợp.');

      // Kết luận không hợp lệ
      await expect(service.submitEvaluation({ ...validBody, recommendation: 'INVALID' }, mockInterviewer))
        .rejects.toThrow('Kết luận phải là một trong các giá trị');
    });

    it('Tính điểm tổng hợp theo trọng số chính xác: 5*0.4 + 4*0.6 = 4.40', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue(null);
      repository.createEvaluation.mockResolvedValue(101);
      repository.getEvaluationById.mockResolvedValue({ id: 101, total_score: 4.4 });
      repository.getEvaluationDetails.mockResolvedValue([]);

      const result = await service.submitEvaluation(validBody, mockInterviewer);

      expect(repository.createEvaluation).toHaveBeenCalledWith(expect.objectContaining({
        total_score: 4.4,
        recommendation: 'RECOMMENDED',
        general_comments: 'Ứng viên rất xuất sắc, phù hợp công việc.'
      }));
      expect(result.message).toBe('Nộp phiếu đánh giá thành công.');
    });

    it('Xử lý đúng khi thiếu trọng số: tính trung bình cộng đơn giản', async () => {
      repository.getScheduleById.mockResolvedValue(mockSchedule);
      repository.getEvaluationByScheduleAndInterviewer.mockResolvedValue(null);
      repository.createEvaluation.mockResolvedValue(102);
      repository.getEvaluationById.mockResolvedValue({ id: 102 });
      repository.getEvaluationDetails.mockResolvedValue([]);

      const bodyWithoutWeights = {
        ...validBody,
        criteria_scores: [
          { criteria_id: 1, criteria_name: 'Logic', weight: null, score: 4 },
          { criteria_id: 2, criteria_name: 'Tech', weight: null, score: 5 }
        ]
      };

      await service.submitEvaluation(bodyWithoutWeights, mockInterviewer);

      // (4 + 5) / 2 = 4.5
      expect(repository.createEvaluation).toHaveBeenCalledWith(expect.objectContaining({
        total_score: 4.5
      }));
    });
  });
});
