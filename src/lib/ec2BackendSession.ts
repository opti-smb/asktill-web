const STORAGE_KEY = 'asktill:use-ec2-backend';
const TOKEN_KEY = 'asktill:ec2-access-token';

/** Same-origin EC2 APIs — used only after asktill.com login handoff (`ec2=1`). */
export const EC2_PUBLIC_URLS = {
  api: 'https://asktill.com',
  auth: 'https://asktill.com/svc/auth',
  register: 'https://asktill.com/svc/register',
  subscription: 'https://asktill.com/svc/subscription',
  agents: 'https://asktill.com/svc/agents',
  admin: 'https://asktill.com/admin',
  app: 'https://asktill-web.vercel.app',
} as const;

function handoffParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, '');
  const fromHash = new URLSearchParams(hash);
  const fromQuery = new URLSearchParams(window.location.search);
  for (const [key, value] of fromQuery.entries()) {
    if (!fromHash.has(key)) fromHash.set(key, value);
  }
  return fromHash;
}

/** Persist EC2 API pin from the one-time handoff hash before it is stripped. */
export function pinEc2BackendFromHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    if (handoffParams().get('ec2') === '1') {
      sessionStorage.setItem(STORAGE_KEY, '1');
    }
  } catch {
    /* ignore */
  }
}

export function isEc2BackendSession(): boolean {
  pinEc2BackendFromHandoff();
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistEc2AccessToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readEc2AccessToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearEc2BackendSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function handoffWantsPostLoginRouting(): boolean {
  return handoffParams().get('post_login') === '1';
}
