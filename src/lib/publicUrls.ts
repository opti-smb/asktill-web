/** Detect developer-machine hosts that must never be used in production browsers. */
export function isLocalHostUrl(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url.trim());
}

/**
 * EC2 / asktill.com fallbacks only.
 * Vercel keeps Render URLs in E:\asktill-web — do not copy these into that repo.
 */
export const PROD_URLS = {
  api: 'https://asktill.com',
  auth: 'https://asktill.com/svc/auth',
  register: 'https://asktill.com/svc/register',
  subscription: 'https://asktill.com/svc/subscription',
  agents: 'https://asktill.com/svc/agents',
  admin: 'https://asktill.com/admin',
  app: 'https://asktill.com',
} as const;

/** Vercel/Render Agents origin — iframe trust only, never used as the EC2 API base. */
export const RENDER_AGENTS_ORIGIN = 'https://asktill-agents.onrender.com';

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
