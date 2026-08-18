export const ASKTILL_AUTH_ORIGIN = 'https://asktill.com';

export function asktillAuthUrl(path: '/login' | '/register' = '/login'): string {
  return `${ASKTILL_AUTH_ORIGIN}${path}`;
}

export function asktillSignedOutLoginUrl(): string {
  return `${ASKTILL_AUTH_ORIGIN}/login?signedOut=1`;
}

/** Vercel is the statement app only. Login/register always happen on asktill.com. */
export function sendToAsktillAuth(path: '/login' | '/register' = '/login'): void {
  window.location.replace(asktillAuthUrl(path));
}
