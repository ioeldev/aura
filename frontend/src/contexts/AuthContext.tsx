import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getToken, setToken, clearToken } from '@/lib/api';
import { BASE_PATH } from '@/lib/basePath';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const verifySession = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch(`${BASE_PATH}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as { username: string; authDisabled?: boolean };
        setUsername(data.username);
        setIsAuthenticated(true);
      } else {
        clearToken();
        setIsAuthenticated(false);
        setUsername(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUsername(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  // Listen for 401 events fired by apiFetch
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUsername(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const res = await fetch(`${BASE_PATH}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Login failed');
    }
    const { token } = await res.json() as { token: string };
    setToken(token);
    setUsername(user);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await fetch(`${BASE_PATH}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    clearToken();
    setIsAuthenticated(false);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
