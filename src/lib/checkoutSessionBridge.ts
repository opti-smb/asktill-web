import { getToken, setToken } from './api';
import { isTokenExpired } from './jwt';

/** Survives Stripe full-page leave (memory JWT does not). Same tab only. */
const CHECKOUT_ACCESS_BRIDGE_KEY = 'asktill_checkout_access_bridge';

/** Call right before redirecting to Stripe Checkout. */
export function stashCheckoutAccessBridge(): void {
  const token = getToken()?.trim();
  if (!token || isTokenExpired(token)) return;
  try {
    sessionStorage.setItem(CHECKOUT_ACCESS_BRIDGE_KEY, token);
  } catch {
    /* private mode */
  }
}

/**
 * Restore access JWT after returning from Stripe.
 * Returns the restored token when one was applied.
 */
export function consumeCheckoutAccessBridge(): string | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_ACCESS_BRIDGE_KEY)?.trim() ?? '';
    sessionStorage.removeItem(CHECKOUT_ACCESS_BRIDGE_KEY);
    if (!raw || isTokenExpired(raw)) return null;
    setToken(raw);
    return raw;
  } catch {
    return null;
  }
}
