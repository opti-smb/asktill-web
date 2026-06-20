import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useSession, useUser } from '@clerk/clerk-react';
import AuthNav from '../components/auth/AuthNav';
import AuthOAuthProgress from '../components/auth/AuthOAuthProgress';
import { useAuth } from '../context/AuthContext';
import { extractNotRegistered, ensureAuthServiceReady, getApiError, getToken, warmupServices } from '../lib/api';
import {
  clearClerkSession,
  clearGoogleSignInAttempt,
  getGoogleOAuthMode,
  GOOGLE_SIGNIN_CANCELLED_MSG,
  GOOGLE_SIGNIN_NOT_REGISTERED_MSG,
  persistLoginFlash,
  persistRegisterFromGoogle,
  wasGoogleSignInAttempt,
} from '../lib/clerk';
import styles from './LoginPage.module.css';

import { getPostLoginRedirect } from '../lib/pendingPdfDownload';
const FLOW_TIMEOUT_MS = 45_000;
const SESSION_WAIT_MS = 8_000;
const SLOW_HINT_MS = 2_000;
const POLL_MS = 150;

export default function LoginOAuthComplete() {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { session, isLoaded: sessionLoaded } = useSession();
  const { user: clerkUser } = useUser();
  const { loginWithClerkSession } = useAuth();
  const finishedRef = useRef(false);
  const inFlightRef = useRef(false);
  const flowStartedRef = useRef(Date.now());
  const [slowHint, setSlowHint] = useState(false);

  useEffect(() => {
    flowStartedRef.current = Date.now();
    warmupServices();
    void ensureAuthServiceReady(6_000);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = window.setTimeout(() => {
      if (!finishedRef.current) setSlowHint(true);
    }, SLOW_HINT_MS);

    async function sendToLogin(error: string) {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      persistLoginFlash(error);
      navigate('/login', { replace: true, state: { error } });
      clearGoogleSignInAttempt();
      void clearClerkSession(clerk);
    }

    async function sendToRegister(googleEmail: string) {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      persistRegisterFromGoogle(googleEmail);
      navigate('/register', {
        replace: true,
        state: { registerMessage: GOOGLE_SIGNIN_NOT_REGISTERED_MSG, email: googleEmail },
      });
      clearGoogleSignInAttempt();
    }

    async function finish() {
      if (!clerk.loaded || finishedRef.current || cancelled || inFlightRef.current) {
        return;
      }
      const sessionId = session?.id ?? clerk.session?.id;
      if (!sessionLoaded && !sessionId) {
        return;
      }

      if (Date.now() - flowStartedRef.current > FLOW_TIMEOUT_MS) {
        await sendToLogin(
          'Google sign-in is taking too long. Check that Auth (port 8002) is running, then try again.',
        );
        return;
      }

      const fromGoogleOAuth = wasGoogleSignInAttempt();
      const accountEmail = clerkUser?.primaryEmailAddress?.emailAddress?.trim() ?? '';

      if (!sessionId) {
        if (!fromGoogleOAuth) {
          await sendToLogin(GOOGLE_SIGNIN_CANCELLED_MSG);
          return;
        }
        // Clerk may still attach the session right after redirect — wait, do not fail early.
        if (Date.now() - flowStartedRef.current < SESSION_WAIT_MS) {
          return;
        }
        await sendToLogin('Google sign-in did not finish. Try again or use email and password.');
        return;
      }

      inFlightRef.current = true;
      try {
        await loginWithClerkSession(sessionId);
        if (!getToken()) {
          throw new Error('Sign-in did not complete. Try again.');
        }
        finishedRef.current = true;
        clearGoogleSignInAttempt();
        if (!cancelled) {
          navigate(getPostLoginRedirect(), { replace: true });
        }
        void clearClerkSession(clerk, { stayOnPage: true });
      } catch (err) {
        const notRegistered = extractNotRegistered(err);
        const email =
          notRegistered?.googleEmail ?? accountEmail ?? clerkUser?.primaryEmailAddress?.emailAddress ?? '';
        if (notRegistered && email) {
          await sendToRegister(email);
          return;
        }
        await sendToLogin(
          notRegistered
            ? GOOGLE_SIGNIN_NOT_REGISTERED_MSG
            : getApiError(err, 'Could not sign in with Google. Try again or use email and password.'),
        );
      } finally {
        inFlightRef.current = false;
      }
    }

    void finish();

    const poll = window.setInterval(() => {
      if (!finishedRef.current && !inFlightRef.current) {
        void finish();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
      window.clearInterval(poll);
    };
  }, [
    clerk,
    clerk.loaded,
    clerk.session?.id,
    clerkUser,
    loginWithClerkSession,
    navigate,
    session?.id,
    sessionLoaded,
  ]);

  const oauthMode = getGoogleOAuthMode();
  const title = oauthMode === 'signup' ? 'Checking your Google account' : 'Signing in with Google';
  const hint = slowHint
    ? 'Waking up services… this can take a moment on first sign-in.'
    : oauthMode === 'signup'
      ? 'Finishing Google sign-up…'
      : 'Finishing sign-in…';

  return (
    <div className={styles.page}>
      <AuthNav active={oauthMode === 'signup' ? 'signup' : 'signin'} />
      <main className={styles.main}>
        <div className={styles.card}>
          <AuthOAuthProgress title={title} hint={hint} />
        </div>
      </main>
    </div>
  );
}
