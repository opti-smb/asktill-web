import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import AuthNav from '../components/auth/AuthNav';
import AuthOAuthProgress from '../components/auth/AuthOAuthProgress';
import { useAuth } from '../context/AuthContext';
import { checkEmail, extractNotRegistered, getApiError, getToken, warmupServices } from '../lib/api';
import {
  clearClerkSession,
  clearGoogleSignInAttempt,
  getGoogleOAuthMode,
  GOOGLE_SIGNIN_CANCELLED_MSG,
  GOOGLE_SIGNIN_NOT_REGISTERED_MSG,
  GOOGLE_SIGNUP_ALREADY_REGISTERED_MSG,
  persistLoginFlash,
  persistRegisterFromGoogle,
  wasGoogleSignInAttempt,
} from '../lib/clerk';
import { normalizeEmail } from '../lib/emailValidation';
import styles from './LoginPage.module.css';

const UPLOAD_PATH = '/onboarding';
const OAUTH_READY_MS = 25_000;
const FLOW_TIMEOUT_MS = 45_000;
const SLOW_HINT_MS = 8_000;

async function waitForClerkOAuthReady(
  getSessionId: () => string | undefined,
  getEmail: () => string,
  maxMs = OAUTH_READY_MS,
): Promise<{ sessionId: string | null; email: string }> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const sessionId = getSessionId();
    const email = getEmail();
    if (sessionId) return { sessionId, email };
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return { sessionId: getSessionId() ?? null, email: getEmail() };
}

export default function LoginOAuthComplete() {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { loginWithClerkSession } = useAuth();
  const finishedRef = useRef(false);
  const [slowHint, setSlowHint] = useState(false);

  useEffect(() => {
    warmupServices();
    let cancelled = false;
    const flowStarted = Date.now();
    const slowTimer = window.setTimeout(() => {
      if (!finishedRef.current) setSlowHint(true);
    }, SLOW_HINT_MS);

    async function sendToLoginExistingAccount(googleEmail: string) {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      const addr = normalizeEmail(googleEmail);
      const message = GOOGLE_SIGNUP_ALREADY_REGISTERED_MSG;
      persistLoginFlash(message);
      navigate('/login', {
        replace: true,
        state: { email: addr, error: message },
      });
      clearGoogleSignInAttempt();
      await clearClerkSession(clerk);
    }

    async function sendToLogin(error: string) {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      persistLoginFlash(error);
      navigate('/login', { replace: true, state: { error } });
      clearGoogleSignInAttempt();
      await clearClerkSession(clerk);
    }

    async function sendToRegister(googleEmail: string) {
      if (finishedRef.current || cancelled) return;
      finishedRef.current = true;
      const addr = normalizeEmail(googleEmail);
      persistRegisterFromGoogle(addr);
      navigate('/register', {
        replace: true,
        state: { registerMessage: GOOGLE_SIGNIN_NOT_REGISTERED_MSG, email: addr },
      });
      clearGoogleSignInAttempt();
    }

    async function finish() {
      if (!clerk.loaded || finishedRef.current || cancelled) return;

      const fromGoogleOAuth = wasGoogleSignInAttempt();
      const oauthMode = getGoogleOAuthMode();

      if (fromGoogleOAuth && !clerkUserLoaded) return;

      if (Date.now() - flowStarted > FLOW_TIMEOUT_MS) {
        await sendToLogin(
          'Google sign-in is taking too long. Check that Auth (port 8002) is running, then try again.',
        );
        return;
      }

      const googleEmail = clerkUser?.primaryEmailAddress?.emailAddress?.trim() ?? '';
      const { sessionId, email: resolvedEmail } = await waitForClerkOAuthReady(
        () => clerk.session?.id,
        () => clerkUser?.primaryEmailAddress?.emailAddress?.trim() ?? googleEmail,
      );
      const accountEmail = resolvedEmail || googleEmail;

      if (!sessionId) {
        if (fromGoogleOAuth && accountEmail) {
          try {
            const { data } = await checkEmail(normalizeEmail(accountEmail));
            if (!data.registered) {
              await sendToRegister(accountEmail);
              return;
            }
            if (oauthMode === 'signup') {
              await sendToLoginExistingAccount(accountEmail);
              return;
            }
          } catch {
            if (oauthMode === 'signup') {
              await sendToRegister(accountEmail);
              return;
            }
          }
        }
        await sendToLogin(
          fromGoogleOAuth
            ? 'Google sign-in did not finish. Try again or use email and password.'
            : GOOGLE_SIGNIN_CANCELLED_MSG,
        );
        return;
      }

      if (oauthMode === 'signup' && accountEmail) {
        try {
          const { data } = await checkEmail(normalizeEmail(accountEmail));
          if (data.registered) {
            await sendToLoginExistingAccount(accountEmail);
            return;
          }
        } catch {
          /* continue — clerk-login will confirm registration status */
        }
      }

      try {
        await loginWithClerkSession(sessionId);
        if (!getToken()) {
          throw new Error('Sign-in did not complete. Try again.');
        }
        finishedRef.current = true;
        clearGoogleSignInAttempt();
        await clearClerkSession(clerk, { stayOnPage: true });
        if (!cancelled) {
          navigate(UPLOAD_PATH, { replace: true });
        }
      } catch (err) {
        const notRegistered = extractNotRegistered(err);
        const email =
          notRegistered?.googleEmail ??
          accountEmail ??
          clerkUser?.primaryEmailAddress?.emailAddress ??
          '';
        if (notRegistered && email) {
          await sendToRegister(email);
          return;
        }
        await sendToLogin(
          notRegistered
            ? GOOGLE_SIGNIN_NOT_REGISTERED_MSG
            : getApiError(err, 'Could not sign in with Google. Try again or use email and password.'),
        );
      }
    }

    void finish();
    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [
    clerk,
    clerk.loaded,
    clerk.session?.id,
    clerkUser,
    clerkUserLoaded,
    loginWithClerkSession,
    navigate,
  ]);

  const oauthMode = getGoogleOAuthMode();
  const title =
    oauthMode === 'signup' ? 'Checking your Google account' : 'Signing in with Google';
  const hint = slowHint
    ? 'Still working… If this takes more than a minute, wait a moment and try again.'
    : oauthMode === 'signup'
      ? 'Checking whether this email is already registered…'
      : 'Checking your AskTill account…';

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
