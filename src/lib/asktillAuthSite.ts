/** Vercel login/logout stay on this origin. asktill.com is a separate auth site. */

export function asktillAuthUrl(path: '/login' | '/register' = '/login'): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export function asktillSignedOutLoginUrl(): string {
  if (typeof window === 'undefined') return '/login?signedOut=1';
  return `${window.location.origin}/login?signedOut=1`;
}

/** Same-origin Vercel auth only — never send the browser to asktill.com. */
export function sendToAsktillAuth(
  path: '/login' | '/register' = '/login',
  options?: { signedOut?: boolean },
): void {
  if (path === '/login' && options?.signedOut) {
    window.location.replace(asktillSignedOutLoginUrl());
    return;
  }
  window.location.replace(asktillAuthUrl(path));
}
