const SIGNED_OUT_KEY = 'asktill:signed-out';

/** True when the user just signed out and must not be restored from the refresh cookie. */
export function hasSignedOutIntent(): boolean {
  try {
    if (sessionStorage.getItem(SIGNED_OUT_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('signedOut') === '1' || params.get('signed_out') === '1';
}

/** Persist sign-out across the login-page load and strip it from the URL. */
export function captureSignedOutIntent(): boolean {
  if (typeof window === 'undefined') return false;
  let flagged = false;
  try {
    flagged = sessionStorage.getItem(SIGNED_OUT_KEY) === '1';
  } catch {
    /* ignore */
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get('signedOut') === '1' || params.get('signed_out') === '1') {
    flagged = true;
    try {
      sessionStorage.setItem(SIGNED_OUT_KEY, '1');
    } catch {
      /* ignore */
    }
    params.delete('signedOut');
    params.delete('signed_out');
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }
  return flagged;
}

export function markSignedOutIntent(): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Call after a successful password / Clerk login. */
export function clearSignedOutIntent(): void {
  try {
    sessionStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    /* ignore */
  }
}
