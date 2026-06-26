/** App JWT lifetime — must match Authentication Service JWT_EXPIRE_SECONDS (5400s). */
export const SESSION_TTL_SECONDS = 90 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
export const SESSION_TTL_LABEL = '90 minutes';

/** Survives reload so ProtectedRoute never auto-redirects before the overlay renders. */
export const SESSION_EXPIRED_PERSIST_KEY = 'asktill:session-expired-ui';

export function isSessionExpiredPersisted(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_PERSIST_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSessionExpiredPersisted(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_PERSIST_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearSessionExpiredPersisted(): void {
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_PERSIST_KEY);
  } catch {
    /* ignore */
  }
}