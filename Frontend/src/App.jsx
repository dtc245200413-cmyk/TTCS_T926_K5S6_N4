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
import UserImport from './pages/users/UserImport';
import RoleList from './pages/roles/RoleList';

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
            
            {/* User Management Routes */}
            <Route path="/users" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserList />} />
              <Route path="import" element={<UserImport />} />
              <Route path=":id" element={<UserDetail />} />
            </Route>

            {/* User Creation Route */}
            <Route path="/users/create" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserCreate />} />
            </Route>

            {/* User Edit Route */}
            <Route path="/users/:id/edit" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
              <Route index element={<UserEdit />} />
            </Route>
            
            {/* Roles Management Route */}
            <Route path="/roles" element={<ProtectedRoute requireAdmin={true}><Outlet /></ProtectedRoute>}>
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
