const jobPostingRepository = require('../repositories/jobPostingRepository');
const auditRepository = require('../repositories/auditRepository');
const candidateMergeRepository = require('../repositories/candidateMergeRepository');
const candidatePortalRepository = require('../repositories/candidatePortalRepository');
const candidateService = require('./candidateService');
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

const repository = jobPostingRepository;
const service = jobPostingService;

describe('Sprint 3: Quản lý và xem tin tuyển dụng', () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    auditRepository.createLog.mockResolvedValue(undefined);
  });

  describe('1. Tạo bản nháp từ yêu cầu tuyển dụng đã duyệt', () => {
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
      expect(result.salary_display).toBe('20 - 35 triệu');
    });

    it('báo lỗi 404 khi tin tuyển dụng không tồn tại hoặc chưa xuất bản', async () => {
      jobPostingRepository.findPublicById.mockResolvedValue(null);

      await expect(jobPostingService.getPublicJob(999))
        .rejects.toThrow('Tin tuyển dụng không tồn tại hoặc đã hết hạn.');
    });
  });

  describe('Là Ứng viên: Nộp hồ sơ ứng tuyển trực tuyến vào tin tuyển dụng', () => {
    it('cho phép nộp hồ sơ kèm theo file CV và thông tin liên hệ', async () => {
      jobPostingRepository.findPublicById.mockResolvedValue({
        id: 1,
        title: 'Frontend Developer',
        recruitment_request_id: 10
      });
      candidateMergeRepository.findPotentialDuplicates.mockResolvedValue([]);
      candidateService.createCandidate.mockResolvedValue({ id: 5 });
      candidatePortalRepository.applyToPosting.mockResolvedValue({
        applicationId: 100,
        applicationCode: 'HS-2026-00100'
      });

      const applyData = {
        full_name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0912345678',
        cover_letter: 'Tôi có 3 năm kinh nghiệm ReactJS.'
      };

      const result = await jobPostingService.applyToPublicJob(
        1,
        applyData,
        'https://example.com/uploads/cv_123.pdf',
        '127.0.0.1'
      );

      expect(result.application_received).toBe(true);
      expect(result.application_id).toBe(100);
      expect(result.job_title).toBe('Frontend Developer');
      expect(candidateService.createCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Nguyễn Văn A',
          email: 'nguyenvana@example.com',
          phone: '0912345678',
          source_code: 'CAREER_SITE',
          recruitment_request_id: 10,
          resume_url: 'https://example.com/uploads/cv_123.pdf'
        }),
        null,
        '127.0.0.1'
      );
      expect(candidatePortalRepository.applyToPosting).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 5,
          resumeUrl: 'https://example.com/uploads/cv_123.pdf',
          coverLetter: 'Tôi có 3 năm kinh nghiệm ReactJS.'
        })
      );
    });

    it('từ chối khi thiếu họ tên hoặc email hoặc không có CV', async () => {
      jobPostingRepository.findPublicById.mockResolvedValue({ id: 1, title: 'Dev' });

      await expect(
        jobPostingService.applyToPublicJob(1, { email: 'a@b.com' }, null, '127.0.0.1')
      ).rejects.toThrow('Vui lòng nhập họ tên và email.');

      await expect(
        jobPostingService.applyToPublicJob(1, { full_name: 'Nguyễn Văn B', email: 'invalid_email' }, 'cv.pdf', '127.0.0.1')
      ).rejects.toThrow('Email không hợp lệ.');

      await expect(
        jobPostingService.applyToPublicJob(1, { full_name: 'Nguyễn Văn B', email: 'b@b.com' }, null, '127.0.0.1')
      ).rejects.toThrow('Vui lòng đính kèm CV (PDF hoặc Word, tối đa 10 MB).');
    });

    it('báo lỗi khi phát hiện trùng hồ sơ với email hoặc sđt khác của ứng viên khác', async () => {
      jobPostingRepository.findPublicById.mockResolvedValue({ id: 1, title: 'Dev' });
      candidateMergeRepository.findPotentialDuplicates.mockResolvedValue([
        { id: 2, email: 'different@example.com', phone: '0912345678' }
      ]);

      await expect(
        jobPostingService.applyToPublicJob(
          1,
          { full_name: 'C', email: 'c@example.com', phone: '0912345678' },
          'cv.pdf',
          '127.0.0.1'
        )
      ).rejects.toThrow('Email hoặc số điện thoại đã có trong hệ thống.');
    });
  });

  describe('Quản trị: Ẩn/Hiện và Gỡ tin tuyển dụng khỏi trang công khai (Recruiter / HR Manager)', () => {
    it('cho phép ẩn tin đang xuất bản và ghi audit log', async () => {
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
