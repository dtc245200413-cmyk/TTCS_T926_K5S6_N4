import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import UserImport from './pages/users/UserImport';
import RoleList from './pages/roles/RoleList';

// Competency Framework Pages
import CompetencyFrameworkList from './pages/competency-frameworks/CompetencyFrameworkList';
import CompetencyFrameworkForm from './pages/competency-frameworks/CompetencyFrameworkForm';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>

            {/* Dashboard */}
            <Route path="/" element={<Home />} />

            {/* Reports */}
            <Route path="/reports" element={<Reports />} />

            {/* Change Password */}
            <Route
              path="/change-password"
              element={<ChangePassword />}
            />

            {/* ============================= */}
            {/* COMPETENCY FRAMEWORK */}
            {/* ============================= */}

            <Route
              path="/competency-frameworks"
              element={<CompetencyFrameworkList />}
            />

            <Route
              path="/competency-frameworks/create"
              element={
                <ProtectedRoute requiredRole="HR_MANAGER">
                  <CompetencyFrameworkForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/competency-frameworks/:id/edit"
              element={<CompetencyFrameworkForm />}
            />

            {/* ============================= */}
            {/* USER MANAGEMENT */}
            {/* ============================= */}

            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserList />} />
              <Route path="import" element={<UserImport />} />
              <Route path=":id" element={<UserDetail />} />
            </Route>

            {/* User Creation */}
            <Route
              path="/users/create"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserCreate />} />
            </Route>

            {/* User Edit */}
            <Route
              path="/users/:id/edit"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserEdit />} />
            </Route>

            {/* ============================= */}
            {/* ROLE MANAGEMENT */}
            {/* ============================= */}

            <Route
              path="/roles"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleList />} />
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
