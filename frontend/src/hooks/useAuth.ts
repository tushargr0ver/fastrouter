import { useState, useEffect, createContext, useContext } from 'react';
import type { User } from '../lib/api';
import { auth } from '../lib/api';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('fr_token');
    if (stored) {
      setToken(stored);
      auth.me(stored)
        .then(u => { setUser(u); })
        .catch(() => { localStorage.removeItem('fr_token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await auth.login(email, password);
    localStorage.setItem('fr_token', res.access_token);
    setToken(res.access_token);
    const u = await auth.me(res.access_token);
    setUser(u);
  };

  const register = async (email: string, password: string, full_name: string) => {
    const res = await auth.register(email, password, full_name);
    localStorage.setItem('fr_token', res.access_token);
    setToken(res.access_token);
    const u = await auth.me(res.access_token);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('fr_token');
    setToken(null);
    setUser(null);
  };

  return { user, token, loading, login, register, logout };
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
