/** Clerk publishable key — used only for email OTP on /register, not dashboard sessions. */
export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || '';

const CLERK_OAUTH_REDIRECT_PATH = '/sso-callback';
export const CLERK_OAUTH_COMPLETE_PATH = '/login/oauth-complete';

export const isClerkEnabled = () => Boolean(CLERK_PUBLISHABLE_KEY);

/** Absolute OAuth URLs — must match Clerk Dashboard → Paths / Redirect URLs. */
export function clerkOAuthUrls() {
  const origin =
    import.meta.env.VITE_APP_ORIGIN?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return {
    redirectUrl: `${origin}${CLERK_OAUTH_REDIRECT_PATH}`,
    redirectUrlComplete: `${origin}${CLERK_OAUTH_COMPLETE_PATH}`,
  };
}

type ClerkClient = {
  session?: { id?: string } | null;
  signOut?: (opts?: { redirectUrl?: string }) => Promise<void>;
  setActive?: (args: { session: null; navigate: () => void }) => Promise<void>;
};

export type ClearClerkSessionOptions = {
  /**
   * Drop the Clerk session without `signOut()` — avoids Clerk sending the browser
   * to `afterSignOutUrl` (/login) while the user is on /register.
   */
  stayOnPage?: boolean;
  /** Explicit post-sign-out URL (overrides ClerkProvider defaults). */
  redirectUrl?: string;
};

/** End Clerk session; use `stayOnPage` on /register so Google OAuth cleanup does not bounce to sign-in. */
export async function clearClerkSession(
  clerk: ClerkClient | null | undefined,
  options?: ClearClerkSessionOptions,
) {
  if (!clerk) return;
  try {
    if (clerk.setActive) {
      await clerk.setActive({ session: null, navigate: () => {} });
    }
  } catch {
    /* ignore */
  }
  if (options?.stayOnPage) return;
  try {
    if (clerk.signOut) {
      const redirectUrl =
        options?.redirectUrl ??
        (typeof window !== 'undefined' ? window.location.href : undefined);
      if (redirectUrl) {
        await clerk.signOut({ redirectUrl });
      } else {
        await clerk.signOut();
      }
    }
  } catch {
    /* ignore */
  }
}

export const CLERK_OAUTH_FLOW_PATHS = ['/sso-callback', '/login/oauth-complete'] as const;

function isClerkOAuthFlowPath(pathname: string) {
  return CLERK_OAUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Paths where Clerk must not be cleared mid-flow (OAuth redirects, register OTP, sign-in). */
export function shouldRetainClerkSession(pathname: string) {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname === '/forgot-password' ||
    isClerkOAuthFlowPath(pathname)
  );
}

const OAUTH_USER_CANCEL_ERRORS = new Set(['access_denied', 'user_cancelled', 'cancelled']);

