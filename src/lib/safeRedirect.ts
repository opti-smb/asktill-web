/** Safe in-app path for post-login / billing return navigation. */
export function resolveSafeAppPath(raw: string | null | undefined, fallback = '/onboarding'): string {
  const from = (raw || '').trim();
  if (!from.startsWith('/') || from.startsWith('//') || from.includes('://')) {
    return fallback;
  }
  if (from === '/dashboard' || from === '/dashboard/' || from === '/dashboard/overview') {
    return '/dashboard/at-letter';
  }
  return from;
}

/** Only allow known Stripe hosts for checkout / billing portal redirects. */
export function isAllowedStripeRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return (
      host === 'checkout.stripe.com' ||
      host === 'billing.stripe.com' ||
      host.endsWith('.stripe.com')
    );
  } catch {
    return false;
  }
}

export function assignStripeRedirect(url: string): void {
  if (!isAllowedStripeRedirect(url)) {
    throw new Error('Unexpected billing redirect. Please try again.');
  }
  window.location.assign(url);
}
