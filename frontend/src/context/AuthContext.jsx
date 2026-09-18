import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getSession());
  const [token, setToken] = useState(() => api.getToken());
  const [loading, setLoading] = useState(true);

  // Sync session on mount
  useEffect(() => {
    async function checkAuth() {
      const storedToken = api.getToken();
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res?.user) {
          setUser(res.user);
          api.setSession(res.user);
        }
      } catch (err) {
        console.warn('Session verification fallback to stored session:', err.message);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = useCallback(async (payload) => {
    const res = await api.login(payload);
    if (res?.user && res?.token) {
      setUser(res.user);
      setToken(res.token);
    }
    return res;
  }, []);

  const signup = useCallback(async (payload) => {
    const res = await api.signup(payload);
    if (res?.user && res?.token) {
      setUser(res.user);
      setToken(res.token);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    api.logout();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res?.user) {
        setUser(res.user);
        api.setSession(res.user);
      }
      return res?.user;
    } catch {
      return null;
    }
  }, []);

  const value = {
    user,
    token,
    role: user?.role || 'PATIENT',
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
