import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AxiosError } from 'axios';
import {
  clearAppSession,
  clearToken,
  extractAccessToken,
  fetchCurrentUser,
  getToken,
  login as apiLogin,
  clerkLoginWithRetry,
  logoutApi,
  normalizeUser,
  resetUserScopedState,
  resetSessionExpiryDispatchGuard,
  SESSION_EXPIRED_EVENT,
  setToken,
  type AuthUser,
  warmupServices,
  dispatchSessionExpiredOnce,
} from '../lib/api';
import { clearUserAtLetterOnLogout, LETTER_UPDATED_EVENT } from '../lib/atLetterCache';
import { REPORT_HISTORY_REFRESH_EVENT } from '../hooks/useReportSync';
import { getTokenExpiryMs, getTokenSubject, isTokenExpired } from '../lib/jwt';
import { SESSION_TTL_MS, clearSessionExpiredPersisted, markSessionExpiredPersisted, isSessionExpiredPersisted } from '../lib/session';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuth: boolean;
  ready: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  establishSessionFromResponse: (data: unknown, fallbackEmail?: string) => void;
  loginWithClerkSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimerRef = useRef<number | null>(null);
  const expiringRef = useRef(false);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current != null) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const scheduleSessionExpiry = useCallback(
    (accessToken: string) => {
      clearExpiryTimer();
      if (isTokenExpired(accessToken)) {
        dispatchSessionExpiredOnce();
        return;
      }
      const expiry = getTokenExpiryMs(accessToken);
      if (expiry == null) {
        expiryTimerRef.current = window.setTimeout(() => {
          dispatchSessionExpiredOnce();
        }, SESSION_TTL_MS);
        return;
      }
      const delay = expiry - Date.now();
      if (delay <= 0) {
        dispatchSessionExpiredOnce();
        return;
      }
      expiryTimerRef.current = window.setTimeout(() => {
        dispatchSessionExpiredOnce();
      }, delay);
    },
    [clearExpiryTimer],
  );

  useEffect(() => {
    warmupServices();
  }, []);

  const clearSession = useCallback(
    async (options?: { expired?: boolean }) => {
      const stored = getToken();
      const hadToken = Boolean(stored);
      const logoutUserId = user?.userId || (stored ? getTokenSubject(stored) : null);
      if (logoutUserId) {
        clearUserAtLetterOnLogout(logoutUserId);
      }
      clearAppSession();
      setTok(null);
      setUser(null);
      if (options?.expired === true) {
        markSessionExpiredPersisted();
        setSessionExpired(true);
      } else {
        clearSessionExpiredPersisted();
        setSessionExpired(false);
      }
      window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
      if (hadToken) {
        await logoutApi();
      }
    },
    [user?.userId],
  );

  const expireSession = useCallback(async () => {
    if (expiringRef.current) return;
    expiringRef.current = true;
    clearExpiryTimer();
    markSessionExpiredPersisted();
    setSessionExpired(true);
    await clearSession({ expired: true });
  }, [clearExpiryTimer, clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = getToken();
      if (!stored) {
        if (!cancelled) {
          setTok(null);
          setUser(null);
          setSessionExpired(isSessionExpiredPersisted());
          setReady(true);
        }
        return;
      }

      if (isTokenExpired(stored)) {
        clearToken();
        markSessionExpiredPersisted();
        if (!cancelled) {
          setTok(null);
          setUser(null);
          setSessionExpired(true);
          setReady(true);
        }
        return;
      }

      try {
        const { data } = await fetchCurrentUser();
        const profile = normalizeUser(data);
        if (!profile) throw new Error('Invalid session');
        if (!cancelled) {
          setTok(stored);
          setUser(profile);
          scheduleSessionExpiry(stored);
          window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
          window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
        }
      } catch (err) {
        const status = (err as AxiosError)?.response?.status;
        if (status === 401) {
          clearToken();
          markSessionExpiredPersisted();
          if (!cancelled) {
            setTok(null);
            setUser(null);
            setSessionExpired(true);
          }
        } else if (!cancelled) {
          const userId = getTokenSubject(stored);
          setTok(stored);
          if (userId) {
            setUser({ userId, email: null, name: null, businessName: null });
            scheduleSessionExpiry(stored);
          } else {
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, scheduleSessionExpiry]);

  useEffect(() => {
    const onExpired = () => {
      void expireSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [expireSession]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const stored = getToken();
      if (stored && isTokenExpired(stored)) {
        dispatchSessionExpiredOnce();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const applyAuthResponse = useCallback((data: unknown, fallbackEmail?: string) => {
    const accessToken = extractAccessToken(data);
    if (!accessToken) throw new Error('No token in response');
    expiringRef.current = false;
    resetSessionExpiryDispatchGuard();
    clearSessionExpiredPersisted();
    setSessionExpired(false);
    setToken(accessToken);
    setTok(accessToken);
    scheduleSessionExpiry(accessToken);
    const profile = normalizeUser(data);
    const tokenUserId = getTokenSubject(accessToken);
    const userId = profile?.userId || tokenUserId || '';
    if (profile) {
      setUser({ ...profile, userId: profile.userId || userId });
    } else {
      setUser({
        userId,
        email: fallbackEmail ?? null,
        name: null,
        businessName: null,
      });
    }
    warmupServices();
    window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
    window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
  }, [scheduleSessionExpiry]);

  const establishSessionFromResponse = useCallback(
    (data: unknown, fallbackEmail?: string) => {
      applyAuthResponse(data, fallbackEmail);
    },
    [applyAuthResponse],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      resetUserScopedState();
      const { data } = await apiLogin(email, password);
      applyAuthResponse(data, email);
    },
    [applyAuthResponse],
  );

  const loginWithClerkSession = useCallback(
    async (sessionId: string) => {
      resetUserScopedState();
      const { data } = await clerkLoginWithRetry(sessionId);
      applyAuthResponse(data);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(async () => {
    clearExpiryTimer();
    expiringRef.current = false;
    resetSessionExpiryDispatchGuard();
    await clearSession({ expired: false });
  }, [clearExpiryTimer, clearSession]);

  const isAuth =
    ready && !!token && !!user?.userId && !isTokenExpired(token);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuth, ready, sessionExpired, login, establishSessionFromResponse, loginWithClerkSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
