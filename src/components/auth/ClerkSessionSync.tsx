import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { USER_LOGOUT_EVENT } from '../../lib/api';
import { clearClerkSession, isClerkEnabled, shouldRetainClerkSession } from '../../lib/clerk';

/** Drop stale Clerk sessions when the app JWT is gone (login uses Google/OTP only transiently). */
export default function ClerkSessionSync() {
  const clerk = useClerk();
  const { isAuth, ready, sessionExpired } = useAuth();
  const { pathname } = useLocation();
  const clearing = useRef(false);

  useEffect(() => {
    if (!isClerkEnabled() || !ready || !clerk.loaded) return;
    if (isAuth || shouldRetainClerkSession(pathname)) return;
    if (!clerk.session?.id || clearing.current) return;

    clearing.current = true;
    // Never let Clerk signOut redirect — app handles navigation (SessionExpiredOverlay / logout).
    void clearClerkSession(clerk, { stayOnPage: true }).finally(() => {
      clearing.current = false;
    });
  }, [clerk, clerk.loaded, clerk.session?.id, isAuth, pathname, ready, sessionExpired]);

  useEffect(() => {
    if (!isClerkEnabled()) return;

    const onLogout = () => {
      if (clerk.loaded && clerk.session?.id) {
        void clearClerkSession(clerk, { stayOnPage: true });
      }
    };

    window.addEventListener(USER_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(USER_LOGOUT_EVENT, onLogout);
  }, [clerk, clerk.loaded, clerk.session?.id]);

  return null;
}
