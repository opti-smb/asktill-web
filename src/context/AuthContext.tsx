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
  consumeHandoffTokenFromUrl,
  extractAccessToken,
  fetchCurrentUser,
  fetchIsAdmin,
  getToken,
  login as apiLogin,
  clerkLoginWithRetry,
  logoutApi,
  normalizeUser,
  refreshAccessSession,
  restoreStashedAccessToken,
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
import { consumeCheckoutAccessBridge } from '../lib/checkoutSessionBridge';
import { isEc2BackendSession } from '../lib/ec2BackendSession';
import { getTokenExpiryMs, getTokenSubject, isTokenExpired } from '../lib/jwt';
import { SESSION_TTL_MS, clearSessionExpiredPersisted, markSessionExpiredPersisted, isSessionExpiredPersisted } from '../lib/session';
import { peekStripeConnectReturn } from '../lib/chargebacksClient';
import {
  captureSignedOutIntent,
  clearSignedOutIntent,
  markSignedOutIntent,
} from '../lib/explicitLogout';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuth: boolean;
  /** True when identity.admins has a row for this user. */
  isAdmin: boolean;
  ready: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  establishSessionFromResponse: (data: unknown, fallbackEmail?: string) => void;
  loginWithClerkSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  patchUserTier: (tier: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const expiryTimerRef = useRef<number | null>(null);
  const expiringRef = useRef(false);

  const refreshAdminFlag = useCallback(async () => {
    const ok = await fetchIsAdmin();
    setIsAdmin(ok);
    return ok;
  }, []);

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
        void refreshAccessSession().then((renewed) => {
          if (renewed) {
            setTok(renewed);
            scheduleSessionExpiry(renewed);
          } else {
            dispatchSessionExpiredOnce();
          }
        });
        return;
      }
      const expiry = getTokenExpiryMs(accessToken);
      if (expiry == null) {
        expiryTimerRef.current = window.setTimeout(() => {
          dispatchSessionExpiredOnce();
        }, SESSION_TTL_MS);
        return;
      }
      // Refresh ~60s before access JWT expires so the tab stays signed in.
      const delay = Math.max(1_000, expiry - Date.now() - 60_000);
      expiryTimerRef.current = window.setTimeout(() => {
        void refreshAccessSession().then((renewed) => {
          if (renewed) {
            setTok(renewed);
            scheduleSessionExpiry(renewed);
          } else {
            dispatchSessionExpiredOnce();
          }
        });
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
      const logoutUserId = user?.userId || (stored ? getTokenSubject(stored) : null);
      if (logoutUserId) {
        clearUserAtLetterOnLogout(logoutUserId);
      }
      clearAppSession();
      setTok(null);
      setUser(null);
      setIsAdmin(false);
      if (options?.expired === true) {
        markSessionExpiredPersisted();
        setSessionExpired(true);
      } else {
        markSignedOutIntent();
        clearSessionExpiredPersisted();
        setSessionExpired(false);
      }
      window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
      await logoutApi();
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
      restoreStashedAccessToken();
      // asktill.com login handoff (`ec2=1`) is accepted so users skip Vercel login.
      const handoff = consumeHandoffTokenFromUrl();
      if (handoff) {
        clearSignedOutIntent();
        setToken(handoff);
      } else if (captureSignedOutIntent()) {
        clearToken();
        await logoutApi();
        if (!cancelled) {
          setTok(null);
          setUser(null);
          setIsAdmin(false);
          clearSessionExpiredPersisted();
          setSessionExpired(false);
          setReady(true);
        }
        return;
      } else if (!getToken() || isTokenExpired(getToken()!)) {
        consumeCheckoutAccessBridge();
      }

      // Prefer silent refresh via httpOnly cookie (no access JWT in localStorage).
      let access = getToken();
      if ((!access || isTokenExpired(access)) && !isEc2BackendSession()) {
        clearToken();
        access = await refreshAccessSession();
        if (!access && peekStripeConnectReturn()) {
          for (let i = 0; i < 2 && !access; i += 1) {
            await new Promise((r) => window.setTimeout(r, 800));
            access = await refreshAccessSession();
          }
        }
      }

      if (!access) {
        if (!cancelled) {
          setTok(null);
          setUser(null);
          setIsAdmin(false);
          setSessionExpired(isSessionExpiredPersisted());
          setReady(true);
        }
        return;
      }

      if (isTokenExpired(access)) {
        clearToken();
        resetUserScopedState();
        markSessionExpiredPersisted();
        if (!cancelled) {
          setTok(null);
          setUser(null);
          setIsAdmin(false);
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
          setTok(access);
          setUser(profile);
          scheduleSessionExpiry(access);
          void refreshAdminFlag();
          window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
          window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
        }
      } catch (err) {
        const status = (err as AxiosError)?.response?.status;
        if (status === 401) {
          const renewed = isEc2BackendSession() ? null : await refreshAccessSession();
          if (renewed && !cancelled) {
            try {
              const { data } = await fetchCurrentUser();
              const profile = normalizeUser(data);
              if (profile) {
                setTok(renewed);
                setUser(profile);
                scheduleSessionExpiry(renewed);
                void refreshAdminFlag();
                window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
                window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
                return;
              }
            } catch {
              /* fall through */
            }
          }
          clearToken();
          resetUserScopedState();
          markSessionExpiredPersisted();
          if (!cancelled) {
            setTok(null);
            setUser(null);
            setIsAdmin(false);
            setSessionExpired(true);
          }
        } else if (!cancelled) {
          const userId = getTokenSubject(access);
          setTok(access);
          if (userId) {
            setUser({ userId, email: null, name: null, businessName: null });
            scheduleSessionExpiry(access);
            void refreshAdminFlag();
          } else {
            setUser(null);
            setIsAdmin(false);
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
  }, [clearExpiryTimer, scheduleSessionExpiry, refreshAdminFlag]);

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
    clearSignedOutIntent();
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
    void refreshAdminFlag();
    warmupServices();
    window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
    window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
  }, [scheduleSessionExpiry, refreshAdminFlag]);

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

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const stored = getToken();
    if (!stored || isTokenExpired(stored)) return null;
    try {
      const { data } = await fetchCurrentUser();
      const profile = normalizeUser(data);
      if (profile) {
        setUser(profile);
        void refreshAdminFlag();
        return profile;
      }
    } catch {
      /* keep existing user on transient errors */
    }
    return user;
  }, [user, refreshAdminFlag]);

  const patchUserTier = useCallback((tier: string) => {
    setUser((prev) => (prev ? { ...prev, tier } : prev));
  }, []);

  const isAuth =
    ready && !!token && !!user?.userId && !isTokenExpired(token);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuth,
        isAdmin,
        ready,
        sessionExpired,
        login,
        establishSessionFromResponse,
        loginWithClerkSession,
        logout,
        refreshUser,
        patchUserTier,
      }}
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
