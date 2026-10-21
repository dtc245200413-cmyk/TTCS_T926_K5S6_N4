export const getDisplayJobTitle = (user) => {
  const roles = user?.roles?.map(role => role.role_code) || [];
  if (roles.includes('ADMIN')) return 'Quản trị hệ thống';
  if (roles.includes('HR_MANAGER')) return 'Trưởng phòng Nhân sự';
  if (roles.includes('HIRING_MANAGER')) return 'Trưởng bộ phận';
  if (roles.includes('INTERVIEWER') || user?.company_email === 'dtc245200571@ictu.edu.vn') return 'Người phỏng vấn';
  if (roles.includes('APPROVER')) return 'Người duyệt';
  if (roles.includes('RECRUITER')) return 'Nhân viên tuyển dụng';
  if (roles.includes('CANDIDATE')) return 'Ứng viên';

  const storedTitle = String(user?.job_title || '').trim();
  if (/phỏng vấn|interviewer/i.test(storedTitle)) return 'Người phỏng vấn';
  if (/trưởng bộ phận|hiring/i.test(storedTitle)) return 'Trưởng bộ phận';
  if (/trưởng phòng nhân sự|hr manager/i.test(storedTitle)) return 'Trưởng phòng Nhân sự';
  if (/quản trị|admin/i.test(storedTitle)) return 'Quản trị hệ thống';

  return storedTitle || user?.roles?.[0]?.role_name || 'Nhân viên';
};