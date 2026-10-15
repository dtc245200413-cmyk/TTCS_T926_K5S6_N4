const jobPostingRepository = require('../repositories/jobPostingRepository');
const auditRepository = require('../repositories/auditRepository');
const jobPostingService = require('./jobPostingService');

jest.mock('../repositories/jobPostingRepository', () => ({
  findEligibleRequests: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findApprovedRequest: jest.fn(),
  hasActivePostingForRequest: jest.fn(),
  create: jest.fn(),
  updateDraft: jest.fn(),
  submit: jest.fn(),
  review: jest.fn(),
  publish: jest.fn(),
  hide: jest.fn(),
  unhide: jest.fn(),
  close: jest.fn(),
  findPublic: jest.fn(),
  findPublicFilterOptions: jest.fn(),
  findPublicById: jest.fn()
}));

jest.mock('../repositories/auditRepository', () => ({
  createLog: jest.fn()
}));

jest.mock('../repositories/candidateMergeRepository', () => ({
  findPotentialDuplicates: jest.fn()
}));

jest.mock('../repositories/candidatePortalRepository', () => ({
  applyToPosting: jest.fn()
}));

jest.mock('./candidateService', () => ({
  createCandidate: jest.fn()
}));

describe('Sprint 3: Quản lý và xem tin tuyển dụng', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auditRepository.createLog.mockResolvedValue(undefined);
  });

  describe('Là Ứng viên: Xem danh sách, tìm kiếm, lọc và xem chi tiết', () => {
    it('cho phép ứng viên xem danh sách các tin đã xuất bản còn hiệu lực mà không cần đăng nhập', async () => {
      const mockJobs = [
        {
          id: 1,
          title: 'Frontend Developer',
          department_id: 1,
          department_name: 'IT',
          location_name: 'Hà Nội',
          work_type_name: 'Toàn thời gian',
          salary_display: '15 - 25 triệu',
          deadline: '2026-12-31',
          status: 'PUBLISHED'
        },
        {
          id: 2,
          title: 'HR Executive',
          department_id: 2,
          department_name: 'HR',
          location_name: 'TP. Hồ Chí Minh',
          work_type_name: 'Toàn thời gian',
          salary_display: '10 - 18 triệu',
          deadline: '2026-11-30',
          status: 'PUBLISHED'
        }
      ];

      jobPostingRepository.findPublic.mockResolvedValue(mockJobs);

      const result = await jobPostingService.getPublicJobs({});
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Frontend Developer');
      expect(jobPostingRepository.findPublic).toHaveBeenCalledWith({});
    });

    it('hỗ trợ tìm kiếm theo từ khóa và lọc theo phòng ban, địa điểm, hình thức làm việc', async () => {
      const filters = {
        search: 'Developer',
        departmentId: '1',
        location: 'Hà Nội',
        workType: 'Toàn thời gian'
      };

      jobPostingRepository.findPublic.mockResolvedValue([
        {
          id: 1,
          title: 'Frontend Developer',
          department_id: 1,
          location_name: 'Hà Nội',
          work_type_name: 'Toàn thời gian'
        }
      ]);

      const result = await jobPostingService.getPublicJobs(filters);
      expect(jobPostingRepository.findPublic).toHaveBeenCalledWith(filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Frontend Developer');
    });

    it('xem chi tiết tin tuyển dụng có đầy đủ mô tả, yêu cầu, quyền lợi và hạn nộp', async () => {
      const mockDetail = {
        id: 1,
        title: 'Backend Engineer',
        description: 'Phát triển hệ thống microservices backend hiệu năng cao.',
        requirements: 'Tối thiểu 2 năm kinh nghiệm Node.js hoặc Java.',
        benefits: 'Thưởng hiệu quả, bảo hiểm sức khỏe PTI, hỗ trợ ăn trưa.',
        deadline: '2026-12-31',
        work_location: 'Hà Nội',
        job_type: 'Toàn thời gian',
        salary_display: '20 - 35 triệu',
        department_name: 'Kỹ thuật Công nghệ',
        headcount: 3
      };

      jobPostingRepository.findPublicById.mockResolvedValue(mockDetail);

      const result = await jobPostingService.getPublicJob(1);
      expect(result).toBeDefined();
      expect(result.description).toContain('Phát triển hệ thống microservices');
      expect(result.requirements).toContain('Node.js');
      expect(result.benefits).toContain('bảo hiểm');
      expect(result.deadline).toBe('2026-12-31');
    });

    it('tin hết hạn hoặc bị ẩn/gỡ trả về lỗi 404 khi ứng viên xem chi tiết', async () => {
      jobPostingRepository.findPublicById.mockResolvedValue(null);

      await expect(jobPostingService.getPublicJob(999)).rejects.toThrow('Tin tuyển dụng không tồn tại hoặc đã hết hạn.');
    });
  });

  describe('Là Nhân viên tuyển dụng: Ẩn hoặc gỡ tin hết hiệu lực', () => {
    it('cho phép ẩn tin tuyển dụng đang xuất bản khỏi trang công khai và ghi audit log', async () => {
      const existingPosting = {
        id: 1,
        title: 'Senior DevOps',
        status: 'PUBLISHED',
        deadline: '2026-12-31'
      };

      jobPostingRepository.findById
        .mockResolvedValueOnce(existingPosting)
        .mockResolvedValueOnce({ ...existingPosting, status: 'HIDDEN' });

      jobPostingRepository.hide.mockResolvedValue(undefined);

      const result = await jobPostingService.hide(1, 3, '127.0.0.1');

      expect(jobPostingRepository.hide).toHaveBeenCalledWith(1, 3);
      expect(auditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'JOB_POSTING_HIDDEN',
        entityId: '1',
        description: expect.stringContaining('Ẩn tin tuyển dụng khỏi trang công khai')
      }));
      expect(result.status).toBe('HIDDEN');
    });

    it('báo lỗi khi cố gắng ẩn tin đã bị gỡ', async () => {
      jobPostingRepository.findById.mockResolvedValue({
        id: 1,
        title: 'Senior DevOps',
        status: 'CLOSED'
      });

      await expect(jobPostingService.hide(1, 3, '127.0.0.1'))
        .rejects.toThrow('Tin tuyển dụng đã bị gỡ, không thể ẩn.');
    });

    it('cho phép hiển thị lại (bỏ ẩn) tin đang ẩn nếu còn hạn nộp', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
      const existingPosting = {
        id: 1,
        title: 'Senior DevOps',
        status: 'HIDDEN',
        deadline: futureDate
      };

      jobPostingRepository.findById
        .mockResolvedValueOnce(existingPosting)
        .mockResolvedValueOnce({ ...existingPosting, status: 'PUBLISHED' });

      jobPostingRepository.unhide.mockResolvedValue(undefined);

      const result = await jobPostingService.unhide(1, 3, '127.0.0.1');

      expect(jobPostingRepository.unhide).toHaveBeenCalledWith(1);
      expect(auditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'JOB_POSTING_UNHIDDEN',
        entityId: '1'
      }));
      expect(result.status).toBe('PUBLISHED');
    });

    it('từ chối bỏ ẩn nếu tin đã hết hạn nộp', async () => {
      const pastDate = '2020-01-01';
      jobPostingRepository.findById.mockResolvedValue({
        id: 1,
        title: 'Old Job',
        status: 'HIDDEN',
        deadline: pastDate
      });

      await expect(jobPostingService.unhide(1, 3, '127.0.0.1'))
        .rejects.toThrow('Tin tuyển dụng đã hết hạn nộp hồ sơ, không thể hiển thị lại.');
    });

    it('cho phép gỡ tin đang xuất bản hoặc đang ẩn và ghi audit log', async () => {
      const existingPosting = {
        id: 2,
        title: 'Product Owner',
        status: 'PUBLISHED',
        deadline: '2026-10-01'
      };

      jobPostingRepository.findById
        .mockResolvedValueOnce(existingPosting)
        .mockResolvedValueOnce({ ...existingPosting, status: 'CLOSED' });

      jobPostingRepository.close.mockResolvedValue(undefined);

      const result = await jobPostingService.close(2, 3, '127.0.0.1');

      expect(jobPostingRepository.close).toHaveBeenCalledWith(2);
      expect(auditRepository.createLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'JOB_POSTING_CLOSED',
        entityId: '2',
        description: expect.stringContaining('Gỡ tin tuyển dụng khỏi trang công khai')
      }));
      expect(result.status).toBe('CLOSED');
    });

    it('báo lỗi nếu gỡ tin nháp chưa xuất bản', async () => {
      jobPostingRepository.findById.mockResolvedValue({
        id: 3,
        title: 'Draft Job',
        status: 'DRAFT'
      });

      await expect(jobPostingService.close(3, 3, '127.0.0.1'))
        .rejects.toThrow('Chỉ có thể gỡ tin đang xuất bản hoặc đang ẩn.');
    });
  });
});
