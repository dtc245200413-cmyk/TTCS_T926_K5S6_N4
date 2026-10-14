export function candidateProfileAccess(user) {
  const roles = user?.roles?.map(role => role.role_code) || [];
  const blocked = roles.includes('CANDIDATE');
  const canManage = !blocked && roles.some(role => ['ADMIN', 'HR_MANAGER', 'RECRUITER'].includes(role));
  return { canManage, canView: !blocked && (canManage || roles.includes('HIRING_MANAGER')) };
}

export function profileError(error, fallback) {
  if (error.response?.status === 403) return 'Bạn không có quyền truy cập dữ liệu này hoặc hồ sơ nằm ngoài phạm vi được phép.';
  if (error.response?.status === 404) return 'Không tìm thấy ứng viên';
  return error.response?.data?.message || fallback;
}
