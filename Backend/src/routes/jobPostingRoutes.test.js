const { authorize } = require('../middleware/authMiddleware');
const { requireRoles } = require('../utils/roles');
const controller = require('../controllers/jobPostingController');
const service = require('../services/jobPostingService');

jest.mock('../services/jobPostingService', () => ({
  hide: jest.fn(),
  unhide: jest.fn(),
  close: jest.fn(),
  getPublicJobs: jest.fn(),
  getPublicJob: jest.fn(),
  getPublicFilterOptions: jest.fn()
}));

describe('Sprint 3: Phân quyền Recruiter ẩn/gỡ tin và Cổng tuyển dụng công khai', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: null, params: {}, body: {}, query: {}, ip: '127.0.0.1', headers: { 'x-forwarded-for': '127.0.0.1' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('Phân quyền ẩn/gỡ tin (Chỉ recruiter được phân quyền)', () => {
    it('Recruiter CÓ quyền JOB_POSTING_CLOSE được phép thực hiện', () => {
      req.user = {
        user_id: 3,
        roles: [{ role_code: 'RECRUITER' }],
        permissions: ['USER_VIEW', 'JOB_POSTING_CLOSE']
      };

      const roleCheck = requireRoles('ADMIN', 'RECRUITER');
      roleCheck(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const permCheck = authorize('JOB_POSTING_CLOSE');
      permCheck(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('Recruiter KHÔNG có quyền JOB_POSTING_CLOSE bị từ chối 403', () => {
      req.user = {
        user_id: 3,
        roles: [{ role_code: 'RECRUITER' }],
        permissions: ['USER_VIEW'] // Bị admin thu hồi quyền JOB_POSTING_CLOSE
      };

      const roleCheck = requireRoles('ADMIN', 'RECRUITER');
      roleCheck(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      const permCheck = authorize('JOB_POSTING_CLOSE');
      permCheck(req, res, next);
      expect(next).toHaveBeenCalledTimes(1); // Không được gọi tiếp
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Bạn không có quyền')
      }));
    });

    it('Vai trò khác (Hiring Manager, Interviewer) bị từ chối 403 dù có gán nhầm quyền', () => {
      req.user = {
        user_id: 4,
        roles: [{ role_code: 'HIRING_MANAGER' }],
        permissions: ['JOB_POSTING_CLOSE']
      };

      const roleCheck = requireRoles('ADMIN', 'RECRUITER');
      roleCheck(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringContaining('Bạn không có quyền')
      }));
    });

    it('Người dùng chưa đăng nhập bị từ chối 401', () => {
      req.user = null;
      const roleCheck = requireRoles('ADMIN', 'RECRUITER');
      roleCheck(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Controller endpoints: Ẩn, Hiện lại, Gỡ tin', () => {
    beforeEach(() => {
      req.user = { user_id: 3, full_name: 'Nhân viên Tuyển dụng' };
      req.params = { id: '5' };
    });

    it('controller.hide gọi service.hide và trả về thông báo thành công', async () => {
      service.hide.mockResolvedValue({ id: 5, status: 'HIDDEN' });

      await controller.hide(req, res, next);

      expect(service.hide).toHaveBeenCalledWith('5', 3, expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Đã ẩn tin tuyển dụng khỏi trang công khai.',
        data: expect.objectContaining({ status: 'HIDDEN' })
      }));
    });

    it('controller.unhide gọi service.unhide và trả về thông báo thành công', async () => {
      service.unhide.mockResolvedValue({ id: 5, status: 'PUBLISHED' });

      await controller.unhide(req, res, next);

      expect(service.unhide).toHaveBeenCalledWith('5', 3, expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Đã hiển thị lại tin tuyển dụng trên trang công khai.',
        data: expect.objectContaining({ status: 'PUBLISHED' })
      }));
    });

    it('controller.close gọi service.close và trả về thông báo thành công', async () => {
      service.close.mockResolvedValue({ id: 5, status: 'CLOSED' });

      await controller.close(req, res, next);

      expect(service.close).toHaveBeenCalledWith('5', 3, expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Đã gỡ tin tuyển dụng khỏi trang công khai.',
        data: expect.objectContaining({ status: 'CLOSED' })
      }));
    });
  });

  describe('Controller endpoints: Cổng công khai', () => {
    it('controller.getPublicJobs trả về danh sách việc làm công khai', async () => {
      req.query = { search: 'React', departmentId: '1' };
      service.getPublicJobs.mockResolvedValue([{ id: 1, title: 'React Developer' }]);

      await controller.getPublicJobs(req, res, next);

      expect(service.getPublicJobs).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [{ id: 1, title: 'React Developer' }]
      }));
    });

    it('controller.getPublicFilterOptions trả về danh mục bộ lọc', async () => {
      service.getPublicFilterOptions.mockResolvedValue({
        departments: [{ id: 1, name: 'IT' }],
        locations: [{ name: 'Hà Nội' }],
        workTypes: [{ name: 'Toàn thời gian' }]
      });

      await controller.getPublicFilterOptions(req, res, next);

      expect(service.getPublicFilterOptions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          departments: expect.any(Array),
          locations: expect.any(Array),
          workTypes: expect.any(Array)
        })
      }));
    });
  });
});
