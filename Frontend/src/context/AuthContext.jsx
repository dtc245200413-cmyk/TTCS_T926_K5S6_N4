import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authApi.getCurrentUser();
        if (response.data.success) {
          setUser(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  };

  // Load user from local storage initially
  useEffect(() => {
    fetchUser();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout failed on server", error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  // Expose fetchUser as refreshUser so components can trigger a manual re-sync
  // of permissions/roles after major account changes.
  const refreshUser = () => {
    return fetchUser();
  };

  const hasPermission = (permissionCode) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, hasPermission }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
