import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  CLERK_OAUTH_COMPLETE_PATH,
  getClerkPublishableKey,
} from '../../lib/clerk';
import ClerkSessionSync from './ClerkSessionSync';

/** Clerk for register email OTP and login Google OAuth. App sessions use auth-service JWT. */
export default function ClerkAuthProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey?: string;
}) {
  const navigate = useNavigate();
  const key = (publishableKey || getClerkPublishableKey()).trim();
  if (!key) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={key}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signUpFallbackRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signInForceRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      signUpForceRedirectUrl={CLERK_OAUTH_COMPLETE_PATH}
      afterSignOutUrl="/login"
      appearance={{
        variables: {
          fontFamily:
            '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontFamilyButtons:
            '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <ClerkSessionSync />
      {children}
    </ClerkProvider>
  );
}
