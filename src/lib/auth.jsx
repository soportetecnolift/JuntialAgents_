import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, refresh, setAccessToken } from './api.js';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, sessionExpiresAt: null });
  const accept = useCallback((d) => { setAccessToken(d.accessToken); setState({ loading: false, user: d.user, sessionExpiresAt: d.sessionExpiresAt || d.expiresAt }); }, []);
  const logout = useCallback(async () => { await api.post('/auth/logout').catch(() => {}); setAccessToken(null); setState({ loading: false, user: null }); }, []);
  useEffect(() => {
    refresh().then(accept).catch(() => setState({ loading: false, user: null }));
    const onExpired = () => { setAccessToken(null); setState({ loading: false, user: null }); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [accept]);
  return <Ctx.Provider value={{ ...state, accept, logout, setUser: (user) => setState((s) => ({ ...s, user })) }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export const isStaff = (u) => u && u.role !== 'client';
export const hasRole = (u, ...roles) => u && roles.includes(u.role);
