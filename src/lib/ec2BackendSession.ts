/** Kept for type compatibility. Vercel never calls asktill.com APIs. */
export const EC2_PUBLIC_URLS = {
  api: 'https://asktill.com',
  auth: 'https://asktill.com/svc/auth',
  register: 'https://asktill.com/svc/register',
  subscription: 'https://asktill.com/svc/subscription',
  agents: 'https://asktill.com/svc/agents',
  admin: 'https://asktill.com/admin',
  app: 'https://asktill-web.vercel.app',
} as const;

function dropEc2Pin(): void {
  try {
    sessionStorage.removeItem('asktill:use-ec2-backend');
    sessionStorage.removeItem('asktill:ec2-access-token');
  } catch {
    /* ignore */
  }
}

export function clearEc2BackendSession(): void {
  dropEc2Pin();
}

/** Vercel talks to Render only — never pin asktill.com APIs from a handoff hash. */
export function pinEc2BackendFromHandoff(): void {
  dropEc2Pin();
}

export function isEc2BackendSession(): boolean {
  dropEc2Pin();
  return false;
}

export function persistEc2AccessToken(_token: string): void {
  /* Vercel does not store EC2 JWTs. */
}

export function readEc2AccessToken(): string | null {
  return null;
}

export function handoffWantsPostLoginRouting(): boolean {
  return false;
}
