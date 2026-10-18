import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('c34_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('c34_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('c34_token');
    localStorage.removeItem('c34_user');
    setUser(null);
    setToken(null);
  }, []);

  const login = useCallback((nextUser, nextToken) => {
    localStorage.setItem('c34_token', nextToken);
    localStorage.setItem('c34_user', JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(nextToken);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('c34_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success && res.data.data?.user) {
        setUser(res.data.data.user);
        localStorage.setItem('c34_user', JSON.stringify(res.data.data.user));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshUser,
      setUser,
    }),
    [user, token, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
