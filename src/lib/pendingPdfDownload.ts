/** Default dashboard tab after login, upload, or legacy /dashboard/overview links. */
export const DEFAULT_DASHBOARD_PATH = '/dashboard/at-letter';

/** Post-login destination — onboarding unless caller passed an explicit return path. */
export function getPostLoginRedirect(explicitFrom?: string | null): string {
  const from = explicitFrom?.trim();
  if (!from) return '/onboarding';
  if (from === '/dashboard' || from === '/dashboard/' || from === '/dashboard/overview') {
    return DEFAULT_DASHBOARD_PATH;
  }
  return from;
}