export type ChargebackDispute = {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  reason?: string;
  created?: number;
  has_evidence?: boolean;
  card_brand?: string;
  fought?: boolean;
};

export type RangeKey = '6m' | 'ytd' | 'all';

export const RANGE_LABELS: Record<RangeKey, string> = {
  '6m': 'Last 6 months',
  ytd: 'Year to date',
  all: 'All time',
};

const WIN_FEE_CENTS = 20;

const ACTIVE = new Set(['needs_response', 'warning_needs_response']);
const REVIEW = new Set(['under_review', 'warning_under_review']);
const WON = new Set(['won']);
const LOST = new Set(['lost']);

const REASON_LABELS: Record<string, string> = {
  fraudulent: 'Fraud (card not present)',
  unrecognized: 'Unrecognized',
  duplicate: 'Duplicate charge',
  product_not_received: 'Product not received',
  product_unacceptable: 'Not as described',
  subscription_canceled: 'Subscription canceled',
  credit_not_processed: 'Credit not processed',
  customer_initiated: 'Customer initiated',
  general: 'General',
};

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  american_express: 'Amex',
  discover: 'Discover',
};

function cents(row: ChargebackDispute): number {
  return typeof row.amount === 'number' && Number.isFinite(row.amount) ? row.amount : 0;
}

function inRange(row: ChargebackDispute, range: RangeKey, now = new Date()): boolean {
  if (range === 'all' || typeof row.created !== 'number') {
    return range === 'all' ? true : typeof row.created === 'number';
  }
  const created = new Date(row.created * 1000);
  if (range === 'ytd') {
    return created.getFullYear() === now.getFullYear();
  }
  const start = new Date(now);
  start.setMonth(start.getMonth() - 6);
  return created >= start;
}

export function filterDisputes(
  rows: ChargebackDispute[],
  range: RangeKey,
  scope: 'all' | 'asktill',
): ChargebackDispute[] {
  const ranged = rows.filter((row) => inRange(row, range));
  if (scope === 'asktill') return ranged.filter((row) => row.fought === true);
  return ranged;
}

export function reasonLabel(reason?: string): string {
  const key = (reason || '').trim().toLowerCase();
  if (!key) return 'Unknown';
  return REASON_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function brandLabel(brand?: string): string {
  const key = (brand || '').trim().toLowerCase();
  if (!key) return 'Unknown';
  return BRAND_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function usdFromCents(amount: number, currency = 'usd'): string {
  const code = (currency || 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString('en-US')}`;
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short' });
}

export type DisputeOverview = {
  recoveredCents: number;
  wonCount: number;
  winFeesCents: number;
  netCents: number;
  feeMultiple: number | null;
  activeCount: number;
  activeCents: number;
  evidenceCount: number;
  evidenceCents: number;
  reviewCount: number;
  reviewCents: number;
  winRate: number | null;
  valueRecovery: number | null;
  createdCount: number;
  createdCents: number;
  byMonth: { m: string; n: number }[];
  winTrend: { m: string; win: number; rec: number }[];
  byReason: { name: string; n: number }[];
  byNetwork: { name: string; n: number }[];
};

function lastMonths(count: number, now: Date): Date[] {
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return months;
}

export function buildOverview(rows: ChargebackDispute[], now = new Date()): DisputeOverview {
  const won = rows.filter((r) => WON.has(r.status || ''));
  const lost = rows.filter((r) => LOST.has(r.status || ''));
  const closed = [...won, ...lost];
  const recoveredCents = won.reduce((sum, r) => sum + cents(r), 0);
  const lostCents = lost.reduce((sum, r) => sum + cents(r), 0);
  const winFeesCents = won.length * WIN_FEE_CENTS;
  const active = rows.filter((r) => ACTIVE.has(r.status || ''));
  const review = rows.filter((r) => REVIEW.has(r.status || ''));
  const evidence = rows.filter((r) => r.has_evidence === true);
  const closedCents = recoveredCents + lostCents;
  const months = lastMonths(6, now);

  const byMonth = months.map((d) => {
    const key = monthKey(d);
    return {
      m: monthLabel(d),
      n: rows.filter((r) => typeof r.created === 'number' && monthKey(new Date(r.created * 1000)) === key)
        .length,
    };
  });

  const winTrend = months.map((d) => {
    const key = monthKey(d);
    const inMonth = rows.filter(
      (r) => typeof r.created === 'number' && monthKey(new Date(r.created * 1000)) === key,
    );
    const w = inMonth.filter((r) => WON.has(r.status || ''));
    const l = inMonth.filter((r) => LOST.has(r.status || ''));
    const decided = w.length + l.length;
    const wCents = w.reduce((sum, r) => sum + cents(r), 0);
    const lCents = l.reduce((sum, r) => sum + cents(r), 0);
    const total = wCents + lCents;
    return {
      m: monthLabel(d),
      win: decided ? Math.round((w.length / decided) * 100) : 0,
      rec: total ? Math.round((wCents / total) * 100) : 0,
    };
  });

  const reasonCounts = new Map<string, number>();
  for (const row of rows) {
    const name = reasonLabel(row.reason);
    reasonCounts.set(name, (reasonCounts.get(name) || 0) + 1);
  }
  const byReason = [...reasonCounts.entries()]
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const brandCounts = new Map<string, number>();
  for (const row of rows) {
    const name = brandLabel(row.card_brand);
    brandCounts.set(name, (brandCounts.get(name) || 0) + 1);
  }
  const brandTotal = rows.length || 1;
  const byNetwork = [...brandCounts.entries()]
    .map(([name, n]) => ({ name, n: Math.round((n / brandTotal) * 100) }))
    .sort((a, b) => b.n - a.n);

  return {
    recoveredCents,
    wonCount: won.length,
    winFeesCents,
    netCents: Math.max(0, recoveredCents - winFeesCents),
    feeMultiple: winFeesCents > 0 ? recoveredCents / winFeesCents : null,
    activeCount: active.length,
    activeCents: active.reduce((sum, r) => sum + cents(r), 0),
    evidenceCount: evidence.length,
    evidenceCents: evidence.reduce((sum, r) => sum + cents(r), 0),
    reviewCount: review.length,
    reviewCents: review.reduce((sum, r) => sum + cents(r), 0),
    winRate: closed.length ? (won.length / closed.length) * 100 : null,
    valueRecovery: closedCents ? (recoveredCents / closedCents) * 100 : null,
    createdCount: rows.length,
    createdCents: rows.reduce((sum, r) => sum + cents(r), 0),
    byMonth,
    winTrend,
    byReason,
    byNetwork,
  };
}
