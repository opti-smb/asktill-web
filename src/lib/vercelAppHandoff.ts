import { getToken } from './api';
import { isPublicBetaGateActive } from './publicBetaGate';

/** Product UI (upload / parse / dashboard). Auth stays on asktill.com. */
export const VERCEL_APP_ORIGIN = 'https://asktill-web.vercel.app';

export function shouldHandoffToVercelApp(): boolean {
  return isPublicBetaGateActive();
}

/**
 * After EC2 login, open Vercel with the EC2 JWT.
 * Vercel then talks to asktill.com APIs so uploads land in the EC2 DB.
 * Returns true when the browser is leaving asktill.com.
 */
export function continueOnVercelApp(path = '/post-login', explicitToken?: string | null): boolean {
  if (!shouldHandoffToVercelApp()) return false;
  const token = (explicitToken ?? getToken())?.trim();
  if (!token) return false;
  const dest = `${VERCEL_APP_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  const hash = [
    `access_token=${encodeURIComponent(token)}`,
    'ec2=1',
    'post_login=1',
  ].join('&');
  window.location.assign(`${dest}#${hash}`);
  return true;
}
