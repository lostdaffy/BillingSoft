import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'ready'));
  const [slowStart, setSlowStart] = useState(false);

  const loadSession = useCallback(async () => {
    if (!getToken()) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
    const timer = setTimeout(() => setSlowStart(true), 5000);
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setStatus('ready');
    } catch (error) {
      if (error.response?.status === 401) {
        setToken(null);
        setUser(null);
        setStatus('ready');
      } else {
        setStatus('offline');
      }
    } finally {
      clearTimeout(timer);
      setSlowStart(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onExpired = () => {
      setUser((current) => {
        if (current) toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
        return null;
      });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, status, slowStart, login, register, logout, setUser, retry: loadSession }),
    [user, status, slowStart, login, register, logout, loadSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
