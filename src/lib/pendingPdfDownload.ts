import { resolveSafeAppPath } from './safeRedirect';

/** Default dashboard tab after login, upload, or legacy /dashboard/overview links.
 *  Business Brief is the first sidebar tab — always open here when entering the dashboard.
 */
export const DEFAULT_DASHBOARD_PATH = '/dashboard/at-letter';

/** Post-login destination — onboarding unless caller passed an explicit return path. */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  return resolveSafeAppPath(explicitFrom, '/onboarding');
}
