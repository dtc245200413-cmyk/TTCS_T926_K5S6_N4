const { authorize } = require('./authMiddleware');

describe('authMiddleware - authorize', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('Vai trò 1 (ADMIN): Truy cập hợp lệ khi có quyền (USER_CREATE)', () => {
    req.user = {
      roles: [{ role_code: 'ADMIN' }],
      permissions: ['USER_VIEW', 'USER_CREATE', 'USER_UPDATE']
    };
    
    const middleware = authorize('USER_CREATE');
    middleware(req, res, next);
    
    // Server phải cho phép đi tiếp (next)
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('Vai trò 2 (INTERVIEWER): Bị từ chối khi không có quyền (Thiếu USER_CREATE)', () => {
    req.user = {
      roles: [{ role_code: 'INTERVIEWER' }],
      permissions: ['USER_VIEW'] // Chỉ có quyền xem
    };
    
    const middleware = authorize('USER_CREATE');
    middleware(req, res, next);
    
    // Server phải chặn lại và báo lỗi 403 bằng tiếng Việt
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Bạn không có quyền truy cập chức năng này. Vui lòng liên hệ quản trị viên.'
    }));
  });

  it('Vai trò 3 (CANDIDATE): Bị từ chối khi không có bất kỳ quyền nào', () => {
    req.user = {
      roles: [{ role_code: 'CANDIDATE' }],
      permissions: [] // Không có quyền nào
    };
    
    const middleware = authorize('USER_VIEW');
    middleware(req, res, next);
    
    // Server phải chặn lại và báo lỗi 403 bằng tiếng Việt
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Bạn không có quyền truy cập chức năng này. Vui lòng liên hệ quản trị viên.'
    }));
  });
});
