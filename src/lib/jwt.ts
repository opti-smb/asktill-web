function decodeBase64Url(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/** Unix expiry from JWT `exp` claim, or null when missing or unreadable. */
export function getTokenExpiryMs(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewMs = 0): boolean {
  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return false;
  return Date.now() + skewMs >= expMs;
}
