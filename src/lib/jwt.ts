function decodeBase64Url(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

function readPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    return JSON.parse(decodeBase64Url(payloadPart)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Unix expiry from JWT `exp` claim, or null when missing or unreadable. */
export function getTokenExpiryMs(token: string): number | null {
  const payload = readPayload(token);
  const exp = payload?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

/** `sub` claim (user id), or null when missing or unreadable. */
export function getTokenSubject(token: string): string | null {
  const sub = readPayload(token)?.sub;
  return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
}

export function isTokenExpired(token: string, skewMs = 0): boolean {
  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return false;
  return Date.now() + skewMs >= expMs;
}
