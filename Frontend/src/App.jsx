import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Outlet } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import ChangePassword from './pages/ChangePassword';
import Reports from './pages/Reports';

// User Pages
import UserList from './pages/users/UserList';
import UserDetail from './pages/users/UserDetail';
import UserCreate from './pages/users/UserCreate';
import UserEdit from './pages/users/UserEdit';
import RoleList from './pages/roles/RoleList';
import RecruitmentRequestCreate from './pages/recruitment-requests/RecruitmentRequestCreate';
import RecruitmentRequestList from './pages/recruitment-requests/RecruitmentRequestList';
import RecruitmentRequestDetail from './pages/recruitment-requests/RecruitmentRequestDetail';
import RecruitmentRequestApprovalList from './pages/recruitment-requests/RecruitmentRequestApprovalList';
import CompanyProfile from './pages/company-profile/CompanyProfile';
import MasterData from './pages/master-data/MasterData';
import CandidateList from './pages/candidates/CandidateList';
import CandidateCreate from './pages/candidates/CandidateCreate';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes inside Main Layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/change-password" element={<ChangePassword />} />
            
                      {/* User Management Routes (Admin only) */}
            <Route path="/users" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserList />} />
              <Route path=":id" element={<UserDetail />} />
            </Route>

            {/* User Creation Route (Admin only) */}
            <Route path="/users/create" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserCreate />} />
            </Route>

            {/* User Edit Route (Admin only - can edit any user) */}
            <Route path="/users/:id/edit" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserEdit />} />
            </Route>

            {/* SCRUM-58: Self Profile Edit Route - any authenticated user can edit their OWN profile */}
            <Route path="/profile/edit" element={<UserEdit isSelfEdit={true} />} />
            
            {/* Roles Management Route */}
            <Route path="/roles" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<RoleList />} />
            </Route>

            {/* Company Profile */}
            <Route path="/company-profile" element={<CompanyProfile />} />
            
            {/* Master Data */}
            <Route path="/master-data" element={<MasterData />} />

            {/* Recruitment Request Routes */}
            <Route path="/recruitment-requests" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route index element={<RecruitmentRequestList />} />
              <Route path="approvals" element={<RecruitmentRequestApprovalList />} />
              <Route path="create" element={<RecruitmentRequestCreate />} />
              <Route path=":id" element={<RecruitmentRequestDetail />} />
            </Route>

            {/* Candidate Routes */}
            <Route path="/candidates" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
              <Route index element={<CandidateList />} />
              <Route path="create" element={<CandidateCreate />} />
            </Route>
          </Route>

          {/* Error Pages */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
