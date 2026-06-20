import { useEffect, useState } from 'react';
import { useClerk, useSignIn, useSignUp } from '@clerk/clerk-react';
import {
  clearClerkSession,
  clerkErrorMessage,
  isClerkAlreadySignedInError,
  markGoogleOAuthAttempt,
  startGoogleOAuth,
  startGoogleOAuthSignUp,
} from '../../lib/clerk';
import { ensureAuthServiceReady, isLocalDevServices, warmupServices } from '../../lib/api';
import styles from '../../pages/LoginPage.module.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

type Props = {
  disabled?: boolean;
  onError: (message: string) => void;
  /** Use sign-up OAuth on /register; sign-in OAuth on /login. */
  mode?: 'signin' | 'signup';
};

export default function GoogleSignInButton({ disabled, onError, mode = 'signin' }: Props) {
  const clerk = useClerk();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';
  const ready = isSignup ? signUpLoaded && Boolean(signUp) : signInLoaded && Boolean(signIn);

  useEffect(() => {
    warmupServices();
  }, []);

  const handleClick = async () => {
    if (!ready) {
      onError('Google sign-in is still loading. Wait a moment and try again.');
      return;
    }

    onError('');
    setLoading(true);

    try {
      void ensureAuthServiceReady(isLocalDevServices() ? 8_000 : 5_000);
      markGoogleOAuthAttempt(isSignup ? 'signup' : 'signin');
      if (isSignup && signUp) {
        await startGoogleOAuthSignUp(signUp, clerk);
      } else if (signIn) {
        await startGoogleOAuth(signIn, clerk);
      }
    } catch (err) {
      if (!isSignup && signIn && isClerkAlreadySignedInError(err)) {
        try {
          await clearClerkSession(clerk);
          await startGoogleOAuth(signIn, clerk);
          return;
        } catch (retryErr) {
          err = retryErr;
        }
      }
      setLoading(false);
      const fallback = isSignup
        ? 'Google sign-up failed. Try again or use email verification.'
        : 'Google sign-in failed. Try again or use email and password.';
      onError(clerkErrorMessage(err, fallback));
    }
  };

  return (
    <button
      type="button"
      className={styles.googleBtn}
      disabled={disabled || loading || !ready}
      onClick={() => void handleClick()}
    >
      <GoogleIcon />
      {loading ? 'Redirecting to Google…' : 'Continue with Google'}
    </button>
  );
}
