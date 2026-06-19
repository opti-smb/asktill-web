import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback, useClerk } from '@clerk/clerk-react';
import {
  clearClerkSession,
  CLERK_OAUTH_COMPLETE_PATH,
  GOOGLE_SIGNIN_CANCELLED_MSG,
  isOAuthRedirectCancelled,
} from '../lib/clerk';
import { warmupAuthServiceReady, warmupServices } from '../lib/api';
import AuthNav from '../components/auth/AuthNav';
import AuthOAuthProgress from '../components/auth/AuthOAuthProgress';
import styles from './LoginPage.module.css';

/** Clerk OAuth redirect target — completes Google sign-in handshake. */
export default function LoginOAuthCallback() {
  const navigate = useNavigate();
  const clerk = useClerk();
  const userCancelled = isOAuthRedirectCancelled();

  useEffect(() => {
    warmupServices();
    void warmupAuthServiceReady(8_000);
  }, []);

  useEffect(() => {
    if (!clerk.loaded || !userCancelled) return;
    void clearClerkSession(clerk).then(() => {
      navigate('/login', {
        replace: true,
        state: { error: GOOGLE_SIGNIN_CANCELLED_MSG },
      });
    });
  }, [clerk, clerk.loaded, navigate, userCancelled]);

  if (userCancelled) {
    return (
      <div className={styles.page}>
        <AuthNav active="signin" />
        <main className={styles.main}>
          <div className={styles.card}>
            <AuthOAuthProgress title="Heading back" hint="Returning you to the sign-in page." />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AuthNav active="signin" />
      <main className={styles.main}>
        <div className={styles.card}>
          <AuthOAuthProgress
            title="Signing in with Google"
            hint="Confirming your account with Google…"
          />
          <AuthenticateWithRedirectCallback
            signInUrl="/login"
            signUpUrl="/register"
            signInForceRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
            signInFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
            signUpFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
          />
        </div>
      </main>
    </div>
  );
}
