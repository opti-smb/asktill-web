import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { USER_LOGOUT_EVENT } from '../../lib/api';
import { clearClerkSession, isClerkEnabled, shouldRetainClerkSession } from '../../lib/clerk';

/** Drop stale Clerk sessions when the app JWT is gone (login uses Google/OTP only transiently). */
export default function ClerkSessionSync() {
  const clerk = useClerk();
  const { isAuth, ready } = useAuth();
  const { pathname } = useLocation();
  const clearing = useRef(false);

  useEffect(() => {
    if (!isClerkEnabled() || !ready || !clerk.loaded) return;
    if (isAuth || shouldRetainClerkSession(pathname)) return;
    if (!clerk.session?.id || clearing.current) return;

    clearing.current = true;
    void clearClerkSession(clerk).finally(() => {
      clearing.current = false;
    });
  }, [clerk, clerk.loaded, clerk.session?.id, isAuth, pathname, ready]);

  useEffect(() => {
    if (!isClerkEnabled()) return;

    const onLogout = () => {
      if (clerk.loaded && clerk.session?.id) {
        void clearClerkSession(clerk);
      }
    };

    window.addEventListener(USER_LOGOUT_EVENT, onLogout);
    return () => window.removeEventListener(USER_LOGOUT_EVENT, onLogout);
  }, [clerk, clerk.loaded, clerk.session?.id]);

  return null;
}
