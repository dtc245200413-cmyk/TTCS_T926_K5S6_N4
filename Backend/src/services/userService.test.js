const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/auditRepository');
const userService = require('./userService');

jest.mock('bcrypt', () => ({
  hash: jest.fn()
}));

jest.mock('../config/database', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn()
  }
}));

jest.mock('../repositories/userRepository', () => ({
  findById: jest.fn(),
  getRolesAndPermissions: jest.fn(),
  update: jest.fn()
}));

jest.mock('../repositories/auditRepository', () => ({
  createLog: jest.fn()
}));

describe('SCRUM-58 - updateUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    userRepository.findById.mockResolvedValue({
      user_id: 1,
      employee_code: 'EMP001',
      full_name: 'Nguyễn Văn A',
      company_email: 'a@example.com',
      phone_number: '0912345678',
      job_title: 'Nhân viên (Staff)',
      department_id: 2,
      department_name: 'Nhân Sự',
      department_code: 'HR',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      last_login_at: null,
      password_changed_at: null,
      created_at: null,
      updated_at: null
    });
    userRepository.getRolesAndPermissions.mockResolvedValue([
      { role_id: 1, role_code: 'RECRUITER', role_name: 'Nhân viên tuyển dụng' }
    ]);
    userRepository.update.mockResolvedValue(true);
    auditRepository.createLog.mockResolvedValue(undefined);
  });

  it('cho phép cập nhật họ tên, số điện thoại và chức danh', async () => {
    const result = await userService.updateUser(1, {
      full_name: '  Trần Văn B  ',
      phone_number: '0912345678',
      job_title: 'Lập trình viên (Developer)'
    }, 1, '127.0.0.1');

    expect(userRepository.update).toHaveBeenCalledWith(1, {
      full_name: 'Trần Văn B',
      phone_number: '0912345678',
      job_title: 'Lập trình viên (Developer)'
    });
    expect(result.roles).toEqual([
      { role_id: 1, role_code: 'RECRUITER', role_name: 'Nhân viên tuyển dụng' }
    ]);
  });

  it.each([
    ['email', { company_email: 'new@example.com' }],
    ['phòng ban', { department_id: 3 }],
    ['vai trò', { roleId: 2 }]
  ])('từ chối thay đổi %s', async (_field, payload) => {
    await expect(userService.updateUser(1, payload, 1, '127.0.0.1'))
      .rejects
      .toThrow('Email, phòng ban và vai trò không thể thay đổi');

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('từ chối số điện thoại không đúng định dạng Việt Nam', async () => {
    await expect(userService.updateUser(1, {
      phone_number: '0123456789'
    }, 1, '127.0.0.1')).rejects.toThrow('Số điện thoại không hợp lệ');

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('cho phép xoá số điện thoại bằng cách gửi chuỗi rỗng', async () => {
    await userService.updateUser(1, {
      phone_number: ''
    }, 1, '127.0.0.1');

    expect(userRepository.update).toHaveBeenCalledWith(1, {
      phone_number: null
    });
  });
});
