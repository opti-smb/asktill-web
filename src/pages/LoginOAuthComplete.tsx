import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useSession, useUser } from '@clerk/clerk-react';
import AuthNav from '../components/auth/AuthNav';
import AuthOAuthProgress from '../components/auth/AuthOAuthProgress';
import { useAuth } from '../context/AuthContext';
import {
  ensureAuthServiceReady,
  extractNotRegistered,
  getApiError,
  getToken,
  isLocalDevServices,
  warmupServices,
} from '../lib/api';
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
const SESSION_WAIT_MS = 12_000;
const SLOW_HINT_MS = 1_500;
const POLL_MS = 100;

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
  const [phase, setPhase] = useState<'session' | 'auth' | 'done'>('session');

  useEffect(() => {
    flowStartedRef.current = Date.now();
    warmupServices();
    void ensureAuthServiceReady(isLocalDevServices() ? 8_000 : 10_000);
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
      if (finishedRef.current || cancelled || inFlightRef.current) {
        return;
      }
      const sessionId = session?.id ?? clerk.session?.id;
      if (!sessionId && !clerk.loaded && !sessionLoaded) {
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
      setPhase('auth');
      try {
        await loginWithClerkSession(sessionId);
        if (!getToken()) {
          throw new Error('Sign-in did not complete. Try again.');
        }
        finishedRef.current = true;
        setPhase('done');
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
  const hint = (() => {
    if (phase === 'auth') {
      return 'Connecting to your AskTill account…';
    }
    if (phase === 'done') {
      return 'Opening your dashboard…';
    }
    if (slowHint) {
      return 'Still finishing Google sign-in… this step talks to Google and can take a few seconds.';
    }
    return oauthMode === 'signup'
      ? 'Finishing Google sign-up…'
      : 'Finishing sign-in…';
  })();

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
