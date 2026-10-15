import React, { useContext } from 'react';
import {
  Navigate,
  Outlet
} from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';
import MainLayout from './layout/MainLayout';

const ProtectedRoute = ({
  requiredPermission,
  requiredRole,
  requiredRoles,
  requireAdmin,
  requireHrManager,
  children
}) => {
  const {
    user,
    loading,
    hasPermission
  } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /*
   * Chuẩn hóa role.
   *
   * Hỗ trợ cả:
   * roles: [{ role_code: 'RECRUITER' }]
   *
   * và:
   * roles: ['RECRUITER']
   */
  const roleCodes = (user.roles || [])
    .map((role) => {
      if (typeof role === 'string') {
        return role;
      }

      return role?.role_code;
    })
    .filter(Boolean);

  const hasRole = (roleCode) =>
    roleCodes.includes(roleCode);

  const isAdmin = hasRole('ADMIN');
  const isHrManager = hasRole('HR_MANAGER');

  /*
   * Chỉ Admin
   */
  if (
    requireAdmin &&
    !isAdmin
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /*
   * Chỉ HR Manager hoặc Admin.
   *
   * Không kiểm tra bằng email hay job_title nữa.
   * Role code là nguồn xác định quyền chính xác.
   */
  if (
    requireHrManager &&
    !isHrManager &&
    !isAdmin
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /*
   * Kiểm tra permission.
   */
  if (
    requiredPermission &&
    !hasPermission(requiredPermission)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /*
   * Kiểm tra đúng một role.
   *
   * Giữ lại để không làm hỏng
   * các route cũ đang dùng requiredRole.
   */
  if (
    requiredRole &&
    !hasRole(requiredRole)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  /*
   * Kiểm tra nhiều role.
   *
   * Chỉ cần người dùng có một trong
   * các role được phép là PASS.
   *
   * Ví dụ:
   * requiredRoles={[
   *   'RECRUITER',
   *   'HR_MANAGER'
   * ]}
   */
  if (
    Array.isArray(requiredRoles) &&
    requiredRoles.length > 0
  ) {
    const allowed = requiredRoles.some(
      (roleCode) =>
        hasRole(roleCode)
    );

    if (!allowed) {
      return (
        <Navigate
          to="/unauthorized"
          replace
        />
      );
    }
  }

  /*
   * Nếu truyền children thì render trực tiếp.
   */
  if (children) {
    return <>{children}</>;
  }

  /*
   * Route cấp cha.
   */
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export default ProtectedRoute;