const SIGNED_OUT_KEY = 'asktill:signed-out';

function storageFlag(storage: Storage): boolean {
  try {
    return storage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

function persistFlag(on: boolean): void {
  try {
    if (on) {
      sessionStorage.setItem(SIGNED_OUT_KEY, '1');
      localStorage.setItem(SIGNED_OUT_KEY, '1');
    } else {
      sessionStorage.removeItem(SIGNED_OUT_KEY);
      localStorage.removeItem(SIGNED_OUT_KEY);
    }
  } catch {
    /* ignore */
  }
}

function urlHasSignedOut(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('signedOut') === '1' || params.get('signed_out') === '1';
}

function stripSignedOutFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('signedOut') !== '1' && params.get('signed_out') !== '1') return;
  params.delete('signedOut');
  params.delete('signed_out');
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', next);
}

/** True when the user signed out of the Vercel session and must not be auto-restored. */
export function hasSignedOutIntent(): boolean {
  if (typeof window === 'undefined') return false;
  return storageFlag(sessionStorage) || storageFlag(localStorage) || urlHasSignedOut();
}

/** Persist sign-out across the login-page load and strip it from the URL. */
export function captureSignedOutIntent(): boolean {
  if (typeof window === 'undefined') return false;
  const flagged = hasSignedOutIntent();
  if (flagged) {
    persistFlag(true);
    stripSignedOutFromUrl();
  }
  return flagged;
}

export function markSignedOutIntent(): void {
  persistFlag(true);
}

/** Call after a successful password / Clerk login on Vercel. */
export function clearSignedOutIntent(): void {
  persistFlag(false);
}

/** Capture before React/Clerk mount so leftover Google sessions cannot race logout. */
captureSignedOutIntent();
