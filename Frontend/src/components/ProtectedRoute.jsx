import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MainLayout from './layout/MainLayout';

const ProtectedRoute = ({ requiredPermission, requireAdmin, children }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    const isAdmin = user?.roles?.some(r => r.role_code === 'ADMIN');
    if (!isAdmin) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
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
