import { fetchReportHistory } from './api';
import { resolveSafeAppPath } from './safeRedirect';

/** Default dashboard tab after login, upload, or legacy /dashboard/overview links.
 *  Business Brief is the first sidebar tab — always open here when entering the dashboard.
 */
export const DEFAULT_DASHBOARD_PATH = '/dashboard/at-letter';

/**
 * Existing users (saved statements) → Business Brief with their latest data.
 * First-time users (no statements) → upload/onboarding.
 * Explicit return paths (e.g. after session expiry) still win.
 */
export async function resolvePostLoginRedirect(
  explicitFrom?: string | null,
): Promise<string> {
  const from = (explicitFrom || '').trim();
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

  try {
    const { data } = await fetchReportHistory();
    if ((data.reports?.length ?? 0) > 0) {
      return DEFAULT_DASHBOARD_PATH;
    }
  } catch {
    /* history unavailable — send to upload */
  }
  return '/onboarding';
}

/** @deprecated Prefer resolvePostLoginRedirect — sync helper defaults to upload. */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  const from = (explicitFrom || '').trim();
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
  return '/onboarding';
}
