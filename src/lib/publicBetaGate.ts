import { resolvePublicUrl } from './publicUrls';

/**
 * Public beta gate for the EC2 custom domain only.
 * Localhost + Vercel hosts stay on normal login/register.
 */
export function isPublicBetaGateActive(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'asktill.com' || host === 'www.asktill.com';
}

export type BetaAccessPayload = {
  email: string;
  fullName: string;
  location: string;
  segment: string;
};

function agentsBaseUrl(): string {
  return resolvePublicUrl(
    import.meta.env.VITE_AGENTS_API_URL as string | undefined,
    'agents',
  );
}

/** Staff notify only — does not create accounts. Accounts go to EC2 register/auth. */
export async function submitBetaAccessRequest(
  payload: BetaAccessPayload,
): Promise<{ ok: true; message: string }> {
  const res = await fetch(`${agentsBaseUrl()}/api/support/beta-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  let data: { detail?: string | { msg?: string }[]; message?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const detail = data.detail;
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => (typeof d === 'string' ? d : d?.msg)).filter(Boolean).join(' ')
          : data.message || 'Could not send your request. Please try again.';
    throw new Error(msg);
  }
  return { ok: true, message: data.message || 'Thanks — we received your details.' };
}
