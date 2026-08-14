import { resolveSafeAppPath } from './safeRedirect';

/** Default dashboard tab after login, upload, or legacy /dashboard/overview links.
 *  Business Brief is the first sidebar tab — always open here when entering the dashboard.
 */
export const DEFAULT_DASHBOARD_PATH = '/dashboard/at-letter';

/** Neutral hold while we learn whether this account has statements (upload vs dashboard). */
export const POST_LOGIN_HOLD_PATH = '/post-login';

const POST_LOGIN_ROUTE_KEY = 'asktill:post-login-route';

/** Mark that this navigation came from a fresh sign-in (for empty → upload redirect). */
export function markPostLoginRouting(): void {
  try {
    sessionStorage.setItem(POST_LOGIN_ROUTE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Whether post-login empty/history routing is still pending (does not clear). */
export function peekPostLoginRouting(): boolean {
  try {
    return sessionStorage.getItem(POST_LOGIN_ROUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** True once if this session still needs post-login empty/history routing. */
export function consumePostLoginRouting(): boolean {
  try {
    if (!sessionStorage.getItem(POST_LOGIN_ROUTE_KEY)) return false;
    sessionStorage.removeItem(POST_LOGIN_ROUTE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Immediate post-login path.
 * Hold on /post-login until report history loads, then:
 * - 0 statements → upload (no dashboard flash for new users)
 * - has statements → dashboard (no upload flash for existing users)
 * Explicit deep-links (e.g. /pricing) still win.
 */
export function resolvePostLoginRedirect(explicitFrom?: string | null): string {
  const from = (explicitFrom || '').trim();
  if (
    from &&
    from !== '/' &&
    from !== '/login' &&
    from !== '/register' &&
    from !== '/onboarding' &&
    from !== '/onboarding/' &&
    from !== POST_LOGIN_HOLD_PATH
  ) {
    return resolveSafeAppPath(from, DEFAULT_DASHBOARD_PATH);
  }
  return POST_LOGIN_HOLD_PATH;
}

/** @deprecated Use resolvePostLoginRedirect */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  return resolvePostLoginRedirect(explicitFrom);
}
