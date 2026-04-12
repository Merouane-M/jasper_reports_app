import {
  createContext, useContext, useEffect, useState,
  ReactNode, useCallback,
} from 'react';
import { authApi, setTokens, clearTokens, loadStoredRefreshToken } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    loadStoredRefreshToken();
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    setTokens(data.accessToken, data.refreshToken);
    // Normalise snake_case → camelCase from API
    const u: User = {
      id:        data.user.id,
      email:     data.user.email,
      firstName: data.user.first_name ?? data.user.firstName,
      lastName:  data.user.last_name  ?? data.user.lastName,
      role:      data.user.role,
      isActive:  true,
      createdAt: new Date().toISOString(),
    };
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    const rt = localStorage.getItem('refreshToken');
    if (rt) await authApi.logout(rt).catch(() => {});
    clearTokens();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
