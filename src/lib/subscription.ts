/** Subscription tiers — must match identity.users.tier in the database. */

export const TIER_FREE = 'free' as const;
export const TIER_PAID = 'paid' as const;

export type SubscriptionTier = typeof TIER_FREE | typeof TIER_PAID;

const LEGACY_PAID = new Set(['paid', 'pro', 'premium', 'gold', 'subscriber']);

export function normalizeTier(raw: string | null | undefined): SubscriptionTier {
  const text = (raw ?? '').trim().toLowerCase();
  if (LEGACY_PAID.has(text)) return TIER_PAID;
  if (text === TIER_PAID) return TIER_PAID;
  return TIER_FREE;
}

export function isPaidTier(raw: string | null | undefined): boolean {
  return normalizeTier(raw) === TIER_PAID;
}

export function tierDisplayLabel(raw: string | null | undefined): string {
  return isPaidTier(raw) ? 'Paid' : 'Free';
}

/** Dashboard routes that will require paid — empty until product rules are defined. */
export const PAID_ONLY_DASHBOARD_PATHS: string[] = [];

export function isPaidOnlyPath(path: string): boolean {
  return PAID_ONLY_DASHBOARD_PATHS.some(
    (locked) => path === locked || path.startsWith(`${locked}/`),
  );
}
