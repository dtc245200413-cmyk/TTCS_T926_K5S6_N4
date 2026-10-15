import React, { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { CandidateAuthContext } from '../context/CandidateAuthContext';

const CandidateProtectedRoute = () => {
  const { candidate, loading } = useContext(CandidateAuthContext);
  const location = useLocation();
  if (loading) return <div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#64748b' }}>Đang tải hồ sơ ứng viên...</div>;
  if (!candidate) return <Navigate to={`/candidate/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  return <Outlet />;
};

export default CandidateProtectedRoute;