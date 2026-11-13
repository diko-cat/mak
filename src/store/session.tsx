import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LoginCredentials, PublicUser } from '../types';
import { api } from '../api';
import { readDatabase, writeSessionId } from '../api/storage';

interface SessionContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<PublicUser>;
  loginAsDemo: (role: PublicUser['role']) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.auth.currentUser().then((current) => {
      if (active) setUser(current);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const account = await api.auth.login(credentials);
    writeSessionId(account.id);
    setUser(account);
    return account;
  }, []);

  const loginAsDemo = useCallback(async (role: PublicUser['role']) => {
    const account = readDatabase().users.find((item) => item.role === role);
    if (!account) throw new Error('Демо-аккаунт не найден.');
    return login({ email: account.email, password: account.password });
  }, [login]);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, loginAsDemo, logout }), [user, loading, login, loginAsDemo, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}

export const roleHome: Record<PublicUser['role'], string> = {
  admin: '/admin',
  doctor: '/doctor',
  registrar: '/registrar',
  patient: '/patient',
};

export const roleLabel: Record<PublicUser['role'], string> = {
  admin: 'Администратор',
  doctor: 'Врач',
  registrar: 'Регистратор',
  patient: 'Пациент',
};
