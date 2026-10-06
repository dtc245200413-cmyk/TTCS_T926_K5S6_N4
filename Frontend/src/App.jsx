import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import ChangePassword from './pages/ChangePassword';
import Reports from './pages/Reports';

// User pages
import UserList from './pages/users/UserList';
import UserDetail from './pages/users/UserDetail';
import UserCreate from './pages/users/UserCreate';
import UserEdit from './pages/users/UserEdit';
import UserImport from './pages/users/UserImport';

// Role pages
import RoleList from './pages/roles/RoleList';

// Department pages - SCRUM-61
import DepartmentList from './pages/departments/DepartmentList';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>

            <Route path="/" element={<Home />} />

            <Route path="/reports" element={<Reports />} />

            {/* Department Management - SCRUM-61 */}
            <Route
              path="/departments"
              element={
                <ProtectedRoute requiredPermission="DEPARTMENT_VIEW">
                  <DepartmentList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/change-password"
              element={<ChangePassword />}
            />

            {/* User Management */}
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

            {/* Create User */}
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

            {/* Edit User */}
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

            {/* Roles */}
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