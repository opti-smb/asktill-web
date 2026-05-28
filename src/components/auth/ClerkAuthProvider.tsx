import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  CLERK_OAUTH_COMPLETE_PATH,
  CLERK_PUBLISHABLE_KEY,
} from '../../lib/clerk';
import ClerkSessionSync from './ClerkSessionSync';

/** Clerk for register email OTP and login Google OAuth. App sessions use auth-service JWT. */
export default function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signUpFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signInForceRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signUpForceRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      afterSignOutUrl="/login"
    >
      <ClerkSessionSync />
      {children}
    </ClerkProvider>
  );
}