/** True only when the IdP redirect explicitly indicates the user denied/cancelled. */
export function isOAuthRedirectCancelled(search?: string, hash?: string) {
  const read = (raw: string) => {
    if (!raw || raw === '?' || raw === '#') return false;
    const params = new URLSearchParams(raw.replace(/^\?/, '').replace(/^#/, ''));
    const err = params.get('error')?.toLowerCase();
    return Boolean(err && OAUTH_USER_CANCEL_ERRORS.has(err));
  };

  const s = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const h = hash ?? (typeof window !== 'undefined' ? window.location.hash : '');
  return read(s) || read(h);
}

export const GOOGLE_SIGNIN_CANCELLED_MSG =
  'Google sign-in was cancelled. Try again or use email and password.';

export const GOOGLE_SIGNIN_ATTEMPT_KEY = 'asktill:google-sign-in-attempt';
export const GOOGLE_OAUTH_MODE_KEY = 'asktill:google-oauth-mode';
const LOGIN_FLASH_ERROR_KEY = 'asktill:login-flash-error';

export const GOOGLE_SIGNUP_ALREADY_REGISTERED_MSG =
  'An account with this email already exists. Sign in instead.';

export function persistLoginFlash(error: string) {
  try {
    sessionStorage.setItem(LOGIN_FLASH_ERROR_KEY, error);
  } catch {
    /* ignore */
  }
}

export function consumeLoginFlash(): { error: string } | null {
  try {
    const error = sessionStorage.getItem(LOGIN_FLASH_ERROR_KEY);
    if (!error) return null;
    sessionStorage.removeItem(LOGIN_FLASH_ERROR_KEY);
    return { error };
  } catch {
    return null;
  }
}

export const GOOGLE_SIGNIN_NOT_REGISTERED_MSG =
  'No account found with this email. Please register.';

const REGISTER_FROM_GOOGLE_KEY = 'asktill:register-from-google';

export function persistRegisterFromGoogle(email: string) {
  try {
    sessionStorage.setItem(
      REGISTER_FROM_GOOGLE_KEY,
      JSON.stringify({ message: GOOGLE_SIGNIN_NOT_REGISTERED_MSG, email }),
    );
  } catch {
    /* ignore */
  }
}

export function consumeRegisterFromGoogle(): { message: string; email: string } | null {
  try {
    const raw = sessionStorage.getItem(REGISTER_FROM_GOOGLE_KEY);
    sessionStorage.removeItem(REGISTER_FROM_GOOGLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { message?: string; email?: string };
    if (!parsed.email) return null;
    return {
      message: parsed.message ?? GOOGLE_SIGNIN_NOT_REGISTERED_MSG,
      email: parsed.email,
    };
  } catch {
    return null;
  }
}

export function markGoogleOAuthAttempt(mode: 'signin' | 'signup') {
  try {
    sessionStorage.setItem(GOOGLE_SIGNIN_ATTEMPT_KEY, '1');
    sessionStorage.setItem(GOOGLE_OAUTH_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** @deprecated Use markGoogleOAuthAttempt */
export function markGoogleSignInAttempt() {
  markGoogleOAuthAttempt('signin');
}

export function getGoogleOAuthMode(): 'signin' | 'signup' | null {
  try {
    const mode = sessionStorage.getItem(GOOGLE_OAUTH_MODE_KEY);
    return mode === 'signin' || mode === 'signup' ? mode : null;
  } catch {
    return null;
  }
}

export function clearGoogleSignInAttempt() {
  try {
    sessionStorage.removeItem(GOOGLE_SIGNIN_ATTEMPT_KEY);
    sessionStorage.removeItem(GOOGLE_OAUTH_MODE_KEY);
  } catch {
    /* ignore */
  }
}

export function wasGoogleSignInAttempt(): boolean {
  try {
    return sessionStorage.getItem(GOOGLE_SIGNIN_ATTEMPT_KEY) === '1';
  } catch {
    return false;
  }
}

type SignInOAuth = {
  firstFactorVerification?: { externalVerificationRedirectURL?: URL | null };
  create: (params: {
    strategy: 'oauth_google';
    redirectUrl: string;
    actionCompleteRedirectUrl?: string;
    oidcPrompt?: string;
  }) => Promise<unknown>;
  authenticateWithRedirect: (params: {
    strategy: 'oauth_google';
    redirectUrl: string;
    redirectUrlComplete: string;
    oidcPrompt?: string;
  }) => Promise<void>;
};

/** Start Google OAuth on sign-in (login page). */
export async function startGoogleOAuth(signIn: SignInOAuth, clerk: ClerkClient) {
  const { redirectUrl, redirectUrlComplete } = clerkOAuthUrls();

  await clearClerkSession(clerk);

  await signIn.create({
    strategy: 'oauth_google',
    redirectUrl,
    actionCompleteRedirectUrl: redirectUrlComplete,
    oidcPrompt: 'select_account',
  });

  const external = signIn.firstFactorVerification?.externalVerificationRedirectURL;
  if (external) {
    window.location.assign(external.href);
    return;
  }

  await signIn.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl,
    redirectUrlComplete,
    oidcPrompt: 'select_account',
  });
}

type SignUpOAuth = {
  authenticateWithRedirect: (params: {
    strategy: 'oauth_google';
    redirectUrl: string;
    redirectUrlComplete: string;
    oidcPrompt?: string;
  }) => Promise<void>;
};

/** Start Google OAuth on sign-up (register page). Uses /client/sign_ups, not sign_ins. */
export async function startGoogleOAuthSignUp(signUp: SignUpOAuth, clerk: ClerkClient) {
  const { redirectUrl, redirectUrlComplete } = clerkOAuthUrls();
  await clearClerkSession(clerk, { stayOnPage: true });
  await signUp.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl,
    redirectUrlComplete,
    oidcPrompt: 'select_account',
  });
}

export function isClerkCaptchaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as {
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  };
  const first = e.errors?.[0];
  const code = first?.code ?? '';
  return (
    code === 'captcha_invalid' ||
    code === 'captcha_missing_token' ||
    /failed security validation/i.test(first?.message ?? '') ||
    /failed security validation/i.test(first?.longMessage ?? '')
  );
}

export function clerkErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (!err || typeof err !== 'object') {
    return typeof err === 'string' ? err : fallback;
  }
  const e = err as {
    errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
    message?: string;
  };
  const first = e.errors?.[0];
  if (isClerkCaptchaError(err)) {
    return (
      'Complete the security check above (if shown), then try again. ' +
      'If no check appears, wait a moment and tap Verify email once more.'
    );
  }
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  if (typeof e.message === 'string') {
    if (/failed to fetch|network error|load failed/i.test(e.message)) {
      return 'Could not reach Clerk. Check your connection, disable ad blockers for this site, and try again.';
    }
    return e.message;
  }
  return fallback;
}

export function isClerkAlreadySignedInError(err: unknown): boolean {
  const msg = clerkErrorMessage(err, '').toLowerCase();
  const code =
    err && typeof err === 'object' && 'errors' in err
      ? ((err as { errors?: Array<{ code?: string }> }).errors?.[0]?.code ?? '').toLowerCase()
      : '';
  return (
    /already signed in/.test(msg) ||
    code === 'session_exists' ||
    code === 'identifier_already_signed_in'
  );
}

export function formatClerkSignUpBlockers(signUp: {
  missingFields?: string[];
  unverifiedFields?: string[];
} | null): string | null {
  const missing = signUp?.missingFields ?? [];
  if (missing.length) return `Complete required fields: ${missing.join(', ')}.`;
  const unverified = signUp?.unverifiedFields ?? [];
  if (unverified.length) return `Still unverified: ${unverified.join(', ')}.`;
  return null;
}
