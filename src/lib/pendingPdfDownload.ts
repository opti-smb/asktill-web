import { resolveSafeAppPath } from './safeRedirect';

/** Default dashboard tab after login, upload, or legacy /dashboard/overview links.
 *  Business Brief is the first sidebar tab — always open here when entering the dashboard.
 */
export const DEFAULT_DASHBOARD_PATH = '/dashboard/at-letter';

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
 * Immediate post-login path — never blocks on cold Render / report history.
 * Existing users land on Business Brief; first-time users are steered to upload
 * by PostLoginDestination once history reports zero statements.
 */
export function resolvePostLoginRedirect(explicitFrom?: string | null): string {
  const from = (explicitFrom || '').trim();
  if (
    from.startsWith('/dashboard/sources')
    || from.startsWith('/onboarding')
    || from.startsWith('/integrations/stripe')
    || from.startsWith('/integrations/shopify')
  ) {
    return DEFAULT_DASHBOARD_PATH;
  }
  if (
    from &&
    from !== '/' &&
    from !== '/login' &&
    from !== '/register' &&
    from !== '/onboarding' &&
    from !== '/onboarding/'
  ) {
    return resolveSafeAppPath(from, DEFAULT_DASHBOARD_PATH);
  }
  return DEFAULT_DASHBOARD_PATH;
}

/** @deprecated Use resolvePostLoginRedirect */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  return resolvePostLoginRedirect(explicitFrom);
}
