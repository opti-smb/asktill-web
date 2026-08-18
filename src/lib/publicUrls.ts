import { EC2_PUBLIC_URLS, isEc2BackendSession } from './ec2BackendSession';

/** Detect developer-machine hosts that must never be used in production browsers. */
export function isLocalHostUrl(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url.trim());
}

/** Known production service origins for asktill-web. */
export const PROD_URLS = {
  api: 'https://backend-service-9kqp.onrender.com',
  auth: 'https://authentication-service-s3tl.onrender.com',
  register: 'https://registration-service-o9ah.onrender.com',
  subscription: 'https://asktill-subscription.onrender.com',
  agents: 'https://asktill-agents.onrender.com',
  admin: 'https://asktill-admin-dashboard.vercel.app',
  app: 'https://asktill-web.vercel.app',
} as const;

export type PublicUrlKey = keyof typeof PROD_URLS;

/**
 * Resolve a public service URL for the browser.
 * Localhost defaults exist only in the DEV branch so production builds strip them.
 */
export function resolvePublicUrl(
  envValue: string | undefined,
  key: PublicUrlKey,
): string {
  const prodDefault = PROD_URLS[key];
  const raw = envValue?.trim();

  // asktill.com login handoff: parse/show on Vercel, persist on EC2.
  if (!import.meta.env.DEV && isEc2BackendSession()) {
    return EC2_PUBLIC_URLS[key].replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    const devDefaults: Record<PublicUrlKey, string> = {
      api: 'http://localhost:8000',
      auth: 'http://localhost:8002',
      register: 'http://localhost:8003',
      subscription: 'http://localhost:8005',
      agents: 'http://127.0.0.1:8001',
      admin: 'http://127.0.0.1:5174',
      app: 'http://localhost:5173',
    };
    return (raw || devDefaults[key]).replace(/\/$/, '');
  }

  if (!raw || isLocalHostUrl(raw)) {
    return prodDefault;
  }
  return raw.replace(/\/$/, '');
}
