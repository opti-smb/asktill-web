import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { USER_LOGOUT_EVENT, SESSION_EXPIRED_EVENT } from '../../lib/api';
import { clearClerkSession, isClerkEnabled, shouldRetainClerkSession } from '../../lib/clerk';
import { isSessionExpiredPersisted } from '../../lib/session';

/** Drop stale Clerk sessions when the app JWT is gone (login uses Google/OTP only transiently). */
export default function ClerkSessionSync() {
  const clerk = useClerk();
  const { isAuth, ready, sessionExpired } = useAuth();
  const { pathname } = useLocation();
  const clearing = useRef(false);

  const tearDownClerk = () => {
    if (!isClerkEnabled() || !clerk.loaded || !clerk.session?.id || clearing.current) return;
    clearing.current = true;
    void clearClerkSession(clerk, { stayOnPage: true }).finally(() => {
      clearing.current = false;
    });
  };

  useEffect(() => {
    if (!isClerkEnabled() || !ready || !clerk.loaded) return;
    if (sessionExpired || isSessionExpiredPersisted()) {
      tearDownClerk();
      return;
    }
    if (isAuth || shouldRetainClerkSession(pathname)) return;
    tearDownClerk();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: tear down on auth/path flips only
  }, [clerk, clerk.loaded, clerk.session?.id, isAuth, pathname, ready, sessionExpired]);

  useEffect(() => {
    if (!isClerkEnabled()) return;

    const onLogoutOrExpiry = () => {
      tearDownClerk();
    };

    window.addEventListener(USER_LOGOUT_EVENT, onLogoutOrExpiry);
    window.addEventListener(SESSION_EXPIRED_EVENT, onLogoutOrExpiry);
    return () => {
      window.removeEventListener(USER_LOGOUT_EVENT, onLogoutOrExpiry);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onLogoutOrExpiry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk, clerk.loaded, clerk.session?.id]);

  return null;
}
