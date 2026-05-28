import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  clearAppSession,
  clearToken,
  extractAccessToken,
  fetchCurrentUser,
  getToken,
  login as apiLogin,
  clerkLogin,
  logoutApi,
  normalizeUser,
  SESSION_EXPIRED_EVENT,
  setToken,
  type AuthUser,
} from '../lib/api';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuth: boolean;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithClerkSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(async () => {
    const hadToken = Boolean(getToken());
    clearAppSession();
    setTok(null);
    setUser(null);
    if (hadToken) {
      await logoutApi();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = getToken();
      if (!stored) {
        if (!cancelled) {
          setTok(null);
          setUser(null);
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
        }
      } catch {
        clearToken();
        if (!cancelled) {
          setTok(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      void clearSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const applyAuthResponse = useCallback((data: unknown, fallbackEmail?: string) => {
    const accessToken = extractAccessToken(data);
    if (!accessToken) throw new Error('No token in response');
    setToken(accessToken);
    setTok(accessToken);
    const profile = normalizeUser(data);
    setUser(
      profile ??
        ({
          userId: '',
          email: fallbackEmail ?? null,
          name: null,
          businessName: null,
        } satisfies AuthUser),
    );
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await apiLogin(email, password);
      applyAuthResponse(data, email);
    },
    [applyAuthResponse],
  );

  const loginWithClerkSession = useCallback(
    async (sessionId: string) => {
      const { data } = await clerkLogin(sessionId);
      applyAuthResponse(data);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const isAuth = ready && !!token && !!user?.userId;

  return (
    <AuthContext.Provider
      value={{ token, user, isAuth, ready, login, loginWithClerkSession, logout }}
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
