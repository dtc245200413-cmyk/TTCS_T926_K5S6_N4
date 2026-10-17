export const getDisplayJobTitle = (user) => {
  const hasHiringManagerRole = user?.roles?.some(role => role.role_code === 'HIRING_MANAGER');
  const isInterviewerRole = user?.roles?.some(role => role.role_code === 'INTERVIEWER') || user?.company_email === 'dtc245200571@ictu.edu.vn';
  const storedTitle = String(user?.job_title || '').trim();
  const usesDepartmentSpecificManagerTitle = /^trưởng bộ phận(?:\s|$)/i.test(storedTitle);

  if (hasHiringManagerRole || usesDepartmentSpecificManagerTitle) return 'Trưởng bộ phận';
  if (isInterviewerRole && (/lập trình viên/i.test(storedTitle) || !storedTitle)) return 'Người phỏng vấn';
  return storedTitle || user?.roles?.[0]?.role_name || 'Nhân viên';
};