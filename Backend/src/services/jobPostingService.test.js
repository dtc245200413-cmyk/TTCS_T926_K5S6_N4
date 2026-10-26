jest.mock('../repositories/jobPostingRepository');
jest.mock('../repositories/auditRepository', () => ({
  createLog: jest.fn().mockResolvedValue()
}));

const repository = require('../repositories/jobPostingRepository');
const service = require('./jobPostingService');

describe('jobPostingService tests', () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Tạo bản nháp từ yêu cầu tuyển dụng đã duyệt', () => {
    test('Báo lỗi rõ ràng nếu thiếu recruitment_request_id', async () => {
      await expect(service.create({}, 1, '127.0.0.1'))
        .rejects.toThrow('Vui lòng chọn yêu cầu tuyển dụng đã được duyệt.');
      expect(repository.findApprovedRequest).not.toHaveBeenCalled();
    });

    test('Báo lỗi nếu không chọn yêu cầu hoặc yêu cầu không tồn tại/chưa duyệt', async () => {
      repository.findApprovedRequest.mockResolvedValue(null);
      await expect(service.create({ recruitment_request_id: 99 }, 1, '127.0.0.1'))
        .rejects.toThrow('Chỉ có thể tạo tin từ yêu cầu tuyển dụng đã được duyệt.');
    });

    test('Báo lỗi nếu yêu cầu này đã có tin đang xử lý hoặc xuất bản', async () => {
      repository.findApprovedRequest.mockResolvedValue({ id: 10, status: 'APPROVED' });
      repository.hasActivePostingForRequest.mockResolvedValue(true);
      await expect(service.create({ recruitment_request_id: 10, deadline: tomorrow }, 1, '127.0.0.1'))
        .rejects.toThrow('Yêu cầu này đã có tin đang chờ duyệt, đã duyệt hoặc đang tuyển.');
    });

    test('Báo lỗi nếu hạn tuyển dụng ở trong quá khứ', async () => {
      repository.findApprovedRequest.mockResolvedValue({ id: 10, status: 'APPROVED', needed_by_date: yesterday });
      repository.hasActivePostingForRequest.mockResolvedValue(false);
      await expect(service.create({ recruitment_request_id: 10, deadline: yesterday }, 1, '127.0.0.1'))
        .rejects.toThrow('Hạn tuyển dụng phải là ngày hiện tại hoặc trong tương lai.');
    });

    test('Tạo bản nháp thành công từ yêu cầu đã duyệt', async () => {
      repository.findApprovedRequest.mockResolvedValue({
        id: 10,
        status: 'APPROVED',
        position_name: 'Frontend Developer',
        job_description: 'Code React',
        candidate_requirements: '2 năm KN',
        location_name: 'Hà Nội',
        work_type_name: 'Toàn thời gian',
        proposed_salary_min: 15000000,
        proposed_salary_max: 20000000,
        needed_by_date: tomorrow
      });
      repository.hasActivePostingForRequest.mockResolvedValue(false);
      repository.create.mockResolvedValue(101);
      repository.findById.mockResolvedValue({
        id: 101,
        title: 'Frontend Developer',
        status: 'DRAFT',
        recruitment_request_id: 10
      });

      const result = await service.create({
        recruitment_request_id: 10,
        deadline: tomorrow
      }, 1, '127.0.0.1');

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        recruitment_request_id: 10,
        title: 'Frontend Developer',
        deadline: tomorrow,
        created_by: 1
      }));
      expect(result.id).toBe(101);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('2. Recruiter gửi duyệt tin (Bản nháp -> Chờ duyệt)', () => {
    test('Báo lỗi nếu gửi duyệt tin khi không ở trạng thái DRAFT hoặc REJECTED', async () => {
      repository.findById.mockResolvedValue({ id: 101, status: 'APPROVED' });
      await expect(service.submit(101, 1, '127.0.0.1'))
        .rejects.toThrow('Chỉ có thể gửi duyệt bản nháp hoặc tin bị từ chối.');
    });

    test('Báo lỗi nếu thiếu tiêu đề hoặc mô tả trước khi gửi duyệt', async () => {
      repository.findById.mockResolvedValue({
        id: 101,
        status: 'DRAFT',
        title: '',
        description: '',
        deadline: tomorrow
      });
      await expect(service.submit(101, 1, '127.0.0.1'))
        .rejects.toThrow('Tin cần có tiêu đề và mô tả trước khi gửi duyệt.');
    });

    test('Gửi duyệt thành công chuyển trạng thái sang PENDING_REVIEW', async () => {
      repository.findById
        .mockResolvedValueOnce({
          id: 101,
          status: 'DRAFT',
          title: 'Backend Dev',
          description: 'Xây dựng API',
          deadline: tomorrow
        })
        .mockResolvedValueOnce({
          id: 101,
          status: 'PENDING_REVIEW',
          title: 'Backend Dev'
        });

      const result = await service.submit(101, 2, '127.0.0.1');
      expect(repository.submit).toHaveBeenCalledWith(101, 2);
      expect(result.status).toBe('PENDING_REVIEW');
    });
  });

  describe('3. Trưởng phòng Nhân sự duyệt hoặc trả chỉnh sửa kèm lý do', () => {
    test('Báo lỗi nếu duyệt tin không ở trạng thái PENDING_REVIEW', async () => {
      repository.findById.mockResolvedValue({ id: 101, status: 'DRAFT' });
      await expect(service.review(101, true, '', 5, '127.0.0.1'))
        .rejects.toThrow('Tin này không ở trạng thái chờ duyệt.');
    });

    test('Báo lỗi nếu trả chỉnh sửa / từ chối mà không có lý do', async () => {
      repository.findById.mockResolvedValue({ id: 101, status: 'PENDING_REVIEW' });
      await expect(service.review(101, false, '   ', 5, '127.0.0.1'))
        .rejects.toThrow('Vui lòng nhập lý do từ chối tin.');
    });

    test('Trả chỉnh sửa thành công với trạng thái REJECTED và lưu lý do', async () => {
      repository.findById
        .mockResolvedValueOnce({ id: 101, status: 'PENDING_REVIEW', title: 'Test Job' })
        .mockResolvedValueOnce({ id: 101, status: 'REJECTED', review_note: 'Cần bổ sung quyền lợi bảo hiểm' });

      const result = await service.review(101, false, 'Cần bổ sung quyền lợi bảo hiểm', 5, '127.0.0.1');
      expect(repository.review).toHaveBeenCalledWith(101, {
        status: 'REJECTED',
        note: 'Cần bổ sung quyền lợi bảo hiểm',
        userId: 5
      });
      expect(result.status).toBe('REJECTED');
      expect(result.review_note).toBe('Cần bổ sung quyền lợi bảo hiểm');
    });

    test('Phê duyệt tin thành công với trạng thái APPROVED', async () => {
      repository.findById
        .mockResolvedValueOnce({ id: 101, status: 'PENDING_REVIEW', title: 'Test Job' })
        .mockResolvedValueOnce({ id: 101, status: 'APPROVED' });

      const result = await service.review(101, true, '', 5, '127.0.0.1');
      expect(repository.review).toHaveBeenCalledWith(101, {
        status: 'APPROVED',
        note: null,
        userId: 5
      });
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('4. Trưởng phòng Nhân sự xuất bản tin (APPROVED -> PUBLISHED)', () => {
    test('Báo lỗi nếu xuất bản tin chưa được duyệt (ví dụ DRAFT hoặc REJECTED)', async () => {
      repository.findById.mockResolvedValue({ id: 101, status: 'DRAFT' });
      await expect(service.publish(101, 5, '127.0.0.1'))
        .rejects.toThrow('Tin phải được duyệt hoặc đang chờ duyệt trước khi xuất bản.');
    });

    test('Xuất bản thành công tin đã APPROVED', async () => {
      repository.findById
        .mockResolvedValueOnce({ id: 101, status: 'APPROVED', title: 'Test Job', deadline: tomorrow })
        .mockResolvedValueOnce({ id: 101, status: 'PUBLISHED', title: 'Test Job' });

      const result = await service.publish(101, 5, '127.0.0.1');
      expect(repository.publish).toHaveBeenCalledWith(101, 5);
      expect(result.status).toBe('PUBLISHED');
    });
  });
});
