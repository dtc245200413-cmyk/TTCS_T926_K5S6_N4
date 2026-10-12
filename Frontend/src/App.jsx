import React from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

/* =========================================================
   PUBLIC / COMMON PAGES
   ========================================================= */

import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Home from './pages/Home';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

import ChangePassword from './pages/ChangePassword';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';

/* =========================================================
   USER MANAGEMENT
   ========================================================= */

import UserList from './pages/users/UserList';
import UserDetail from './pages/users/UserDetail';
import UserCreate from './pages/users/UserCreate';
import UserEdit from './pages/users/UserEdit';
import UserImport from './pages/users/UserImport';

import AccountList from './pages/accounts/AccountList';
import AuditLogList from './pages/audit-logs/AuditLogList';
import RoleList from './pages/roles/RoleList';

/* =========================================================
   ORGANIZATION / HR
   ========================================================= */

import DepartmentList from './pages/departments/DepartmentList';
import PositionManagement from './pages/positions/PositionManagement';

import CompetencyFrameworkList from './pages/competency-frameworks/CompetencyFrameworkList';
import CompetencyFrameworkForm from './pages/competency-frameworks/CompetencyFrameworkForm';

import QuestionBank from './pages/questions/QuestionBank';

import CompanyProfile from './pages/company-profile/CompanyProfile';
import MasterData from './pages/master-data/MasterData';

/* =========================================================
   RECRUITMENT REQUEST
   ========================================================= */

import RecruitmentRequestCreate from './pages/recruitment-requests/RecruitmentRequestCreate';
import RecruitmentRequestList from './pages/recruitment-requests/RecruitmentRequestList';
import RecruitmentRequestDetail from './pages/recruitment-requests/RecruitmentRequestDetail';
import RecruitmentRequestApprovalList from './pages/recruitment-requests/RecruitmentRequestApprovalList';

/* =========================================================
   CANDIDATES
   ========================================================= */

import CandidateList from './pages/candidates/CandidateList';
import CandidateCreate from './pages/candidates/CandidateCreate';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* =====================================================
              PUBLIC ROUTES
             ===================================================== */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* =====================================================
              AUTHENTICATED ROUTES
             ===================================================== */}

          <Route element={<ProtectedRoute />}>

            {/* Dashboard */}
            <Route
              path="/"
              element={<Home />}
            />

            {/* Admin Dashboard */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={<Reports />}
            />

            {/* Notifications */}
            <Route
              path="/notifications"
              element={<Notifications />}
            />

            {/* Change Password */}
            <Route
              path="/change-password"
              element={<ChangePassword />}
            />

            {/* =================================================
                POSITION MANAGEMENT
               ================================================= */}

            <Route
              path="/positions"
              element={
                <ProtectedRoute requireHrManager={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<PositionManagement />}
              />
            </Route>

            {/* =================================================
                COMPETENCY FRAMEWORK
               ================================================= */}

            <Route
              path="/competency-frameworks"
              element={<CompetencyFrameworkList />}
            />

            <Route
              path="/competency-frameworks/create"
              element={
                <ProtectedRoute requiredPermission="COMPETENCY_MANAGE">
                  <CompetencyFrameworkForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competency-frameworks/:id/edit"
              element={<CompetencyFrameworkForm />}
            />

            {/* =================================================
                QUESTION BANK
               ================================================= */}

            <Route
              path="/questions"
              element={<QuestionBank />}
            />

            {/* =================================================
                USER MANAGEMENT
               ================================================= */}

            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<UserList />}
              />

              <Route
                path="import"
                element={<UserImport />}
              />

              <Route
                path=":id"
                element={<UserDetail />}
              />
            </Route>

            {/* Create User */}
            <Route
              path="/users/create"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<UserCreate />}
              />
            </Route>

            {/* Edit User */}
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<UserEdit />}
              />
            </Route>

            {/* Self Profile */}
            <Route
              path="/profile/edit"
              element={
                <UserEdit isSelfEdit={true} />
              }
            />

            {/* =================================================
                ACCOUNT MANAGEMENT
               ================================================= */}

            <Route
              path="/accounts"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<AccountList />}
              />
            </Route>

            {/* =================================================
                ROLE MANAGEMENT
               ================================================= */}

            <Route
              path="/roles"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<RoleList />}
              />
            </Route>

            {/* =================================================
                AUDIT LOGS
               ================================================= */}

            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<AuditLogList />}
              />
            </Route>

            {/* =================================================
                DEPARTMENT MANAGEMENT
               ================================================= */}

            <Route
              path="/departments"
              element={
                <ProtectedRoute requireHrManager={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<DepartmentList />}
              />
            </Route>

            {/* =================================================
                COMPANY PROFILE
               ================================================= */}

            <Route
              path="/company-profile"
              element={<CompanyProfile />}
            />

            {/* =================================================
                MASTER DATA
               ================================================= */}

            <Route
              path="/master-data"
              element={<MasterData />}
            />

            {/* =================================================
                RECRUITMENT REQUESTS
               ================================================= */}

            <Route
              path="/recruitment-requests"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<RecruitmentRequestList />}
              />

              <Route
                path="approvals"
                element={<RecruitmentRequestApprovalList />}
              />

              <Route
                path="create"
                element={<RecruitmentRequestCreate />}
              />

              <Route
                path=":id"
                element={<RecruitmentRequestDetail />}
              />
            </Route>

            {/* =================================================
                CANDIDATE MANAGEMENT
               ================================================= */}

            <Route
              path="/candidates"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >

              {/*
                Danh sách ứng viên:
                Hiring Manager vẫn có thể xem dữ liệu
                thuộc phạm vi phòng ban của mình.
              */}
              <Route
                index
                element={<CandidateList />}
              />

              {/*
                SCRUM-67:
                Chỉ RECRUITER hoặc HR_MANAGER
                được tạo hồ sơ và bóc tách CV.
              */}
              <Route
                path="create"
                element={
                  <ProtectedRoute
                    requiredRoles={[
                      'RECRUITER',
                      'HR_MANAGER'
                    ]}
                  >
                    <CandidateCreate />
                  </ProtectedRoute>
                }
              />

            </Route>

          </Route>

          {/* =====================================================
              ERROR ROUTES
             ===================================================== */}

          <Route
            path="/unauthorized"
            element={<Unauthorized />}
          />

          <Route
            path="*"
            element={<NotFound />}
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;