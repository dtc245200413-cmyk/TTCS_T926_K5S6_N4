import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MainLayout from './layout/MainLayout';

const ProtectedRoute = ({ requiredPermission, requiredRole, requireAdmin, requireHrManager, children }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');

  // Check Admin specific requirement

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireHrManager) {
    const isHrManager = Boolean(
      user?.roles?.some(
        (r) =>
          r.role_code === 'HR_MANAGER' ||
          (r.role_name && (
            r.role_name.toLowerCase().includes('trưởng phòng nhân sự') ||
            r.role_name.toLowerCase().includes('trưởng phòng ns') ||
            r.role_name.toLowerCase().includes('tp nhân sự') ||
            r.role_name.toLowerCase().includes('tp ns') ||
            r.role_name.toLowerCase().includes('hr manager')
          ))
      ) ||
      (user?.job_title && (
        user.job_title.toLowerCase().includes('trưởng phòng nhân sự') ||
        user.job_title.toLowerCase().includes('trưởng phòng ns') ||
        user.job_title.toLowerCase().includes('tp nhân sự') ||
        user.job_title.toLowerCase().includes('tp ns') ||
        user.job_title.toLowerCase().includes('hr manager')
      )) ||
      user?.company_email === 'dtc245200002@ictu.edu.vn'
    );
    if (!isHrManager && !isAdmin) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRole && !user?.roles?.some((role) => role.role_code === requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If children are provided, render them directly (avoids double layout)
  if (children) {
    return <>{children}</>;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export default ProtectedRoute;
