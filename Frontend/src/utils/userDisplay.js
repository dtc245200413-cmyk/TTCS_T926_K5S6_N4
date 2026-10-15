export const getDisplayJobTitle = (user) => {
  const hasHiringManagerRole = user?.roles?.some(role => role.role_code === 'HIRING_MANAGER');
  const storedTitle = String(user?.job_title || '').trim();
  const usesDepartmentSpecificManagerTitle = /^trưởng bộ phận(?:\s|$)/i.test(storedTitle);

  if (hasHiringManagerRole || usesDepartmentSpecificManagerTitle) return 'Trưởng bộ phận';
  return storedTitle || user?.roles?.[0]?.role_name || 'Nhân viên';
};